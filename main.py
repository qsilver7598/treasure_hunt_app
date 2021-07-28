from google.cloud import datastore
from flask import Flask, request, jsonify, _request_ctx_stack
import requests
import constants
import time

from functools import wraps
import json

from six.moves.urllib.request import urlopen
from flask_cors import cross_origin
from jose import jwt


import json
from os import environ as env
from werkzeug.exceptions import HTTPException

from dotenv import load_dotenv, find_dotenv
from flask import Flask
from flask import jsonify
from flask import redirect
from flask import render_template
from flask import session
from flask import url_for
from authlib.integrations.flask_client import OAuth
from six.moves.urllib.parse import urlencode


app = Flask(__name__)
app.secret_key = 'SECRET_KEY'

client = datastore.Client()

CLIENT_ID = 'rAdGsFUnrqSyrTzMSWtXye4OiZKfHknY'
CLIENT_SECRET = 'AQo1deJ9E4NLdZwkQHt44eclYvOERpxZeHgEl3bWd1zvLluFRbMYr7M-ccWJOJlp'
DOMAIN = '467-capstone.us.auth0.com'


# CALLBACK_URL = 'http://localhost:8080/callback'
# URL_USER = "http://localhost:8080/users"
# URL_HUNT = "http://localhost:8080/hunts"
# URL_CLUE = "http://localhost:8080/clues"
# URL_TREASURE = "http://localhost:8080/treasure"
CALLBACK_URL = 'https://cs467-capstone.uw.r.appspot.com/callback'
URL_USER = "https://cs467-capstone.uw.r.appspot.com/users"
URL_HUNT = "https://cs467-capstone.uw.r.appspot.com/hunts"
URL_CLUE = "https://cs467-capstone.uw.r.appspot.com/clues"
URL_TREASURE = "https://cs467-capstone.uw.r.appspot.com/treasure"

ALGORITHMS = ["RS256"]


oauth = OAuth(app)

auth0 = oauth.register(
    'auth0',
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    api_base_url="https://" + DOMAIN,
    access_token_url="https://" + DOMAIN + "/oauth/token",
    authorize_url="https://" + DOMAIN + "/authorize",
    client_kwargs={
        'scope': 'openid profile email',
    },
)


def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'profile' not in session:
            # Redirect to Login page here
            return redirect('/')
        return f(*args, **kwargs)

    return decorated


# This code is adapted from https://auth0.com/docs/quickstart/backend/python/01-authorization?_ga=2.46956069.349333901.1589042886-466012638.1589042885#create-the-jwt-validation-decorator

class AuthError(Exception):
    def __init__(self, error, status_code):
        self.error = error
        self.status_code = status_code


@app.errorhandler(AuthError)
def handle_auth_error(ex):
    response = jsonify(ex.error)
    response.status_code = ex.status_code
    return response
    
def verify_jwt(request):
    auth_header = request.headers['Authorization'].split()
    token = auth_header[1]
    
    jsonurl = urlopen("https://"+ DOMAIN+"/.well-known/jwks.json")
    jwks = json.loads(jsonurl.read())
    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.JWTError:
            return 401
    if unverified_header["alg"] == "HS256":
            return 401
    rsa_key = {}
    for key in jwks["keys"]:
        if key["kid"] == unverified_header["kid"]:
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"]
            }
    if rsa_key:
        try:
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=ALGORITHMS,
                audience=CLIENT_ID,
                issuer="https://"+ DOMAIN+"/"
            )
        except jwt.ExpiredSignatureError:
            return 401
        except jwt.JWTClaimsError:
            return 401
        except Exception:
            return 401

        return payload
    else:
            return 401


@app.route('/')
def index():
    return render_template("index.html")


@app.route('/play')
def play():
    return render_template("play.html")


