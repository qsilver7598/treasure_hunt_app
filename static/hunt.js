/*
* This section regards rendering a map and current location with google maps API
*/

let map, infoWindow;

var huntIDArray = [];
var huntNameArray = [];
var currHuntID = 0;//updated at getSelectedHunt()
var clueIDArray = [];
var clueDescriptionArray = [];
var clueCoordsArray = [];
var currClueDescription = "cats are cool";
var currClueCoords;
var listener_id, target, options;

// const Url='http://localhost:8080';
const Url='https://cs467-capstone.uw.r.appspot.com';

console.log("Test::: 9")

// jQuery functions for interaction with the database
// CREATE HUNT
$(document).ready(function(){

  // Get request to retrieve hunts in database
  $('#b2').click(function(){
    $.ajax({
      url: Url + '/hunts',
      type: 'GET',
      success: function(response){
        huntRadioIndex = 0;
        var returnedData = JSON.parse(response);
        createHuntList(returnedData['hunts']);
        if ('next' in returnedData){
          $('<button/>', {
            type: 'button',
            "class": 'button alt-gradient-button',
            id: 'next-list',
            onclick: 'getNextPage(this.id)',
            text: 'More Hunts'
          }).appendTo('#find-hunt-radio-box');
          nextList = returnedData['next'];
        }
        storeHuntIDs(returnedData['hunts']);//store hunt name and ID in global arrays
      },
      error: function(){
        alert('There was an error with b2 button get request')
        window.location.href = '/'
      }
    })
  })

  $('#createHunt').click(function(){
    $('#createHunt').prop('disabled', true);
    var hunt = getHuntInfo();
    if (hunt == 'error'){
      alert('One or more of the fields are empty. Please try again.');
    }
    else if (hunt == 'no clues'){
      alert('Please enter 1 or more clues')
    }
    else{
      $.ajax({
        url: Url + '/hunts',
        type: 'POST',
        data: hunt,
        contentType: 'application/json',
        dataType: 'json',
        headers: {
          Authorization: 'Bearer ' + token
        },
        success: function(response){
          alert(response['name'] + ' was created successfully.') // create a popup window if time
          newHuntId = response['hunt id'];
          $('#hunt-title').prop('readonly', true);
          $('#hunt-theme').prop('readonly', true);
          $('#clue-number').prop('readonly', true);
          createClues();
        },
        error: function(){
          alert('There was an error with your request. #1')  
          $('#createHunt').prop('disabled', false);
        }
      })
    }
  })

  //create clues and attach them to the hunt
  $('#submit-clues').click(function(){
    $('#submit-clues').prop('disabled', true);
    // check all of the fields and make sure they are not empty
    var emptyFieldCheck = false;
    for (let i = 1; i <= numberOfClues; i++){
      var clue = getClueInfo("#clueInfo" + i, "#clue" + i + "-loc");
      if (clue == 'error'){
        emptyFieldCheck = true;
      }
    }
    // if any field is empty an alert will be triggered
    // if all fields are filled out then the clues will be created in the database
    if (emptyFieldCheck == true){
      alert('One or more of the clue fields are empty. Please try again.');
      $('#submit-clues').prop('disabled', false);
    }
    // create all of the clues in the database before attaching to the hunt
    else{
      var requests = Array();
      var clueIds = Array();
      for (let i = 1; i <= numberOfClues; i++){
        var clue = getClueInfo("#clueInfo" + i, "#clue" + i + "-loc");
        requests.push($.ajax({
          url: Url + '/clues',
          type: 'POST',
          data: clue,
          contentType: 'application/json',
          dataType: 'json'
        })
        )
      }
      var defer = $.when.apply($, requests);
      defer.done(function(){
        $.each(arguments, function(index, responseData){
          if (numberOfClues > 1){
            clueIds.push(responseData[0]['clue id']);
          }
          else{
            if (index == 0){
              clueIds.push(responseData['clue id']);
            }
          }
        })
        attachCluesToHunt(clueIds);
      })
    }
  })

  //create treasure and attach it to the hunt
  $('#submit-treasure').click(function(){
    $('#submit-treasure').prop('disabled', true);
    // check all of the fields and make sure they are not empty
    var treasure = getTreasureInfo();
    if (treasure == 'error'){
      alert('One or more of the fields are empty. Please try again.');
      $('#submit-treasure').prop('disabled', false);
    }
    else{
      $.ajax({
        url: Url + '/treasures',
        type: 'POST',
        data: treasure,
        contentType: 'application/json',
        dataType: 'json',
        headers: {
          Authorization: 'Bearer ' + token
        },
        success: function(response){
          newTreasureId = response['treasure id'];
          // after treasure is created, attach to the hunt
          $.ajax({
            url: Url + '/hunts/' + newHuntId + '/treasures/' + newTreasureId,
            type: 'PUT',
            headers: {
              Authorization: 'Bearer ' + token
            },
            success: function(response){
              alert('treasure added to hunt')
              confirmHunt();
            },
            error: function(){
              alert('There was an error with your request. #3')
              $('#submit-treasure').prop('disabled', false);
            }
          })
        },
        error: function(){
          alert('There was an error with your request. #4')
          $('#submit-treasure').prop('disabled', false);
        }
      })
    }
  })

  /////GAME PLAY REQS/////
  // Get request to retrieve hunt in database
  $('#play').click(function(){
    var huntID = getSelectedHunt();
    $.ajax({
      url: Url + '/hunts/' + huntID,
      type: 'GET',
      success: function(response){
        var returnedData = JSON.parse(response);
        storeClueIDs(returnedData['clues']);
      },
      error: function(){
        alert('There was an error with play button get request')
        //window.location.href = '/'
      }
    })
  })

  $('#show-first-clue').click(function(){
    $.ajax({
      url: Url + '/clues/' + clueIDArray[0], //grab first clue in array
      type: 'GET',
      success: function(response){
        var returnedData = JSON.parse(response);
        currClueDescription = returnedData['description'];
        currClueCoords = JSON.parse(returnedData['gps coordinates']);
        //push curr coords and description
        clueDescriptionArray.push(currClueDescription);
        clueCoordsArray.push(currClueCoords);

        //reveal first clue on map at initialized location
        showClue1(currClueDescription);
        $('#clue-distance-button').show();
      },
      error: function(){
        alert('There was an error with show clue button get request')
        //window.location.href = '/'
      }
    })
  })

  $('#edit-hunt-choose').click(function(){
    var huntId = getSelectedHunt();
    $.ajax({
      url: Url + '/hunts/' + huntId,
      type: 'GET',
      success: function(response){
        var returnedData = JSON.parse(response);
        editPage(returnedData);
      },
      error: function(){
        alert('There was an error with edit request')
        window.location.href = '/'
      }
    })
  })
})

