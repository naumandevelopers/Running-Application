// Application state
const state = {
    isTracking: false,
    startTime: null,
    currentTime: 0,
    timerInterval: null,
    positions: [],
    totalDistance: 0,
    watchId: null,
    map: null,
    pathLayer: null,
    currentPositionMarker: null,
    savedRuns: [],
};

// DOM Elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const distanceEl = document.getElementById("distance");
const timeEl = document.getElementById("time");
const speedEl = document.getElementById("speed");
const caloriesEl = document.getElementById("calories");
const statusEl = document.getElementById("status");
const savedRunsList = document.getElementById("savedRunsList");
const mapPlaceholder = document.getElementById("mapPlaceholder");

// Initialize the map
function initMap() {
    // Create a map centered on a default location
    state.map = L.map("map").setView([0, 0], 2);

    // Add a tile layer (using OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(state.map);

    // Initialize the path layer
    state.pathLayer = L.polyline([], {
        color: "#2575fc",
        weight: 5,
        opacity: 0.7,
        lineJoin: "round",
    }).addTo(state.map);

    // Hide the map initially
    state.map.getContainer().style.display = "none";
}

// Format time as HH:MM:SS
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Calculate speed in km/h
function calculateSpeed(distance, time) {
    if (time === 0) return 0;
    return (distance / (time / 3600)).toFixed(1);
}

// Calculate calories burned (simplified calculation)
function calculateCalories(distance, time) {
    // Rough estimate: 60 calories per km for running
    return Math.round(distance * 60);
}

// Calculate distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Update the UI with current stats
function updateUI() {
    distanceEl.textContent = state.totalDistance.toFixed(2);
    timeEl.textContent = formatTime(state.currentTime);
    speedEl.textContent = calculateSpeed(
        state.totalDistance,
        state.currentTime
    );
    caloriesEl.textContent = calculateCalories(
        state.totalDistance,
        state.currentTime
    );

    // Enable save button if there's a meaningful run
    saveBtn.disabled = state.totalDistance < 0.01;
}