@app.route('/hunts', methods=['POST','GET'])
def hunts_get_post():
    if request.method == 'POST':
        if 'Authorization' in request.headers:
            payload = verify_jwt(request)
            if payload == 401:
                error = {'Error': 'Missing or invalid JWTs'}
                return error, 401
            content = request.get_json()
            if len(content) != 4:
                error = {'Error': 'The request object is missing at least one of the required attributes'}
                return error, 405
            new_hunt = datastore.entity.Entity(key=client.key(constants.hunts))
            new_hunt.update({"name": content["name"], "theme": content["theme"],
                            "creator": payload["email"], "clues": [], "treasures": []})
            client.put(new_hunt)
            new_hunt["hunt id"] = new_hunt.key.id
            new_hunt["self"] = URL_HUNT + '/' + str(new_hunt.key.id)
            return json.dumps(new_hunt), 201
        else:
            error = {'Error': 'Missing or invalid JWTs'}
            return error, 401
    elif request.method == 'GET':
        if 'Authorization' in request.headers:
            payload = verify_jwt(request)
            if payload == 401:
                error = {'Error': 'Missing or invalid JWTs'}
                return error, 401
            query = client.query(kind=constants.hunts)
            query.add_filter("creator", "=", payload['email'])
            # get total number of hunts
            number_of_hunts = list(query.fetch())
            # set up pagination
            q_limit = int(request.args.get('limit', '5'))
            q_offset = int(request.args.get('offset', '0'))
            l_iterator = query.fetch(limit=q_limit, offset=q_offset)
            pages = l_iterator.pages
            results = list(next(pages))
            if l_iterator.next_page_token:
                next_offset = q_offset + q_limit
                next_url = request.base_url + "?limit=" + str(q_limit) + "&offset=" + str(next_offset)
            else:
                next_url = None
            for e in results:
                e["hunt id"] = e.key.id
                e["self"] = URL_HUNT + '/' + str(e.key.id)
            output = {"hunts": results}
            if next_url:
                output["next"] = next_url
            output["total hunts"] = len(number_of_hunts)
            return json.dumps(output), 200
        elif 'Authorization' not in request.headers:
            query = client.query(kind=constants.hunts)
            # get total number of hunts
            number_of_hunts = list(query.fetch())
            # set up pagination
            q_limit = int(request.args.get('limit', '5'))
            q_offset = int(request.args.get('offset', '0'))
            l_iterator = query.fetch(limit=q_limit, offset=q_offset)
            pages = l_iterator.pages
            results = list(next(pages))
            if l_iterator.next_page_token:
                next_offset = q_offset + q_limit
                next_url = request.base_url + "?limit=" + str(q_limit) + "&offset=" + str(next_offset)
            else:
                next_url = None
            for e in results:
                e["hunt id"] = e.key.id
                e["self"] = URL_HUNT + '/' + str(e.key.id)
            output = {"hunts": results}
            if next_url:
                output["next"] = next_url
            output["total hunts"] = len(number_of_hunts)
            return json.dumps(output), 200
        else:
            error = {'Error': 'Missing or invalid JWTs'}
            return error, 401
    else:
        return jsonify(error='Method not recognized')