//get hunt id from radio button
//https://www.geeksforgeeks.org/how-to-get-value-of-selected-radio-button-using-javascript/
function getSelectedHunt(){
  var huntList = document.getElementsByName('huntRadio');
  var selectedHuntIDX, selectedHuntName;
  
  for(i = 0; i < huntList.length; i++) {
        if(huntList[i].checked)
        selectedHuntIDX = huntList[i].id;// get id of attribute
        currHuntID = huntIDArray[selectedHuntIDX];
  }
  return huntIDArray[selectedHuntIDX]; //returns the hunt id stored at the idx of checked radio btn
}

//getting info from name theme only
function getHuntInfo(){
  var hunt = {
    name: $("#hunt-title").val(),
    theme: $("#hunt-theme").val(),
    clues: [],
    treasures: []
  }
  numberOfClues = $("#clue-number").val();
  if (numberOfClues < 1){
    return 'no clues'
  }
  if (hunt['name'] == '' || hunt['theme'] == '' || numberOfClues == ''){
    return 'error';
  }
  return JSON.stringify(hunt);
}

//getting clues one at a time
function getClueInfo(desc, loc){
  var clue = {
    'description': $(desc).val(),
    'gps coordinates': $(loc).val()    
  }
  if (clue['description'] == '' || clue['gps coordinates'] == ''){
    return 'error';
  }
  return JSON.stringify(clue);
}

