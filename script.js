// RacePoint - Game Score Manager Logic

// --- Constants & State ---
const STORAGE_KEY = 'racepoint_game_data';
const VEHICLES = [
    { id: 'car_red', path: 'assets/vehicles/car_red.png' },
    { id: 'car_blue', path: 'assets/vehicles/car_blue.png' },
    { id: 'rocket', path: 'assets/vehicles/rocket.png' }
];

let state = {
    teams: [
        {
            id: 1,
            name: 'Équipe Alpha',
            score: 0,
            vehicle: 'assets/vehicles/car_red.png',
            players: [
                { name: 'Alice', avatar: 'assets/players/default.png' },
                { name: 'Bob', avatar: 'assets/players/default.png' }
            ]
        },
        {
            id: 2,
            name: 'Équipe Beta',
            score: 0,
            vehicle: 'assets/vehicles/car_blue.png',
            players: [
                { name: 'Charlie', avatar: 'assets/players/default.png' }
            ]
        }
    ],
    targetScore: 20 // Max score for track mapping
};

// --- Initialization ---
function init() {
    loadState();
    renderApp();
    setupEventListeners();
}

// --- Persistence ---
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        state = JSON.parse(saved);
    }
}

// --- Rendering ---
function renderApp() {
    renderTracks();
    renderControls();
}

function renderTracks() {
    const container = document.getElementById('tracks-list');
    container.innerHTML = '';
    
    // Sort teams by score for visual ranking (optional, here we keep fixed lanes)
    // For this design, let's keep fixed lanes but highlight the leader
    
    // Find max score to adjust track scaling if necessary
    const maxCurrentScore = Math.max(...state.teams.map(t => t.score), state.targetScore);
    
    state.teams.forEach(team => {
        const percentage = Math.min((team.score / maxCurrentScore) * 90, 92); // Max 92% to avoid going out of track
        
        const trackRow = document.createElement('div');
        trackRow.className = 'track-row';
        trackRow.innerHTML = `
            <div class="track-info">
                <div class="team-name-tag">
                    ${team.name}
                    <div class="team-avatars">
                        ${team.players.map(p => `<img src="${p.avatar}" class="mini-avatar" title="${p.name}">`).join('')}
                    </div>
                </div>
                <div class="score-display" id="score-val-${team.id}">${team.score} pts</div>
            </div>
            <div class="track-lane">
                <div class="vehicle-container" style="left: calc(${percentage}% + 5px)">
                    <img src="${team.vehicle}" class="vehicle" id="vehicle-${team.id}">
                </div>
            </div>
        `;
        container.appendChild(trackRow);
    });
}

function renderControls() {
    const container = document.getElementById('teams-controls');
    container.innerHTML = '';
    
    state.teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-control-card';
        card.innerHTML = `
            <div class="control-team-name">${team.name}</div>
            <div class="score-buttons">
                <button class="btn-point" onclick="addPoints(${team.id}, 1)">+1</button>
                <button class="btn-point" onclick="addPoints(${team.id}, 2)">+2</button>
                <button class="btn-point" onclick="addPoints(${team.id}, 3)">+3</button>
                <button class="btn-point btn-custom" onclick="customPoints(${team.id})">Personnalisé</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Actions ---
window.addPoints = function(teamId, points) {
    const team = state.teams.find(t => t.id === teamId);
    if (team) {
        team.score += points;
        if (team.score < 0) team.score = 0;
        
        saveState();
        updateUI(teamId);
    }
};

window.customPoints = function(teamId) {
    const pts = prompt("Nombre de points à ajouter (négatif possible) :");
    const num = parseInt(pts);
    if (!isNaN(num)) {
        window.addPoints(teamId, num);
    }
};

function updateUI(teamId) {
    const team = state.teams.find(t => t.id === teamId);
    const scoreEl = document.getElementById(`score-val-${teamId}`);
    const vehicleEl = document.getElementById(`vehicle-${teamId}`);
    
    if (scoreEl) {
        scoreEl.innerText = `${team.score} pts`;
        scoreEl.classList.add('pulse');
        setTimeout(() => scoreEl.classList.remove('pulse'), 300);
    }
    
    // Refresh all track positions because max score might have changed
    renderTracks();
}

function resetScores() {
    if (confirm("Voulez-vous vraiment remettre tous les scores à zéro ?")) {
        state.teams.forEach(t => t.score = 0);
        saveState();
        renderApp();
    }
}

// --- Setup Modal Logic ---
function openSetup() {
    const modal = document.getElementById('setup-modal');
    renderSetupList();
    modal.style.display = 'block';
}

function closeSetup() {
    document.getElementById('setup-modal').style.display = 'none';
}

function renderSetupList() {
    const container = document.getElementById('setup-teams-list');
    container.innerHTML = '';
    
    state.teams.forEach((team, tIdx) => {
        const item = document.createElement('div');
        item.className = 'setup-team-item';
        item.innerHTML = `
            <div class="setup-team-header">
                <input type="text" value="${team.name}" class="setup-input" onchange="updateTeamName(${tIdx}, this.value)">
                <select class="vehicle-select" onchange="updateTeamVehicle(${tIdx}, this.value)">
                    ${VEHICLES.map(v => `<option value="${v.path}" ${team.vehicle === v.path ? 'selected' : ''}>${v.id}</option>`).join('')}
                </select>
                <button class="btn danger" onclick="removeTeam(${tIdx})">&times;</button>
            </div>
            <div class="players-setup-list">
                ${team.players.map((p, pIdx) => `
                    <div class="player-item">
                        <input type="text" value="${p.name}" class="setup-input" placeholder="Nom joueur" onchange="updatePlayerName(${tIdx}, ${pIdx}, this.value)">
                        <button class="btn danger" onclick="removePlayer(${tIdx}, ${pIdx})">&times;</button>
                    </div>
                `).join('')}
                <button class="btn secondary" onclick="addPlayer(${tIdx})">+ Joueur</button>
            </div>
        `;
        container.appendChild(item);
    });
}

window.updateTeamName = (idx, val) => state.teams[idx].name = val;
window.updateTeamVehicle = (idx, val) => state.teams[idx].vehicle = val;
window.removeTeam = (idx) => {
    state.teams.splice(idx, 1);
    renderSetupList();
};
window.addTeam = () => {
    state.teams.push({
        id: Date.now(),
        name: `Équipe ${state.teams.length + 1}`,
        score: 0,
        vehicle: VEHICLES[0].path,
        players: []
    });
    renderSetupList();
};
window.updatePlayerName = (tIdx, pIdx, val) => state.teams[tIdx].players[pIdx].name = val;
window.addPlayer = (tIdx) => {
    state.teams[tIdx].players.push({ name: '', avatar: 'assets/players/default.png' });
    renderSetupList();
};
window.removePlayer = (tIdx, pIdx) => {
    state.teams[tIdx].players.splice(pIdx, 1);
    renderSetupList();
};

function setupEventListeners() {
    document.getElementById('setup-btn').addEventListener('click', openSetup);
    document.querySelector('.close-modal').addEventListener('click', closeSetup);
    document.getElementById('add-team-btn').addEventListener('click', window.addTeam);
    document.getElementById('save-setup-btn').addEventListener('click', () => {
        saveState();
        renderApp();
        closeSetup();
    });
    document.getElementById('reset-btn').addEventListener('click', resetScores);
    
    window.onclick = (event) => {
        if (event.target == document.getElementById('setup-modal')) {
            closeSetup();
        }
    };
}

// Start
init();