@app.route('/hunts/<hunt_id>', methods=['PUT','DELETE','GET', 'PATCH'])
def hunts_put_delete(hunt_id):
    if request.method == 'PUT':
        if 'Authorization' in request.headers:
            payload = verify_jwt(request)
            if payload == 401:
                error = {'Error': 'Missing or invalid JWTs'}
                return error, 401
            content = request.get_json()
            if len(content) != 4:
                error = {'Error': 'The request object is missing at least one of the required attributes'}
                return error, 405
            hunt_key = client.key(constants.hunts, int(hunt_id))
            hunt = client.get(key=hunt_key)
            if hunt is None:
                error = {'Error': 'No hunt with this hunt ID exists'}
                return error, 406
            if hunt['creator'] == payload['email']:
                hunt.update({"name": content["name"], "theme": content["theme"],
                            "clues": [], "treasures": []})
                client.put(hunt)
            else:
                error = {'Error': 'Hunt is owned by someone else'}
                return error, 403
            hunt["hunt id"] = hunt.key.id
            hunt["self"] = URL_HUNT + '/' + str(hunt.key.id)
            return json.dumps(hunt), 200
        else:
            error = {'Error': 'Missing or invalid JWTs'}
            return error, 401
    elif request.method == 'DELETE':
        if 'Authorization' in request.headers:
            payload = verify_jwt(request)
            if payload == 401:
                error = {'Error': 'Missing or invalid JWTs'}
                return error, 401
            hunt_key = client.key(constants.hunts, int(hunt_id))
            hunt = client.get(key=hunt_key)
            if hunt is None:
                error = {'Error': 'No hunt with this hunt ID exists'}
                return error, 406
            if hunt['creator'] == payload['email']:
                client.delete(hunt_key)
            else:
                error = {'Error': 'Hunt is owned by someone else'}
                return error, 403
            # check for clues key in the hunt and delete the clues
            if 'clues' in hunt:
                clue_id = []
                for clues in hunt['clues']:
                    clue_id.append(clues['clue id'])
                for each in clue_id:
                    clue_key = client.key(constants.clues, int(each))
                    client.delete(clue_key)
            if 'treasures' in hunt:
                treasure_id = []
                for treasures in hunt['treasures']:
                    treasure_id.append(treasures['treasure id'])
                for each in treasure_id:
                    treasure_key = client.key(constants.treasures, int(each))
                    client.delete(treasure_key)
            success = {'Success': 'Successfully deleted hunt'}
            return success, 201
        else:
            error = {'Error': 'Missing or invalid JWTs'}
            return error, 401
    elif request.method == 'GET':
        hunt_key = client.key(constants.hunts, int(hunt_id))
        hunt = client.get(key=hunt_key)
        if hunt is None:
            error = {'Error': 'No hunt with this hunt ID exists'}
            return error, 406
        hunt["hunt id"] = hunt.key.id
        hunt["self"] = URL_HUNT + '/' + str(hunt.key.id)
        return json.dumps(hunt), 201
    elif request.method == 'PATCH':
        if 'Authorization' in request.headers:
            payload = verify_jwt(request)
            if payload == 401:
                error = {'Error': 'Missing or invalid JWTs'}
                return error, 401
            content = request.get_json()
            hunt_key = client.key(constants.hunts, int(hunt_id))
            hunt = client.get(key=hunt_key)
            if hunt is None:
                error = {'Error': 'No hunt with this hunt ID exists'}
                return error, 406
            if hunt['creator'] == payload['email']:
                if 'name' in content:
                    hunt['name'] = content['name']
                elif 'theme' in content:
                    hunt['theme'] = content['theme']
                client.put(hunt)
            else:
                error = {'Error': 'Hunt is owned by someone else'}
                return error, 403
            hunt["hunt id"] = hunt.key.id
            hunt["self"] = URL_HUNT + '/' + str(hunt.key.id)
            return json.dumps(hunt), 200
        else:
            error = {'Error': 'Missing or invalid JWTs'}
            return error, 401
    else:
        return jsonify(error='Method not recognized')


@app.route('/clues', methods=['POST', 'GET'])
def clues_get_post():
    if request.method == 'POST':
        content = request.get_json()
        if len(content) != 2:
            error = {'Error': 'The request object is missing at least one of the required attributes'}
            return error, 405
        new_clue = datastore.entity.Entity(key=client.key(constants.clues))
        new_clue.update({"gps coordinates": content["gps coordinates"], "description": content["description"]})
        client.put(new_clue)
        new_clue["clue id"] = new_clue.key.id
        new_clue["self"] = URL_CLUE + '/' + str(new_clue.key.id)
        return json.dumps(new_clue), 201
    elif request.method == 'GET':
        query = client.query(kind=constants.clues)
        # get total number of clues
        number_of_clues = list(query.fetch())
        # pagination set up
        q_limit = int(request.args.get('limit', '5'))
        q_offset = int(request.args.get('offset', '0'))
        l_iterator = query.fetch(limit=q_limit, offset=q_offset)
        pages = l_iterator.pages
        results = list(next(pages))
        if l_iterator.next_page_token:
            next_offset = q_offset + q_limit
            next_url = request.base_url + "?limit=" + str(q_limit) + "&offset=" + str(next_offset)
        else:
            next_url = None
        for e in results:
            e["clue id"] = e.key.id
            e["self"] = URL_CLUE + '/' + str(e.key.id)
        output = {"clues": results}
        if next_url:
            output["next"] = next_url
        output["total clues"] = len(number_of_clues)
        return json.dumps(output), 200
    else:
        return jsonify(error='Method not recognized')