// attach clues to hunt
function attachCluesToHunt(clueIds){
  for (var i = 0; i < clueIds.length; i++){
    $.ajax({
      url: Url + '/hunts/' + newHuntId + '/clues/' + clueIds[i],
      type: 'PUT',
      headers: {
        Authorization: 'Bearer ' + token
      },
      async: false,
      success: function(response){
        alert('clue added to hunt')
        createTreasure();
      },
      error: function(){
        alert('There was an error with your request. #1')
        window.location.href = '/'
      }
    })
  }
}

//getting treasure info
function getTreasureInfo(){
  var treasure = {
    'description': $("#treasure").val(),
    'gps coordinates': $("#treasure1-loc").val() 
  }
  if (treasure['description'] == '' || treasure['gps coordinates'] == ''){
    return 'error';
  }
  return JSON.stringify(treasure);
}

// confirm the hunt is correct by the user
function confirmHunt(){
  $('#c2').hide();
  $('#c2-2').hide();
  $('#c2-3').hide();
  $('#c4').show();
  $.ajax({
    url: Url + '/hunts/' + newHuntId,
    type: 'GET',
    success: function(response){
      var returnedData = JSON.parse(response);
      $('<label></label', {
        text: returnedData['hunt id'],
        css: {
          'display': 'none'
        },
        id: 'hunt-label-id'
      }).appendTo('#hunt-info');

      $('<label></label', {
        text: 'Name: '
      }).appendTo('#hunt-info');
      $('<label></label', {
        text: returnedData['name']
      }).appendTo('#hunt-info').after('<br/>', '<br/>');

      $('<label></label', {
        text: 'Theme: '
      }).appendTo('#hunt-info');
      $('<label></label', {
        text: returnedData['theme']
      }).appendTo('#hunt-info').after('<br/>', '<br/>');

      $.each(returnedData['clues'], function(key, val){
        $('<label></label', {
          text: 'Clue ' + (key + 1) + ' Location: '
        }).appendTo('#hunt-info');
        $('<button/>', {
          type: 'button',
          "class": 'button alt-gradient-button',
          id: val['clue id'],
          onclick: 'showClueLocation(this.id)',
          text: 'map'
        }).appendTo('#hunt-info').after('<br/>', '<br/>');
      })

        $.each(returnedData['treasures'], function(key, val){
          $('<label></label', {
            text: 'Treasure Location: '
          }).appendTo('#hunt-info');
          $('<button/>', {
            type: 'button',
            "class": 'button alt-gradient-button',
            id: val['treasure id'],
            onclick: 'showTreasureLocation(this.id)',
            text: 'map'
          }).appendTo('#hunt-info').after('<br/>', '<br/>');
      })
    }
  })
}

//FIND HUNT BUTTON
function createHuntList(hunts){
  $.each(hunts, function(key, val){
    var radioBtn = $('<input type="radio" name="huntRadio" id=' + huntRadioIndex + ' />');
    var label = $('<label id=huntName>' + val['name'] + ' (' + val['theme'] + ')' + '</label>' + '<br><br>');
    radioBtn.appendTo('#find-hunt-radio-box');
    label.appendTo('#find-hunt-radio-box');
    huntRadioIndex++;
  })
}

