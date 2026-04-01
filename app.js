// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDm0FAy9UA6v5uMAlzgnXHILWzKx9BEtfg",
  authDomain: "geolabs-d36ce.firebaseapp.com",
  projectId: "geolabs-d36ce",
  storageBucket: "geolabs-d36ce.firebasestorage.app",
  messagingSenderId: "684144373066",
  appId: "1:684144373066:web:1d74f44d6d4b043c32e5b3",
  measurementId: "G-CBHNY3L1BX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Mock Data: Replace with an API call to Google Places or your own database
const PLACES = [
    { name: "Central Park", lat: 40.785091, lng: -73.968285, info: "A large public park in New York City." },
    { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945, info: "Iconic iron tower in Paris." },
    // Add more locations here
];

const slider = document.getElementById('radius-slider');
const radiusText = document.getElementById('radius-text');
const infoBox = document.getElementById('info');
const scene = document.querySelector('a-scene');

let userCoords = null;

// Calculate distance between two points in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function renderPlaces(radius) {
    // Clear existing points
    const existing = document.querySelectorAll('.poi');
    existing.forEach(el => el.parentNode.removeChild(el));

    if (!userCoords) return;

    PLACES.forEach(place => {
        const dist = calculateDistance(userCoords.latitude, userCoords.longitude, place.lat, place.lng);
        
        if (dist <= radius) {
            const entity = document.createElement('a-text');
            entity.setAttribute('class', 'poi');
            entity.setAttribute('value', `${place.name}\n(${dist.toFixed(2)} km)`);
            entity.setAttribute('gps-entity-place', `latitude: ${place.lat}; longitude: ${place.lng};`);
            entity.setAttribute('scale', '15 15 15');
            entity.setAttribute('look-at', '[gps-camera]');
            entity.setAttribute('align', 'center');
            
            // Add interaction to show info
            entity.addEventListener('click', () => {
                infoBox.innerText = place.info;
            });

            scene.appendChild(entity);
        }
    });
}

// Get User Location
navigator.geolocation.watchPosition(pos => {
    userCoords = pos.coords;
    renderPlaces(slider.value);
}, err => console.error("Error getting location", err), { enableHighAccuracy: true });

// Slider Event
slider.addEventListener('input', (e) => {
    const val = e.target.value;
    radiusText.innerText = val;
    renderPlaces(val);
});
