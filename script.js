// RacePoint - Game Score Manager Logic

// --- Constants & State ---
const STORAGE_KEY = 'racepoint_game_data';
const VEHICLES = [
    { id: 'Course', icon: '🏎️' },
    { id: 'Taxi', icon: '🚕' },
    { id: 'Police', icon: '🚓' },
    { id: 'Ambulance', icon: '🚑' },
    { id: 'Pompier', icon: '🚒' },
    { id: 'Bus', icon: '🚌' },
    { id: 'Camion', icon: '🚚' },
    { id: 'Tracteur', icon: '🚜' },
    { id: 'Scooter', icon: '🛵' },
    { id: 'Moto', icon: '🏍️' },
    { id: 'Vélo', icon: '🚲' },
    { id: 'Train', icon: '🚂' },
    { id: 'Avion', icon: '✈️' },
    { id: 'Fusée', icon: '🚀' },
    { id: 'Soucoupe', icon: '🛸' },
    { id: 'Hélico', icon: '🚁' },
    { id: 'Canoë', icon: '🛶' },
    { id: 'Voilier', icon: '⛵' },
    { id: 'Bateau', icon: '🚤' },
    { id: 'Paquebot', icon: '🛳️' },
    { id: 'Licorne', icon: '🦄' },
    { id: 'Dragon', icon: '🐉' },
    { id: 'T-Rex', icon: '🦖' },
    { id: 'Père Noël', icon: '🎅' },
    { id: 'Fantôme', icon: '👻' },
    { id: 'Clown', icon: '🤡' },
    { id: 'Robot', icon: '🤖' },
    { id: 'Caca', icon: '💩' },
    { id: 'Fête', icon: '🥳' },
    { id: 'Champagne', icon: '🍾' }
];