// get next page in hunt list
function getNextPage(clickedId){
  $('#' + clickedId).remove();
  $.ajax({
    url: nextList,
    type: 'GET',
    success: function(response){
      var returnedData = JSON.parse(response);
      createHuntList(returnedData['hunts']);
      if ('next' in returnedData){
        $('<button/>', {
          type: 'button',
          "class": 'button alt-gradient-button',
          id: 'next-list',
          onclick: 'getNextPage(this.id)',
          text: 'More Hunts'
        }).appendTo('#find-hunt-radio-box');
        nextList = returnedData['next'];
      }
      storeHuntIDs(returnedData['hunts']);//store hunt name and ID in global arrays
    },
    error: function(){
      alert('There was an error with getting next hunts request')
      window.location.href = '/'
    }
  })
}

// edit the selected hunt page
function editPage(hunt){
  $('#c3').hide();
  $('#c5').show();
  $('<label></label', {
    text: hunt['hunt id'],
    css: {
      'display': 'none'
    },
    id: 'hunt-label-id'
  }).appendTo('#hunt-edit-info');

  $('<label></label', {
    text: 'Creator: '
  }).appendTo('#hunt-edit-info');
  $('<label></label', {
    text: hunt['creator']
  }).appendTo('#hunt-edit-info').after('<br/>', '<br/>');

  $('<label></label', {
    text: 'Name: '
  }).appendTo('#hunt-edit-info');
  $('<input/>', {
    type: 'text',
    id: 'edit-name',
    css: {
      'margin-right': '5px'
    },
    prop: {
      'readonly': 'true'
    },
    value: hunt['name']
  }).appendTo('#hunt-edit-info');
  $('<button/>', {
    type: 'button',
    "class": 'button primary edit',
    id: 'edit-name-button',
    onclick: 'editInput(this.id)',
    text: 'edit'
  }).appendTo('#hunt-edit-info').after('<br/>', '<br/>');

  $('<label></label', {
    text: 'Theme: '
  }).appendTo('#hunt-edit-info');
  $('<input/>', {
    type: 'text',
    id: 'edit-theme',
    css: {
      'margin-right': '5px'
    },
    prop: {
      'readonly': 'true'
    },
    value: hunt['theme']
  }).appendTo('#hunt-edit-info');
  $('<button/>', {
    type: 'button',
    "class": 'button primary edit',
    id: 'edit-theme-button',
    onclick: 'editInput(this.id)',
    text: 'edit'
  }).appendTo('#hunt-edit-info').after('<br/>', '<br/>');

  $.each(hunt['clues'], function(key, val){
    $('<label></label', {
      text: 'Clue ' + (key + 1) + ' Location: '
    }).appendTo('#hunt-edit-info');
    $('<button/>', {
      type: 'button',
      "class": 'button alt-gradient-button',
      id: val['clue id'],
      onclick: 'showClueLocation(this.id)',
      text: 'map'
    }).appendTo('#hunt-edit-info').after('<br/>', '<br/>');
  })

    $.each(hunt['treasures'], function(key, val){
      $('<label></label', {
        text: 'Treasure Location: '
      }).appendTo('#hunt-edit-info');
      $('<button/>', {
        type: 'button',
        "class": 'button alt-gradient-button',
        id: val['treasure id'],
        onclick: 'showTreasureLocation(this.id)',
        text: 'map'
      }).appendTo('#hunt-edit-info').after('<br/>', '<br/>');
  })
}

// allows editing of input
function editInput(clickedId){
  var inputId = clickedId.replace('-button', '');
  $('#' + inputId).prop('readonly', false);
  $('<button/>', {
    type: 'button',
    "class": 'button primary save',
    id: 'confirm-' + inputId,
    css: {
      'margin-left': '5px'
    },
    onclick: 'confirmEdit(this.id)',
    text: 'confirm'
  }).insertAfter('#' + clickedId);
}