@app.route('/clues/<clue_id>', methods=['PUT', 'DELETE', 'GET', 'PATCH'])
def clues_get_delete(clue_id):
    if request.method == 'PUT':
        content = request.get_json()
        if len(content) != 2:
            error = {'Error': 'The request object is missing at least one of the required attributes'}
            return error, 405
        clue_key = client.key(constants.clues, int(clue_id))
        clue = client.get(key=clue_key)
        if clue is None:
            error = {'Error': 'No clue with this clue ID exists'}
            return error, 406
        clue.update({"gps coordinates": content['gps coordinates'], "description": content['description']})
        client.put(clue)
        clue["clue id"] = clue.key.id
        clue["self"] = URL_CLUE + '/' + str(clue.key.id)
        return json.dumps(clue), 200
    elif request.method == 'DELETE':
        clue_key = client.key(constants.clues, int(clue_id))
        clue = client.get(key=clue_key)
        if clue is None:
            error = {'Error': 'No clue with this clue ID exists'}
            return error, 406
        client.delete(clue_key)
        if 'hunt' in clue:
            hunt_id = clue['hunt'][0]['hunt id']
            hunt_key = client.key(constants.hunts, int(hunt_id))
            hunt = client.get(key=hunt_key)
            hunt['clues'] = [i for i in hunt['clues'] if not (i['clue id'] == int(clue_id))]
            client.put(hunt)
        success = {'Success': 'Successfully deleted clue'}
        return success, 201
    elif request.method == 'GET':
        clue_key = client.key(constants.clues, int(clue_id))
        clue = client.get(key=clue_key)
        if clue is None:
            error = {'Error': 'No clue with this clue ID exists'}
            return error, 406
        clue["clue id"] = clue.key.id
        clue["self"] = URL_CLUE + '/' + str(clue.key.id)
        return json.dumps(clue), 201
    elif request.method == 'PATCH':
        content = request.get_json()
        clue_key = client.key(constants.clues, int(clue_id))
        clue = client.get(key=clue_key)
        if clue is None:
            error = {'Error': 'No clue with this clue ID exists'}
            return error, 406
        if 'gps coordinates' in content:
            clue['gps coordinates'] = content['gps coordinates']
        elif 'description' in content:
            clue['description'] = content['description']
        client.put(clue)
        clue["clue id"] = clue.key.id
        clue["self"] = URL_CLUE + '/' + str(clue.key.id)
        return json.dumps(clue), 200
    else:
        return jsonify(error='Method not recognized')