let state = {
    teams: [
        {
            id: 1,
            name: 'Équipe Alpha',
            score: 0,
            vehicle: '🏎️',
            players: [
                { name: 'Alice', avatar: 'assets/players/default.png' },
                { name: 'Bob', avatar: 'assets/players/default.png' }
            ]
        },
        {
            id: 2,
            name: 'Équipe Beta',
            score: 0,
            vehicle: '🚀',
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
    // Validate vehicles in state (if loaded from older version with paths)
    state.teams.forEach(t => {
        if (t.vehicle.includes('/') || t.vehicle.includes('.png')) {
            t.vehicle = '🏎️'; // Reset to default if old path format
        }
    });

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
// --- Rendering ---
function renderApp() {
    renderTracks();
    renderControls();
}

function renderTracks() {
    const container = document.getElementById('tracks-list');

    // 1. Setup SVG Track if not present
    let svg = document.getElementById('race-track-svg');
    const pathDef = "M 50,250 C 200,50 400,350 700,150 S 1100,250 1200,100"; // Sinuous winding path

    if (!svg) {
        container.innerHTML = `
            <svg id="race-track-svg" viewBox="0 0 1250 400" preserveAspectRatio="xMidYMid meet">
                <!-- Outer Glow/Border -->
                <path d="${pathDef}" class="race-path-border" />
                <!-- Inner Road -->
                <path id="race-path-element" d="${pathDef}" class="race-path-line" />
            </svg>
        `;
        svg = document.getElementById('race-track-svg');
    }

    const pathEl = document.getElementById('race-path-element');
    const totalLen = pathEl.getTotalLength();

    // 2. Prepare/Calc Positions & Collision Handling
    const maxCurrentScore = Math.max(...state.teams.map(t => t.score), state.targetScore);

    // Pre-calculate progress and sort primarily by progress
    let vehicles = state.teams.map(team => {
        const rawPct = Math.min((team.score / maxCurrentScore), 1.0);
        return {
            ...team,
            rawPct: rawPct,
            displayOffset: 0
        };
    }).sort((a, b) => a.rawPct - b.rawPct);

    // Group close vehicles (visual collision detection)
    // Increased threshold to 6% of track length to prevent overlaps
    const PROXIMITY_THRESHOLD = 0.06;

    const clusters = [];
    if (vehicles.length > 0) {
        let currentCluster = [vehicles[0]];
        clusters.push(currentCluster);

        for (let i = 1; i < vehicles.length; i++) {
            const prev = vehicles[i - 1];
            const curr = vehicles[i];

            if ((curr.rawPct - prev.rawPct) < PROXIMITY_THRESHOLD) {
                currentCluster.push(curr);
            } else {
                currentCluster = [curr];
                clusters.push(currentCluster);
            }
        }
    }

    // Assign vertical offsets within clusters
    clusters.forEach(cluster => {
        if (cluster.length > 1) {
            // Distribute: Center(0), Up(-75), Down(+75), Up(-150), Down(+150)...
            cluster.forEach((v, idx) => {
                if (idx === 0) {
                    v.displayOffset = 0;
                } else {
                    const sign = (idx % 2 === 0) ? 1 : -1;
                    const magnitude = Math.ceil(idx / 2);
                    v.displayOffset = sign * magnitude * 85; // 85px spread for better visibility
                }
            });
        }
    });

    // 3. Render
    vehicles.forEach(data => {
        const team = state.teams.find(t => t.id === data.id);
        let wrapper = document.getElementById(`wrapper-${team.id}`);

        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = `wrapper-${team.id}`;
            wrapper.className = 'vehicle-wrapper';
            container.appendChild(wrapper);
        }

        const point = pathEl.getPointAtLength(data.rawPct * totalLen);
        const xPct = (point.x / 1250) * 100;
        const yPct = (point.y / 400) * 100;

        wrapper.style.left = `${xPct}%`;
        wrapper.style.top = `${yPct}%`;
        wrapper.style.marginTop = `${data.displayOffset}px`;

        // DETECT IF VEHICLE IS IMAGE OR EMOJI
        const isEmoji = !team.vehicle.includes('/') && team.vehicle.length < 5;
        const vehicleMarkup = isEmoji
            ? `<span style="display: inline-block; transform: scaleX(-1);">${team.vehicle}</span>`
            : `<img src="${team.vehicle}" style="width: 80px; height: 50px; object-fit: contain; transform: scaleX(-1);">`;

        // Update Content
        wrapper.innerHTML = `
            <div class="vehicle">
                ${vehicleMarkup}
                <div class="vehicle-score-badge">${team.score}</div>
            </div>
        `;

        // Z-Index: Ensure vehicles further along are on top
        wrapper.style.zIndex = 100 + Math.floor(data.rawPct * 1000);
    });

    // Cleanup removed teams
    const teamIds = state.teams.map(t => `wrapper-${t.id}`);
    Array.from(container.querySelectorAll('.vehicle-wrapper')).forEach(el => {
        if (!teamIds.includes(el.id)) {
            el.remove();
        }
    });
}

function renderControls() {
    const container = document.getElementById('teams-controls');
    container.innerHTML = '';

    state.teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-control-card';
        card.innerHTML = `
            <div class="control-team-name">${team.name} <span style="font-size: 1.5rem; margin-left: auto;">${team.vehicle}</span></div>
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
window.addPoints = function (teamId, points) {
    const team = state.teams.find(t => t.id === teamId);
    if (team) {
        team.score += points;
        if (team.score < 0) team.score = 0;

        saveState();
        updateUI(teamId);
    }
};

window.customPoints = function (teamId) {
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
                    ${VEHICLES.map(v => `<option value="${v.icon}" ${team.vehicle === v.icon ? 'selected' : ''}>${v.icon} ${v.id}</option>`).join('')}
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
window.updateTeamVehicle = (idx, val) => {
    state.teams[idx].vehicle = val;
    renderApp(); // Live update
};
window.removeTeam = (idx) => {
    state.teams.splice(idx, 1);
    renderSetupList();
};
window.addTeam = () => {
    state.teams.push({
        id: Date.now(),
        name: `Équipe ${state.teams.length + 1}`,
        score: 0,
        vehicle: VEHICLES[0].icon,
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