// confirms the edit of the hunt
function confirmEdit(clickedId){
  var editData = clickedId.replace('confirm-edit-', '');
  var hunt = {};
  hunt[editData] = $('#edit-' + editData).val()
  if (hunt[editData] == ''){
    alert('fields cannot be empty');
    return
  }
  var huntId = $('#hunt-label-id').text();
  $.ajax({
    url: Url + '/hunts/' + huntId,
    type: 'PATCH',
    data: JSON.stringify(hunt),
    contentType: 'application/json',
    dataType: 'json',
    headers: {
      Authorization: 'Bearer ' + token
    },
    success: function(response){
      alert(response['name'] + ' was edited successfully.') // create a popup window if time
      $('#' + clickedId).remove();
      var inputField = clickedId.replace('confirm-', '');
      $('#' + inputField).prop('readonly', true);
      $('#' + inputField).val(response[editData]);
    },
    error: function(){
      alert('There was an error with your request. #1');
    },
    statusCode: {
      403: function(response){
        alert('You are not the owner of this hunt. Changes can not be made.');
      }
    }
  })
}

// deletes a hunt
function deleteHunt(){
  var huntId = $('#hunt-label-id').text();
  $.ajax({
    url: Url + '/hunts/' + huntId,
    type: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + token
    },
    success: function(response){
      alert('hunt was deleted successfully.') // create a popup window if time
      window.location.href = '/'
    },
    statusCode: {
      403: function(response){
        alert('You are not the owner of this hunt. Changes can not be made.');
      }
    }
  })
}

function storeHuntIDs(hunts){
    for(i = 0; i < hunts.length; i++) {
      huntIDArray.push(hunts[i]['hunt id']);
      huntNameArray.push(hunts[i]['name']);
  }
}

function storeClueIDs(clues){
    for(i = 0; i < clues.length; i++) {
      clueIDArray.push(clues[i]['clue id']);
    }
}

/* MAP STUFF */
function toggleClueBtn(){
  var x = document.getElementById("show-first-clue");
  if (x.style.display == "none") {
      x.style.display = "inline";
  } else {
      x.style.display = "none";
  }
}

function toggleMap(){
  var x = document.getElementById("home-page");
  var y = document.getElementById("map");
  var button = document.getElementById("map-done");

  //home page show
  if (x.style.display === "none") {
      x.style.display = "block";
      toggleClueBtn();
  } else { //home page hide
      x.style.display = "none";
      toggleClueBtn();
  }

  //map show
  if (y.style.display === "none") {
      y.style.display = "block";
      button.style.display = "inline";
  } else { //map hide
      y.style.display = "none";
      button.style.display = "none";
  }
}

//reveals passed description (clue) on play map
function showClue1(clueDescr){
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        var popUpClue = new google.maps.InfoWindow({
          content: clueDescr,
          position: pos,
        });
    popUpClue.open(map);
    });
  }
}

function hiddenMarker(clueLoc){
  console.log("clueLoc",clueLoc)
  const h_marker = new google.maps.Marker({
    position: clueLoc,
    map,
    title: "Clue location",
  });
  return h_marker;
}

function markerTest(clueID){
  initMap();// do i need this????????????????????????

  $.ajax({
    url: Url + '/clues/' + clueID,
    type: 'GET',
    success: function(response){
      returnedData = JSON.parse(response);
      var pos1 = JSON.parse(returnedData['gps coordinates'])
      console.log("pos1::",pos1)
      var marker = new google.maps.Marker({
        position: pos1
      });
      map.setZoom(15);
      map.setCenter(pos1);
      marker.setMap(map);
     
    }
  })
}

// function that will toggle the map to create a clue
function createClueMap(clickedId){
  if (clickedId == 'map-done'){
    $('#mini-map-input').hide();
    initMap();
  }
  else{
    $('#mini-map-input').show();
  }

  var popUpInfo = new google.maps.InfoWindow({
    content: "Click the map to get Lat/Lng!",
    position: initialLocation,
  });
  popUpInfo.open(miniMap);
  // configure the click listener
  miniMap.addListener('click', (mapsMouseEvent) => {
    // close the current pop up window
    popUpInfo.close();
    // create new pop up window
    popUpInfo = new google.maps.InfoWindow({
      position: mapsMouseEvent.latLng,
    });
    popUpInfo.setContent(
      JSON.stringify(mapsMouseEvent.latLng.toJSON(), null, 2)
    );
    popUpInfo.open(miniMap);

    // gather location of click to enter into data fields
    var location = JSON.stringify(mapsMouseEvent.latLng.toJSON(), null, 2);
    $('#' + clickedId + '-loc').val(location);
  })
}