@app.route('/hunts/<hunt_id>/clues/<clue_id>', methods=['PUT', 'DELETE'])
def clues_put_delete(hunt_id, clue_id):
    if request.method == 'PUT':
        if 'Authorization' in request.headers:
            payload = verify_jwt(request)
            if payload == 401:
                error = {'Error': 'Missing or invalid JWTs'}
                return error, 401
            hunt_key = client.key(constants.hunts, int(hunt_id))
            hunt = client.get(key=hunt_key)
            if hunt is None:
                error = {'Error': 'The specified hunt and/or clue does not exist'}
                return error, 406
            number_of_clues = len(hunt['clues'])
            clue_key = client.key(constants.clues, int(clue_id))
            clue = client.get(key=clue_key)
            if clue is None:
                error = {'Error': 'The specified hunt and/or clue does not exist'}
                return error, 406
            if 'hunt' in clue:
                error = {'Error': 'The clue is already on a hunt'}
                return error, 403
            # info to be loaded onto the hunt/clue
            clue_info = {'clue id': clue.key.id, 'self': URL_CLUE + '/' + str(clue.key.id), 'order': number_of_clues + 1}
            hunt_info = {'hunt id': hunt.key.id, 'name': hunt['name'], 'self': URL_HUNT + '/' + str(hunt.key.id)}
            if hunt['creator'] == payload['email']:
                # attach clue to hunt
                hunt['clues'].append(clue_info)
                client.put(hunt)
                # attach hunt to clue
                if 'hunt' in clue:
                    clue['hunt'].append(hunt_info)
                else:
                    clue['hunt'] = [hunt_info]
                client.put(clue)
                success = {'Success': 'Successfully added clue to hunt'}
                return success, 204
            else:
                error = {'Error': 'Hunt is owned by someone else'}
                return error, 403
        else:
            error = {'Error': 'Missing or invalid JWTs'}
            return error, 401
    elif request.method == "DELETE":
        if 'Authorization' in request.headers:
            payload = verify_jwt(request)
            if payload == 401:
                error = {'Error': 'Missing or invalid JWTs'}
                return error, 401
            hunt_key = client.key(constants.hunts, int(hunt_id))
            hunt = client.get(key=hunt_key)
            if hunt is None:
                error = {'Error': 'The specified hunt and/or clue does not exist'}
                return error, 406
            clue_key = client.key(constants.clues, int(clue_id))
            clue = client.get(key=clue_key)
            if clue is None:
                error = {'Error': 'The specified hunt and/or clue does not exist'}
                return error, 406
            # checks for the hunt id on the clue
            if 'hunt' in clue:
                if clue['hunt'][0]['hunt id'] != int(hunt_id):
                    error = {'Error': 'This clue with this clue ID is not on this hunt with this hunt ID'}
                    return error, 406
            elif 'hunt' not in clue:
                error = {'Error': 'This clue with this clue ID is not on this hunt with this hunt ID'}
                return error, 406
            if hunt['creator'] == payload['email']:
                hunt['clues'] = [i for i in hunt['clues'] if not (i['clue id'] == int(clue_id))]
                client.put(hunt)
                del clue['hunt']
                client.put(clue)
                success = {'Success': 'Successfully removed the clue from the hunt'}
                return success, 204
            else:
                error = {'Error': 'Hunt is owned by someone else'}
                return error, 403
    else:
        return jsonify(error='Method not recognized')


@app.route('/treasures', methods=['POST', 'GET'])
def treasures_get_post():
    if request.method == 'POST':
        content = request.get_json()
        if len(content) != 2:
            error = {'Error': 'The request object is missing at least one of the required attributes'}
            return error, 405
        new_treasure = datastore.entity.Entity(key=client.key(constants.treasures))
        new_treasure.update({"gps coordinates": content["gps coordinates"], "description": content["description"]})
        client.put(new_treasure)
        new_treasure["treasure id"] = new_treasure.key.id
        new_treasure["self"] = URL_TREASURE + '/' + str(new_treasure.key.id)
        return json.dumps(new_treasure), 201
    elif request.method == 'GET':
        query = client.query(kind=constants.treasures)
        # get total number of treasures
        number_of_treasures = list(query.fetch())
        # pagination set up
        q_limit = int(request.args.get('limit', '5'))
        q_offset = int(request.args.get('offset', '0'))
        l_iterator = query.fetch(limit=q_limit, offset=q_offset)
        pages = l_iterator.pages
        results = list(next(pages))
        if l_iterator.next_page_token:
            next_offset = q_offset + q_limit
            next_url = request.base_url + "?limit=" + str(q_limit) + "&offset=" + str(next_offset)
        else:
            next_url = None
        for e in results:
            e["treasure id"] = e.key.id
            e["self"] = URL_TREASURE + '/' + str(e.key.id)
        output = {"treasures": results}
        if next_url:
            output["next"] = next_url
        output["total treasures"] = len(number_of_treasures)
        return json.dumps(output), 200
    else:
        return jsonify(error='Method not recognized')


