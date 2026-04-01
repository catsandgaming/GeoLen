// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDm0FAy9UA6v5uMAlzgnXHILWzKx9BEtfg",
  authDomain: "geolabs-d36ce.firebaseapp.com",
  projectId: "asop-74f7d",
  storageBucket: "geolabs-d36ce.firebasestorage.app",
  messagingSenderId: "684144373066",
  appId: "1:684144373066:web:1d74f44d6d4b043c32e5b3",
  measurementId: "G-CBHNY3L1BX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const slider = document.getElementById('radius-slider');
const radiusText = document.getElementById('radius-text');
const infoBox = document.getElementById('info');
const scene = document.querySelector('a-scene');

let userCoords = null;
let lastSearchCoords = null;
let isSearching = false;

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

async function searchNearbySchools(coords, radiusKm) {
    const { Place } = await google.maps.importLibrary("places");
    
    const request = {
        fields: ["displayName", "location", "formattedAddress"],
        locationRestriction: {
            center: { lat: coords.latitude, lng: coords.longitude },
            radius: radiusKm * 1000, // Convert km to meters
        },
        includedPrimaryTypes: ["school"],
        maxResultCount: 20,
    };

    try {
        const { places } = await Place.searchNearby(request);
        return places.map(p => ({
            name: p.displayName,
            lat: p.location.lat(),
            lng: p.location.lng(),
            info: p.formattedAddress || "A local school"
        }));
    } catch (err) {
        console.error("Places search failed", err);
        return [];
    }
}

async function renderPlaces(radius) {
    if (isSearching || !userCoords) return;
    
    isSearching = true;
    infoBox.innerText = "Searching for schools...";

    const existing = document.querySelectorAll('.poi');
    existing.forEach(el => el.parentNode.removeChild(el));

    const schools = await searchNearbySchools(userCoords, radius);
    
    infoBox.innerText = schools.length > 0 ? 
        `Found ${schools.length} schools. Point your camera around!` : 
        "No schools found in this radius.";

    schools.forEach(place => {
        const dist = calculateDistance(userCoords.latitude, userCoords.longitude, place.lat, place.lng);
        
        const entity = document.createElement('a-text');
        entity.setAttribute('class', 'poi');
        entity.setAttribute('value', `${place.name}\n(${dist.toFixed(2)} km)`);
        entity.setAttribute('gps-entity-place', `latitude: ${place.lat}; longitude: ${place.lng};`);
        entity.setAttribute('scale', '20 20 20');
        entity.setAttribute('look-at', '[gps-camera]');
        entity.setAttribute('align', 'center');
        entity.setAttribute('position', '0 5 0'); // Raise text above ground level
        
        entity.addEventListener('click', () => {
            infoBox.innerText = place.info;
        });

        scene.appendChild(entity);
    });
    isSearching = false;
}

navigator.geolocation.watchPosition(pos => {
    const newCoords = pos.coords;
    
    // Only trigger a new search if we haven't searched yet, 
    // or if the user has moved more than 100 meters (0.1 km)
    if (!lastSearchCoords || calculateDistance(
        lastSearchCoords.latitude, lastSearchCoords.longitude,
        newCoords.latitude, newCoords.longitude
    ) > 0.1) {
        userCoords = newCoords;
        lastSearchCoords = newCoords;
        renderPlaces(slider.value);
    } else {
        userCoords = newCoords; // Update position without re-fetching API data
    }
}, err => {
    console.error("Error getting location", err);
    infoBox.innerText = "Location access denied. Please enable GPS and refresh.";
    infoBox.style.color = "#ff4444";
}, { enableHighAccuracy: true });

slider.addEventListener('input', (e) => {
    const val = e.target.value;
    radiusText.innerText = val;
    renderPlaces(val);
});