// shows a mini popup of the location of the clue
function showClueLocation(clickedId){
  if (clickedId == 'map-done'){
    $('#mini-map-input').hide();
    initMap();
  }
  else{
    $('#mini-map-input').show();
  }

  $.ajax({
    url: Url + '/clues/' + clickedId,
    type: 'GET',
    success: function(response){
      returnedData = JSON.parse(response);
      var pos = JSON.parse(returnedData['gps coordinates'])
      var marker = new google.maps.Marker({
        position: pos
      });
      miniMap.setZoom(15);
      miniMap.setCenter(pos);
      marker.setMap(miniMap);
    }
  })
}

// shows a mini popup of the location of the treasure
function showTreasureLocation(clickedId){
  if (clickedId == 'map-done'){
    $('#mini-map-input').hide();
    initMap();
  }
  else{
    $('#mini-map-input').show();
  }

  $.ajax({
    url: Url + '/treasures/' + clickedId,
    type: 'GET',
    success: function(response){
      returnedData = JSON.parse(response);
      var pos = JSON.parse(returnedData['gps coordinates'])
      var marker = new google.maps.Marker({
        position: pos
      });
      miniMap.setZoom(15);
      miniMap.setCenter(pos);
      marker.setMap(miniMap);
    }
  })
}

function initMap() {
  // google map with new style
  map = new google.maps.Map(document.getElementById('map'), {
    mapId: "c667678be8f885b9"
  });

  // google map with new style for the mini map
  miniMap = new google.maps.Map(document.getElementById('mini-map'), {
    mapId: "c667678be8f885b9"
  });


  //add to map after time out
  //setTimeout(function(){ clueMarker1.setMap(map); }, 3000);*/


  // center on user's location if geolocation prompt allowed
  navigator.geolocation.getCurrentPosition(function(position){
    initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    map.setCenter(initialLocation);
    miniMap.setCenter(initialLocation);
    map.setZoom(13);
    miniMap.setZoom(13);
  }, function(positionError){
    // user denied geolocation prompt - default to corvallis
    map.setCenter(new google.maps.LatLng(44.56370413923824, -123.27945503001553));
    miniMap.setCenter(new google.maps.LatLng(44.56370413923824, -123.27945503001553));
    map.setZoom(5);
    miniMap.setZoom(5);
  })

 
  infoWindow = new google.maps.InfoWindow();
  const locationButton = document.createElement("button");
  locationButton.textContent = "Pan to Current Location";
  locationButton.classList.add("custom-map-control-button");
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
  locationButton.addEventListener("click", () => {
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          infoWindow.setPosition(pos);
          infoWindow.setContent("hi!");
          infoWindow.open(map);
          map.setCenter(pos);
          //https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition
          //listener_id = navigator.geolocation.watchPosition(success, error, options); //working on this for success listener
          //userMarker.setPosition(pos);

          //clue marker
          markerTest(clueIDArray[0]);
          
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
  });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
  infoWindow.open(map);
}

// function for geolocation
function getUserLocation() {
  //initMap();//this might be resetting some shit
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log("pos",pos)
      return pos;
    });
  }
}

// function for geolocation
function setUserLocationMarker() {
  initMap();//NEXT do i need this?
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
        const marker = new google.maps.Marker({
          position: pos,
          map: map,
          title: "You are here",
      });
      marker.setMap(map);
      return pos;
    });
  }
}

