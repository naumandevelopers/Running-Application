// Application state
const state = {
    isTracking: false,
    startTime: null,
    currentTime: 0,
    timerInterval: null,
    positions: [],
    totalDistance: 0,
    watchId: null,
};

// DOM Elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const distanceEl = document.getElementById("distance");
const timeEl = document.getElementById("time");
const paceEl = document.getElementById("pace");
const caloriesEl = document.getElementById("calories");
const statusEl = document.getElementById("status");
const historyList = document.getElementById("historyList");

// Format time as HH:MM:SS
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Calculate pace in min/km
function calculatePace(distance, time) {
    if (distance === 0) return 0;
    const paceInSeconds = time / distance;
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
    paceEl.textContent = calculatePace(
        state.totalDistance,
        state.currentTime
    );
    caloriesEl.textContent = calculateCalories(
        state.totalDistance,
        state.currentTime
    );
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
                const { latitude, longitude } = position.coords;

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
                    timestamp: Date.now(),
                });

                updateUI();
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

    // Save to history if we have a meaningful run
    if (state.totalDistance > 0.1) {
        saveToHistory();
    }
}

// Reset tracking
function resetTracking() {
    stopTracking();

    state.startTime = null;
    state.currentTime = 0;
    state.positions = [];
    state.totalDistance = 0;

    updateUI();

    statusEl.innerHTML =
        '<i class="fas fa-map-marker-alt"></i> GPS: Waiting for location...';
    statusEl.className = "status gps-inactive";
}

// Save run to history
function saveToHistory() {
    const now = new Date();
    const dateStr =
        now.toLocaleDateString() +
        " " +
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Create history item
    const historyItem = document.createElement("li");
    historyItem.className = "history-item";
    historyItem.innerHTML = `
                <div class="history-date">${dateStr}</div>
                <div class="history-distance">${state.totalDistance.toFixed(
        2
    )} km</div>
            `;

    // Add to top of history list
    if (historyList.firstChild.textContent.includes("No runs")) {
        historyList.innerHTML = "";
    }
    historyList.prepend(historyItem);

    // Keep only last 5 runs
    if (historyList.children.length > 5) {
        historyList.removeChild(historyList.lastChild);
    }
}

// Event listeners
startBtn.addEventListener("click", startTracking);
stopBtn.addEventListener("click", stopTracking);
resetBtn.addEventListener("click", resetTracking);

// Initialize UI
updateUI();