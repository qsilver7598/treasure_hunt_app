/*
* This section regards rendering a map and current location with google maps API
*/

let map, infoWindow;

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

function submitHunt(){
    toggleButton1()
}

// this function was adapted from https://www.learnwithjason.dev/blog/get-form-values-as-json
function dataSubmit(event){
  event.preventDefault();
  const data = new FormData(event.target);
  const value = Object.fromEntries(data.entries());

  console.log({value});
}

const form = document.querySelector('form');
form.addEventListener('submit', dataSubmit);

function playHunt(){
    
}