// function for geolocation
function distanceToClue() {
  var cluePosLat;
  var cluePosLong;
  var distance;
  var userLoc;
  //var userLoc = getUserLocation();
  
  if (navigator.geolocation){
    //get user curr loc
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log("pos",pos)
          userLoc = pos;
          console.log("userLoc",userLoc)
    });
  }

    cluePosLat = currClueCoords['lat'];
    cluePosLong = currClueCoords['lng'];

    navigator.geolocation.watchPosition(function(position){
      distance = calculateDistance(cluePosLat, cluePosLong, position.coords.latitude, position.coords.longitude);
      
      var popUpClue = new google.maps.InfoWindow({
        content: 'Distance to clue: ' + distance + ' mi',
        position: userLoc //was currClueLoc
      });
      popUpClue.open(map);
    });
  }
}

// calculates the distance to target
function calculateDistance(lat1, lon1, lat2, lon2) {
  var R = 6371; // km
  var dLat = (lat2-lat1).toRad();
  var dLon = (lon2-lon1).toRad();
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  // convert to miles
  d = d * 0.621371;
  var dis = d.toFixed(2);
  return dis;
}

Number.prototype.toRad = function() {
  return this * Math.PI / 180;
}

/*
* This section regards button clicks and hiding/showing forms
button 1 id = b1
default container = c1 = x
create hunt container = c2 = y
 */
function toggleButton1() {
var x = document.getElementById("c1");
var y = document.getElementById("c2");

if (x.style.display === "none") {
    x.style.display = "block";
} else {
    x.style.display = "none";
}

if (y.style.display === "none") {
    y.style.display = "block";
} else {
    y.style.display = "none";
}
//toggle_C2();

}
/*
button 1 id = b1
create hunt container = c2 = y
 */
function toggle_C2() {
  var y = document.getElementById("c2");

  if (y.style.display === "none") {
      y.style.display = "block";
  } else {
      y.style.display = "none";
  }
  
}

function toggleButton2() {
  // wait for get requests
  setTimeout(function(){
    var x = document.getElementById("c1");
    var y = document.getElementById("c3");
  
    if (x.style.display === "none") {
        x.style.display = "block";
    } else {
        x.style.display = "none";
    }
  
    if (y.style.display === "none") {
        y.style.display = "block";
    } else {
        y.style.display = "none";
    }
  }, 1500);
}

// function to dynamically create the clue entry html depending upon
// how many clues the user is wanting to add
function createClues(){
  for (var i = 1; i <= numberOfClues; i++){
    $('<div></div>', {
      "class": 'create-input',
      id: 'clue-' + i
    }).insertBefore('#create-clues-form').after('<br/>');
    $('<label></label', {
      for: 'clue' + i,
      text: 'Clue ' + i + ' Text:'
    }).appendTo('#clue-' + i).after('<br/>');
    $('<textarea></textarea', {
      "class": 'clue-info',
      id: 'clueInfo' + i,
      name: 'clue' + i 
    }).appendTo('#clue-' + i).after('<br/>', '<br/>');
    $('<label></label', {
      for: 'clue' + i + '-loc',
      text: 'Clue ' + i + ' Location:'
    }).appendTo('#clue-' + i).after('<br/>');
    $('<input/>', {
      type: 'text',
      "class": 'clue-loc',
      id: 'clue' + i + '-loc',
      name: 'clue' + i + '-loc',
      css: {
        'margin-right': '5px'
      },
      prop: {
        'readonly': 'true'
      }
    }).appendTo('#clue-' + i);
    $('<button/>', {
      type: 'button',
      "class": 'button alt-gradient-button',
      id: 'clue' + i,
      onclick: 'createClueMap(this.id)',
      text: 'map'
    }).appendTo('#clue-' + i);
  }
  $('#c2-2').css('display', 'block');
}

function createTreasure(){
  $('#c2-3').show();
  var x = document.getElementById("treasure-input");
  var y = document.getElementById("c2-2");
  if (x.style.display === "none") {
      x.style.display = "block";
  } else {
      y.style.display = "block";
  }
}

$(document).ajaxStart(function(){
  $('#loading').show();
})
$(document).ajaxStop(function(){
  $('#loading').hide();
})