// Update the map with current position and path
function updateMap(latitude, longitude) {
    const position = [latitude, longitude];

    // Show the map if it's hidden
    if (state.map.getContainer().style.display === "none") {
        state.map.getContainer().style.display = "block";
        mapPlaceholder.style.display = "none";
    }

    // Add the new position to the path
    state.pathLayer.addLatLng(position);

    // Update or create the current position marker
    if (state.currentPositionMarker) {
        state.currentPositionMarker.setLatLng(position);
    } else {
        state.currentPositionMarker = L.marker(position, {
            icon: L.divIcon({
                className: "current-position-marker",
                html: '<i class="fas fa-location-dot" style="color: #ff3b30; font-size: 24px;"></i>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            }),
        }).addTo(state.map);
    }

    // Adjust map view to show the current position and path
    if (state.positions.length === 1) {
        // First position, center on it
        state.map.setView(position, 16);
    } else {
        // Adjust view to fit the path
        state.map.fitBounds(state.pathLayer.getBounds(), {
            padding: [20, 20],
        });
    }
}

// Save current run
function saveCurrentRun() {
    if (state.totalDistance < 0.01) {
        alert("Run is too short to save. Please run at least 10 meters.");
        return;
    }

    const runData = {
        id: Date.now(),
        date: new Date(),
        distance: state.totalDistance,
        time: state.currentTime,
        positions: [...state.positions],
    };

    state.savedRuns.push(runData);
    updateSavedRunsList();

    // Show confirmation
    alert(
        `Run saved successfully!\nDistance: ${state.totalDistance.toFixed(
            2
        )} km\nTime: ${formatTime(state.currentTime)}`
    );
}

// Update the saved runs list
function updateSavedRunsList() {
    if (state.savedRuns.length === 0) {
        savedRunsList.innerHTML = `
                    <li class="saved-run-item">
                        <div class="saved-run-header">
                            <div class="saved-run-date">No saved runs yet</div>
                            <div class="saved-run-distance">0.00 km</div>
                        </div>
                    </li>
                `;
        return;
    }

    savedRunsList.innerHTML = state.savedRuns
        .slice()
        .reverse()
        .map(
            (run) => `
    <li class="saved-run-item">
        <div class="saved-run-header">
            <div class="saved-run-date">${run.date.toLocaleDateString()} ${run.date.toLocaleTimeString(
                [],
                { hour: "2-digit", minute: "2-digit" }
            )}</div>
            <div class="saved-run-distance">${run.distance.toFixed(
                2
            )} km</div>
        </div>
        <div class="saved-run-details">
            <div>Time: ${formatTime(run.time)}</div>
            <div>Speed: ${calculateSpeed(
                run.distance,
                run.time
            )} km/h</div>
        </div>
    </li>
    `
        )
        .join("");
}

// Start tracking
function startTracking() {
    if (state.isTracking) return;

    state.isTracking = true;
    state.startTime = Date.now() - state.currentTime * 1000;

    // Start timer
    state.timerInterval = setInterval(() => {
        state.currentTime = Math.floor((Date.now() - state.startTime) / 1000);
        updateUI();
    }, 1000);

    // Start GPS tracking
    if (navigator.geolocation) {
        statusEl.innerHTML =
            '<i class="fas fa-map-marker-alt"></i> GPS: Tracking your location...';
        statusEl.className = "status gps-active";

        state.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;

                // Add position to history
                if (state.positions.length > 0) {
                    const lastPos = state.positions[state.positions.length - 1];
                    const distance = calculateDistance(
                        lastPos.latitude,
                        lastPos.longitude,
                        latitude,
                        longitude
                    );
                    state.totalDistance += distance;
                }

                state.positions.push({
                    latitude,
                    longitude,
                    accuracy,
                    timestamp: Date.now(),
                });

                updateUI();
                updateMap(latitude, longitude);
            },
            (error) => {
                console.error("Error getting location:", error);
                statusEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> GPS Error: ${error.message}`;
                statusEl.className = "status gps-inactive";
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            }
        );
    } else {
        statusEl.innerHTML =
            '<i class="fas fa-exclamation-triangle"></i> GPS not supported';
        statusEl.className = "status gps-inactive";
    }

    // Update button states
    startBtn.disabled = true;
    stopBtn.disabled = false;
}

// Stop tracking
function stopTracking() {
    if (!state.isTracking) return;

    state.isTracking = false;
    clearInterval(state.timerInterval);

    if (state.watchId) {
        navigator.geolocation.clearWatch(state.watchId);
        state.watchId = null;
    }

    statusEl.innerHTML =
        '<i class="fas fa-map-marker-alt"></i> GPS: Tracking paused';
    statusEl.className = "status gps-inactive";

    // Update button states
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

// Reset tracking
function resetTracking() {
    stopTracking();

    state.startTime = null;
    state.currentTime = 0;
    state.positions = [];
    state.totalDistance = 0;

    // Reset the map
    if (state.pathLayer) {
        state.pathLayer.setLatLngs([]);
    }
    if (state.currentPositionMarker) {
        state.map.removeLayer(state.currentPositionMarker);
        state.currentPositionMarker = null;
    }

    // Hide the map and show placeholder
    state.map.getContainer().style.display = "none";
    mapPlaceholder.style.display = "flex";

    updateUI();

    statusEl.innerHTML =
        '<i class="fas fa-map-marker-alt"></i> GPS: Waiting for location...';
    statusEl.className = "status gps-inactive";
}

// Event listeners
startBtn.addEventListener("click", startTracking);
stopBtn.addEventListener("click", stopTracking);
resetBtn.addEventListener("click", resetTracking);
saveBtn.addEventListener("click", saveCurrentRun);

// Initialize the application
function initApp() {
    initMap();
    updateUI();
    updateSavedRunsList();

    // Load saved runs from localStorage if available
    const savedRunsData = localStorage.getItem("footmeasure_saved_runs");
    if (savedRunsData) {
        try {
            const parsedData = JSON.parse(savedRunsData);
            // Convert date strings back to Date objects
            state.savedRuns = parsedData.map((run) => ({
                ...run,
                date: new Date(run.date),
            }));
            updateSavedRunsList();
        } catch (e) {
            console.error("Error loading saved runs:", e);
        }
    }

    // Save runs to localStorage when the page is about to unload
    window.addEventListener("beforeunload", () => {
        localStorage.setItem(
            "footmeasure_saved_runs",
            JSON.stringify(state.savedRuns)
        );
    });
}

// Start the application when the page loads
window.addEventListener("load", initApp);