@app.route('/treasures/<treasure_id>', methods=['PUT', 'DELETE', 'GET', 'PATCH'])
def treasures_get_delete(treasure_id):
    if request.method == 'PUT':
        content = request.get_json()
        if len(content) != 2:
            error = {'Error': 'The request object is missing at least one of the required attributes'}
            return error, 405
        treasure_key = client.key(constants.treasures, int(treasure_id))
        treasure = client.get(key=treasure_key)
        if treasure is None:
            error = {'Error': 'No treasure with this treasure ID exists'}
            return error, 406
        treasure.update({"gps coordinates": content['gps coordinates'], "description": content['description']})
        client.put(treasure)
        treasure["treasure id"] = treasure.key.id
        treasure["self"] = URL_TREASURE + '/' + str(treasure.key.id)
        return json.dumps(treasure), 200
    elif request.method == 'DELETE':
        treasure_key = client.key(constants.treasures, int(treasure_id))
        treasure = client.get(key=treasure_key)
        if treasure is None:
            error = {'Error': 'No treasure with this treasure ID exists'}
            return error, 406
        client.delete(treasure_key)
        if 'hunt' in treasure:
            hunt_id = treasure['hunt'][0]['hunt id']
            hunt_key = client.key(constants.hunts, int(hunt_id))
            hunt = client.get(key=hunt_key)
            hunt['treasures'] = [i for i in hunt['treasures'] if not (i['treasure id'] == int(treasure_id))]
            client.put(hunt)
        success = {'Success': 'Successfully deleted treasure'}
        return success, 201
    elif request.method == 'GET':
        treasure_key = client.key(constants.treasures, int(treasure_id))
        treasure = client.get(key=treasure_key)
        if treasure is None:
            error = {'Error': 'No treasure with this treasure ID exists'}
            return error, 406
        treasure["treasure id"] = treasure.key.id
        treasure["self"] = URL_TREASURE + '/' + str(treasure.key.id)
        return json.dumps(treasure), 201
    elif request.method == 'PATCH':
        content = request.get_json()
        treasure_key = client.key(constants.treasures, int(treasure_id))
        treasure = client.get(key=treasure_key)
        if treasure is None:
            error = {'Error': 'No treasure with this treasure ID exists'}
            return error, 406
        if 'gps coordinates' in content:
            treasure['gps coordinates'] = content['gps coordinates']
        elif 'description' in content:
            treasure['description'] = content['description']
        client.put(treasure)
        treasure["treasure id"] = treasure.key.id
        treasure["self"] = URL_TREASURE + '/' + str(treasure.key.id)
        return json.dumps(treasure), 200
    else:
        return jsonify(error='Method not recognized')


@app.route('/hunts/<hunt_id>/treasures/<treasure_id>', methods=['PUT', 'DELETE'])
def treasures_put_delete(hunt_id, treasure_id):
    if request.method == 'PUT':
        if 'Authorization' in request.headers:
            payload = verify_jwt(request)
            if payload == 401:
                error = {'Error': 'Missing or invalid JWTs'}
                return error, 401
            hunt_key = client.key(constants.hunts, int(hunt_id))
            hunt = client.get(key=hunt_key)
            if hunt is None:
                error = {'Error': 'The specified hunt and/or treasure does not exist'}
                return error, 406
            number_of_treasures = len(hunt['treasures'])
            treasure_key = client.key(constants.treasures, int(treasure_id))
            treasure = client.get(key=treasure_key)
            if treasure is None:
                error = {'Error': 'The specified hunt and/or treasure does not exist'}
                return error, 406
            if 'hunt' in treasure:
                error = {'Error': 'The treasure is already on a hunt'}
                return error, 403
            # info to be loaded onto the hunt/treasure
            treasure_info = {'treasure id': treasure.key.id, 'self': URL_TREASURE + '/' + str(treasure.key.id), 'order': number_of_treasures + 1}
            hunt_info = {'hunt id': hunt.key.id, 'name': hunt['name'], 'self': URL_HUNT + '/' + str(hunt.key.id)}
            if hunt['creator'] == payload['email']:
                # attach treasure to hunt
                hunt['treasures'].append(treasure_info)
                client.put(hunt)
                # attach hunt to treasure
                if 'hunt' in treasure:
                    treasure['hunt'].append(hunt_info)
                else:
                    treasure['hunt'] = [hunt_info]
                client.put(treasure)
                success = {'Success': 'Successfully added treasure to hunt'}
                return success, 204
            else:
                error = {'Error': 'Hunt is owned by someone else'}
                return error, 403
    elif request.method == "DELETE":
        if 'Authorization' in request.headers:
            payload = verify_jwt(request)
            if payload == 401:
                error = {'Error': 'Missing or invalid JWTs'}
                return error, 401
            hunt_key = client.key(constants.hunts, int(hunt_id))
            hunt = client.get(key=hunt_key)
            if hunt is None:
                error = {'Error': 'The specified hunt and/or treasure does not exist'}
                return error, 406
            treasure_key = client.key(constants.treasures, int(treasure_id))
            treasure = client.get(key=treasure_key)
            if treasure is None:
                error = {'Error': 'The specified hunt and/or treasure does not exist'}
                return error, 406
            # checks for the hunt id on the treasure
            if 'hunt' in treasure:
                if treasure['hunt'][0]['hunt id'] != int(hunt_id):
                    error = {'Error': 'This treasure with this treasure ID is not on this hunt with this hunt ID'}
                    return error, 406
            elif 'hunt' not in treasure:
                error = {'Error': 'This treasure with this treasure ID is not on this hunt with this hunt ID'}
                return error, 406
            if hunt['creator'] == payload['email']:
                hunt['treasures'] = [i for i in hunt['treasures'] if not (i['treasure id'] == int(treasure_id))]
                client.put(hunt)
                del treasure['hunt']
                client.put(treasure)
                success = {'Success': 'Successfully removed the treasure from the hunt'}
                return success, 204
            else:
                error = {'Error': 'Hunt is owned by someone else'}
                return error, 403
    else:
        return jsonify(error='Method not recognized')


