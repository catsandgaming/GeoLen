// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
const auth = getAuth(app);

// Auth UI Handling
const authScreen = document.getElementById('auth-screen');
const authForm = document.getElementById('auth-form');

window.showAuthForm = () => {
    document.querySelectorAll('.auth-btn').forEach(b => b.style.display = 'none');
    authForm.style.display = 'flex';
};

window.loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (err) { alert(err.message); }
};

window.handleEmailAuth = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        // Try login, if fails, try signup
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (signupErr) { alert(signupErr.message); }
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        authScreen.style.display = 'none';
        if (user.photoURL) document.querySelector('.profile-pic').src = user.photoURL;
    } else {
        authScreen.style.display = 'flex';
    }
});

window.logout = () => signOut(auth);

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

async function searchNearbyPlaces(coords, radiusKm) {
    const { Place } = await google.maps.importLibrary("places");
    
    const request = {
        // New API requirements
        locationRestriction: {
            center: { lat: coords.latitude, lng: coords.longitude },
            radius: radiusKm * 1000, // Convert km to meters
        },
        // Use simple types for better results coverage
        includedPrimaryTypes: ["restaurant", "cafe", "establishment"],
        maxResultCount: 15,
    };

    try {
        const { places } = await Place.searchNearby(request);
        return places.map(p => ({
            name: p.displayName,
            lat: p.location.lat(),
            lng: p.location.lng(),
            id: p.id,
            type: p.primaryType,
            placeObj: p
        }));
    } catch (err) {
        console.error("Places search failed", err);
        return [];
    }
}

async function renderPlaces(radius) {
    if (isSearching || !userCoords) return;
    
    isSearching = true;
    console.log("Searching for nearby places...");

    const existing = document.querySelectorAll('.poi');
    existing.forEach(el => el.parentNode.removeChild(el));

    const places = await searchNearbyPlaces(userCoords, radius);

    places.forEach(place => {
        const dist = calculateDistance(userCoords.latitude, userCoords.longitude, place.lat, place.lng);
        
        // Container entity for the marker
        const entity = document.createElement('a-entity');
        entity.setAttribute('class', 'poi');
        entity.setAttribute('gps-entity-place', `latitude: ${place.lat}; longitude: ${place.lng};`);
        entity.setAttribute('look-at', '[gps-camera]');
        entity.setAttribute('scale', '15 15 15');

        // Standard Red Pin (matches 2.png mockup)
        const image = document.createElement('a-image');
        image.setAttribute('src', 'https://maps.google.com/mapfiles/ms/icons/red-dot.png');
        image.setAttribute('position', '0 1.5 0');
        image.setAttribute('width', '1');
        image.setAttribute('height', '1');

        // Text Label
        const text = document.createElement('a-text');
        text.setAttribute('value', `${place.name}\n(${dist.toFixed(2)} km)`);
        text.setAttribute('align', 'center');
        text.setAttribute('position', '0 2.5 0');
        text.setAttribute('scale', '1.2 1.2 1.2');

        entity.appendChild(image);
        entity.appendChild(text);
        
        entity.addEventListener('click', async () => {
            const panel = document.querySelector('.ui-panel');
            panel.style.display = 'block';
            infoBox.innerHTML = "Loading...";
            
            await place.placeObj.fetchFields({ 
                fields: ["formattedAddress", "rating", "userRatingCount", "photos", "websiteUri", "types"] 
            });

            let html = `<span class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">×</span>`;
            html += `<h3>${place.name}</h3>`;
            html += `<div class="category">${place.placeObj.types[0].replace(/_/g, ' ')}</div>`;
            
            if (place.placeObj.rating) {
                html += `<p class="rating">★ ${place.placeObj.rating} (${place.placeObj.userRatingCount} reviews)</p>`;
            }

            html += `<p>${place.placeObj.formattedAddress}</p>`;
            
            // Photo Grid (matches 4.png mockup)
            if (place.placeObj.photos && place.placeObj.photos.length > 0) {
                html += `<div class="photo-grid">`;
                place.placeObj.photos.slice(0, 4).forEach(photo => {
                    html += `<img src="${photo.getURI({maxWidth: 300})}">`;
                });
                html += `</div>`;
            }

            if (place.placeObj.websiteUri) {
                html += `<p style="text-align:center"><a href="${place.placeObj.websiteUri}" target="_blank" style="background:#000; color:#fff; padding:10px 20px; text-decoration:none; border-radius:10px; display:inline-block; margin-top:15px;">See more</a></p>`;
            }

            infoBox.innerHTML = html;
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