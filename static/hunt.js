/*
* This section regards rendering a map and current location with google maps API
*/

let map, infoWindow;

// const Url='http://localhost:8080';
const Url='https://cs467-capstone.uw.r.appspot.com';


// jQuery functions for interaction with the database
$(document).ready(function(){
  $('#createHunt').click(function(){
    var hunt = getHuntInfo();
    if (hunt == 'error'){
      alert('One or more of the fields are empty. Please try again.');
    }
    else{
      $.ajax({
        url: Url + '/hunts',
        type: 'POST',
        data: getHuntInfo(),
        contentType: 'application/json',
        dataType: 'json',
        headers: {
          Authorization: 'Bearer ' + token
        },
        success: function(response){
          $('#create-hunt-form').trigger('reset');
        },
        error: function(){
          alert('There was an error with your request.')
          window.location.href = '/'
        }
      })
    }
  })
  $('#b2').click(function(){
    $.ajax({
      url: Url + '/hunts',
      type: 'GET',
      success: function(response){
        var returnedData = JSON.parse(response);
        createHuntList(returnedData['hunts']);
        
      }
    })
  })
})


function getHuntInfo(){
  var hunt = {
    name: $("#hunt-title").val(),
    theme: $("#hunt-theme").val(),
    clues: [],
    treasures: []
  }
  if (hunt['name'] == '' || hunt['theme'] == ''){
    return 'error';
  }
  return JSON.stringify(hunt);
}


function createHuntList(hunts){
  $.each(hunts, function(key, val){
    var radioBtn = $('<input type="radio" id=' + key + ' />');
    var label = $('<label id=huntName>' + val['name'] + '</label>' + '<br><br>');
    radioBtn.appendTo('#find-hunt-radio-box');
    label.appendTo('#find-hunt-radio-box');
  })
}

function initMap() {
    
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: -34.397, lng: 150.644 },
    zoom: 6,
    
  });
  
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
          infoWindow.setContent("Location found.");
          infoWindow.open(map);
          map.setCenter(pos);
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
 */
function toggleButton1() {
    //console.log("button 1")
var x = document.getElementById("c1");
var y = document.getElementById("c2");

if (x.style.display === "none") {
    //console.log("x1 =", x)
    x.style.display = "block";
    //console.log("x2 =", x)
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


function addClue(){
    var x = document.getElementById("clue-3");
    var y = document.getElementById("clue-4");
    if (x.style.display === "none") {
        x.style.display = "block";
    } else {
        y.style.display = "block";
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