@app.route('/users', methods=['GET'])
def users_get():
    if request.method == 'GET':
        query = client.query(kind=constants.users)
        results = list(query.fetch())
        for e in results:
            e['user id'] = e.key.id
            e['self'] = URL_USER + '/' + str(e.key.id)
        return json.dumps(results), 200
    else:
        return jsonify(error='Method not recognized')


@app.route('/users/<user_id>/', methods=['GET'])
def owner_get(user_id):
    if request.method == 'GET':
        user_key = client.key(constants.users, int(user_id))
        user = client.get(key=user_key)
        if user is None:
            error = {'Error': 'No user with this user ID exists'}
            return error, 406
        user['user id'] = user.key.id
        user['self'] = URL_USER + '/' + str(user.key.id)
        return json.dumps(user), 201
    else:
        return jsonify(error='Method not recognized')
    

@app.route('/login', methods=['POST'])
def login_user():
    content = request.get_json()
    username = content["username"]
    password = content["password"]
    body = {'grant_type':'password','username':username,
            'password':password,
            'client_id':CLIENT_ID,
            'client_secret':CLIENT_SECRET
           }
    headers = { 'content-type': 'application/json' }
    url = 'https://' + DOMAIN + '/oauth/token'
    r = requests.post(url, json=body, headers=headers)
    return r.text, 200, {'Content-Type':'application/json'}


@app.route('/callback')
def callback_handling():
    # Handles response from token endpoint
    token = auth0.authorize_access_token()['id_token']
    resp = auth0.get('userinfo')
    userinfo = resp.json()

    # Store the user information in flask session.
    session['jwt_payload'] = userinfo
    session['profile'] = {
        'owner id': userinfo['sub'],
        'email': userinfo['email'],
        'picture': userinfo['picture']
    }
    session['token'] = token

    # enter user into datastore database if not already entered
    query = client.query(kind=constants.users)
    query.add_filter("owner id", "=", userinfo['sub'])
    results = list(query.fetch())
    if not results:
        new_user = datastore.entity.Entity(key=client.key(constants.users))
        new_user.update({"email": userinfo['email'], "owner id": userinfo['sub']})
        client.put(new_user)
        session['profile']['user id'] = new_user.key.id
    else:
        for e in results:
            session['profile']['user id'] = e.key.id
    return redirect('/profile')


@app.route('/ui_login')
def ui_login():
    return auth0.authorize_redirect(redirect_uri=CALLBACK_URL)


@app.route('/ui_signup')
def ui_signup():
    return auth0.authorize_redirect(redirect_uri=CALLBACK_URL, screen_hint='signup')


@app.route('/profile')
@requires_auth
def dashboard():
    return render_template('profile.html',
                           userinfo=session['profile'],
                           id_token=session['token'])


@app.route('/logout')  
def logout():
    # Clear session stored data
    session.clear()
    # Redirect user to logout endpoint
    params = {'returnTo': url_for('index', _external=True), 'client_id': CLIENT_ID}
    return redirect(auth0.api_base_url + '/v2/logout?' + urlencode(params))


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080, debug=True)