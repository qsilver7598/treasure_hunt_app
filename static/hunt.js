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

// const Url='http://localhost:8080';
const Url='https://cs467-capstone.uw.r.appspot.com';

console.log("Test::: 7")

// jQuery functions for interaction with the database
// CREATE HUNT
$(document).ready(function(){

  // Get request to retrieve hunts in database
  $('#b2').click(function(){
    $.ajax({
      url: Url + '/hunts',
      type: 'GET',
      success: function(response){
        var returnedData = JSON.parse(response);
        createHuntList(returnedData['hunts']);
        storeHuntIDs(returnedData['hunts']);//store hunt name and ID in global arrays
        console.log("returnedData['hunts']:", returnedData['hunts'])
      },
      error: function(){
        alert('There was an error with b2 button get request')
        window.location.href = '/'
      }
    })
  })

  $('#createHunt').click(function(){
    var hunt = getHuntInfo();
    if (hunt == 'error'){
      alert('One or more of the fields are empty. Please try again.');
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
          $('#hunt-title').attr('readonly', true);
          $('#hunt-theme').attr('readonly', true);
          $('#clue-number').attr('readonly', true);
          createClues();
        },
        error: function(){
          alert('There was an error with your request. #1')
          window.location.href = '/'
        }
      })
    }
  })

  //create clues and attach them to the hunt
  $('#submit-clues').click(function(){
    // check all of the fields and make sure they are not empty
    var emptyFieldCheck = false;
    for (let i = 1; i <= numberOfClues; i++){
      var clue = getClueInfo("#clue" + i, "#clue" + i + "-loc");
      if (clue == 'error'){
        emptyFieldCheck = true;
      }
    }
    // if any field is empty an alert will be triggered
    // if all fields are filled out then the clues will be created in the database
    if (emptyFieldCheck == true){
      alert('One or more of the clue fields are empty. Please try again.');
    }
    else{
      for (let j = 1; j <= numberOfClues; j++){
        var clue = getClueInfo("#clue" + j, "#clue" + j + "-loc");
        $.ajax({
          url: Url + '/clues',
          type: 'POST',
          data: clue,
          contentType: 'application/json',
          dataType: 'json',
          async: false,
          success: function(response){
            newClueId = response['clue id'];
            // after clue is created, attach to the hunt
            $.ajax({
              url: Url + '/hunts/' + newHuntId + '/clues/' + newClueId,
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
          },
          error: function(){
            alert('There was an error with your request. #2')
            window.location.href = '/'
          }
        })
      }
    }
  })

  //create treasure and attach it to the hunt
  $('#submit-treasure').click(function(){
    // check all of the fields and make sure they are not empty
    var treasure = getTreasureInfo();
    if (treasure == 'error'){
      alert('One or more of the fields are empty. Please try again.');
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
              window.location.href = '/'
            },
            error: function(){
              alert('There was an error with your request. #3')
              window.location.href = '/'
            }
          })
        },
        error: function(){
          alert('There was an error with your request. #4')
          window.location.href = '/'
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
          console.log("returnedData after Play:",returnedData)
          //need to get clue data with clueID***************************works for one clue ATM, need to set up loop to get all id's
          //console.log("returnedData['clues'][0]['clue id']:", returnedData['clues'][0]['clue id'])
          storeClueIDs(returnedData['clues']);
          //clueIDArray.push(returnedData['clues'][0]['clue id']);
          console.log("clueIDArray[0]:", clueIDArray[0])
          //alert("pause before loading /play")
          //window.location.href = '/play'
        },
        error: function(){
          alert('There was an error with play button get request')
          //window.location.href = '/'
        }
      })
    })

    $('#show-first-clue').click(function(){
      //var huntID = getSelectedHunt();
      console.log("clueIDArray[0]:", clueIDArray[0])
      $.ajax({
        url: Url + '/clues/' + clueIDArray[0], //grab first clue in array
        type: 'GET',
        success: function(response){
          var returnedData = JSON.parse(response);
          console.log("returnedData after show clue:",returnedData)
          //need to get clue data with clueID***************************works for one clue ATM, need to set up loop to get all id's
          console.log("returnedData['description']:", returnedData['description'])//testing
          console.log("returnedData['gps coordinates']:", returnedData['gps coordinates'])
          storeClueIDs(returnedData['clue']);
          //clueIDArray.push(returnedData['clues'][0]['clue id']);
          alert("pause before loading clue text")
          //
          //window.location.href = '/play'
        },
        error: function(){
          alert('There was an error with show clue button get request')
          //window.location.href = '/'
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
    console.log("huntList[i].id: ", huntList[i].id) // !!! grabs html tag id successfully
       if(huntList[i].checked)
        selectedHuntIDX = huntList[i].id;// get id of attribute
        //selectedHuntName = huntList[i].previousSibling.innerText;//get name from associated label
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

//getting treasure info
function getTreasureInfo(){
  var treasure = {
    'description': $("#treasure").val(),
    'gps coordinates': $("#treasure-loc").val() 
  }
  if (treasure['description'] == '' || treasure['gps coordinates'] == ''){
    return 'error';
  }
  return JSON.stringify(treasure);
}

//FIND HUNT BUTTON
function createHuntList(hunts){
  $.each(hunts, function(key, val){
    var radioBtn = $('<input type="radio" name="huntRadio" id=' + key + ' />');
    var label = $('<label id=huntName>' + val['name'] + '</label>' + '<br><br>');
    radioBtn.appendTo('#find-hunt-radio-box');
    label.appendTo('#find-hunt-radio-box');
  })
}

function storeHuntIDs(hunts){
 // $.each(function(hunts){
    for(i = 0; i < hunts.length; i++) {
    //huntIDArray.push(returnedData['hunts'][0]['hunt id']);
      huntIDArray.push(hunts[i]['hunt id']);
      huntNameArray.push(hunts[i]['name']);
      console.log("huntIDArray:",huntIDArray)
      console.log("huntIDArray[i]:",huntIDArray[i])
      console.log("huntNameArray[i]:",huntNameArray[i])
  }//)
}

function storeClueIDs(clues){
    for(i = 0; i < clues.length; i++) {
      clueIDArray.push(clues[i]['clue id']);
      //clueDescriptionArray.push(clues[i]['description']);
      console.log("clueIDArray:",clueIDArray)
      console.log("clueIDArray[i]:",clueIDArray[i])
      //console.log("clueDescriptionArray:",clueDescriptionArray)
      //console.log("clueDescriptionArray[i]:",clueDescriptionArray[i])
    }
}
//DISPLAY CLUE
function clueTest(){
 /* var clues = [{
    "description": "This is a clue description.",
    "gps coordinates": "15.12345, 45.12345"
  }]
  clues.appendTo('#show-clue-1');
  console.log(getElementById('#show-clue-1'))*/
  return (44.53522795062745, -123.36314760791065);
}



/* MAP STUFF */
function toggleClueBtn(){
  var x = document.getElementById("show-first-clue");
  if (x.style.display == "none") {
      x.style.display = "block";
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
  }

  //map show
  if (y.style.display === "none") {
      y.style.display = "block";
      button.style.display = "inline";
  } else { //map hide
      y.style.display = "none";
      button.style.display = "none";
  }

  let popUpInfo = new google.maps.InfoWindow({
    content: "Click the map to get Lat/Lng!",
    position: initialLocation,
  });
  popUpInfo.open(map);
  // configure the click listener
  map.addListener('click', (mapsMouseEvent) => {
    // close the current pop up window
    popUpInfo.close();
    // create new pop up window
    popUpInfo = new google.maps.InfoWindow({
      position: mapsMouseEvent.latLng,
    });
    popUpInfo.setContent(
      JSON.stringify(mapsMouseEvent.latLng.toJSON(), null, 2)
    );
    popUpInfo.open(map);
  })
}

function initMap() {
  // google map with new style
  map = new google.maps.Map(document.getElementById('map'), {
    mapId: "c667678be8f885b9"
  });

  // center on user's location if geolocation prompt allowed
  navigator.geolocation.getCurrentPosition(function(position){
    initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    map.setCenter(initialLocation);
    map.setZoom(13);
  }, function(positionError){
    // user denied geolocation prompt - default to corvallis
    map.setCenter(new google.maps.LatLng(44.56370413923824, -123.27945503001553));
    map.setZoom(5);
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
          infoWindow.setContent(currClueDescription);
          infoWindow.open(map);
          map.setCenter(pos);
          //marker.setPosition(pos);

          //clue marker
          const marker = new google.maps.Marker({
            position: clueTest(),
            map,
            title: "Clue 1",
          });
          //add to map after time out
          setTimeout(function(){ marker.setMap(map); }, 3000);

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
    //console.log("x3 =", x)
    x.style.display = "none";
    //console.log("x4 =", x)
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
      id: 'clue' + i,
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
      name: 'clue' + i + '-loc'
    }).appendTo('#clue-' + i);
    $('<button/>', {
      type: 'button',
      "class": 'button alt-gradient-button',
      id: 'map-loc-clue' + i,
      onclick: 'toggleMap()',
      text: 'map'
    }).appendTo('#clue-' + i);
  }
  $('#c2-2').css('display', 'block');
}

function createTreasure(){
  $('#submit-clues').hide();
  $('#submit-treasure').show();
  var x = document.getElementById("treasure-input");
  var y = document.getElementById("c2-2");
  if (x.style.display === "none") {
      x.style.display = "block";
  } else {
      y.style.display = "block";
  }
}

function addClue(){
    var x = document.getElementById("clue-2");
    var y = document.getElementById("clue-3");
    var z = document.getElementById("clue-4");
    if (x.style.display === "none") {
        x.style.display = "block";
    } 
    else if(y.style.display === "none") {
      y.style.display = "block";
  } 
    else {
        z.style.display = "block";
    }
}

// function submitHunt(){
//     toggleButton1()
    
// }
// // this function was adapted from https://gist.github.com/prof3ssorSt3v3/52ebd432bb7b8a155985a2f82509541d
// //outer array likely not needed for our purposes

// let hunt_list = [];
// const huntCreate = (ev)=>{
//   //ev.preventDefault();  //to stop the form submitting
//   let hunt = {
//       title: document.getElementById('hunt-title').value,
//       theme: document.getElementById('hunt-theme').value,
//       clues: [],
//       treasures: []
//       // treasure: document.getElementById('treasure').value,
//       // clue1: document.getElementById('clue1').value,
//       // clue2: document.getElementById('clue2').value,
//       // clue3: document.getElementById('clue3').value,
//       // clue4: document.getElementById('clue4').value

//       //theme: document.querySelector('#radio-box input').value
//   }
//   hunt_list.push(hunt);
//   // to clear the form for the next entries
//   document.querySelector('form').reset();

//   //for display purposes only
//   console.warn('added' , {hunt} );
//   console.log(hunt)
//   let pre = document.querySelector('#msg pre');
//   pre.textContent = '\n' + JSON.stringify(hunt_list, '\t', 2);
//   setTimeout(alert("paused"),4000);

//   //send to server
//   var request = new XMLHttpRequest();
//   request.open("POST", "http://localhost:8080/hunts", true);
//   request.setRequestHeader('Authorization', 'Bearer ' + token);
//   request.setRequestHeader('Content-Type', 'application/json');
//   console.log(request)
//   request.send(JSON.stringify(hunt));

//   request.onreadystatechange = function () {
//     if (request.readyState === 4) {
//       alert(request.responstText);
//     }
//   }
//   // const myHuntJSON = JSON.stringify(hunt);
//   // window.location = "https://cs467-capstone.uw.r.appspot.com/hunts" + myHuntJSON;//or whatever the correct address is
// }

// function playHunt(){
  
// }

// document.addEventListener('DOMContentLoaded', ()=>{
// document.getElementById('submit').addEventListener('click', huntCreate);
// });


// for (let j = 1; j <= numberOfClues; j++){
//   // delay to allow server to properly attach all of the clues
//   (function(j){
//     setTimeout(function(){
//       var clue = getClueInfo("#clue" + j, "#clue" + j + "-loc");
//       $.ajax({
//         url: Url + '/clues',
//         type: 'POST',
//         data: clue,
//         contentType: 'application/json',
//         dataType: 'json',
//         success: function(response){
//           newClueId = response['clue id'];
//           // after clue is created, attach to the hunt
//           $.ajax({
//             url: Url + '/hunts/' + newHuntId + '/clues/' + newClueId,
//             type: 'PUT',
//             headers: {
//               Authorization: 'Bearer ' + token
//             },
//             success: function(response){
//               alert('clue added to hunt')
//               createTreasure();
//             },
//             error: function(){
//               alert('There was an error with your request. #1')
//               window.location.href = '/'
//             }
//           })
//         },
//         error: function(){
//           alert('There was an error with your request. #2')
//           window.location.href = '/'
//         }
//       })
//     }, 1500 * j);
//   }(j));
// }
// }