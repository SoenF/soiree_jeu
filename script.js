
// 🍎 POMME POURRIE - GAME ENGINE V4 (Firebase Edition)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyAQ_yRXGtm5AH4epr0oWIebfAK8ZukW30g",
    authDomain: "pomme-pourrie.firebaseapp.com",
    databaseURL: "https://pomme-pourrie-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pomme-pourrie",
    storageBucket: "pomme-pourrie.firebasestorage.app",
    messagingSenderId: "806948078604",
    appId: "1:806948078604:web:d6daffd54e49c2c1a31a29",
    measurementId: "G-V8VPLWXN6V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const DB_REF = ref(db, 'game_state');

// --- ASSETS ---
const EMOJI_POOL = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
    '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🦄', '🐝', '🐛', '🦋',
    '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐',
    '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🦍', '🐘', '🦛',
    '🦏', '🦓', '🦒', '🦘', '🐃', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐'
];

// --- INITIAL STATE ---
let state = {
    players: [], // { id, name, avatar }
    currentGame: null,
    editingGameIndex: -1,
    history: [],
    rules: { // Default Rules
        win: 3,
        second: 1,
        ppHidden: 5,
        ppFound: -2,
        finder: 1
    }
};

// --- DOM ELEMENTS ---
const views = {
    setup: document.getElementById('view-setup'),
    dashboard: document.getElementById('view-dashboard'),
    newGame: document.getElementById('view-new-game'),
    gameProgress: document.getElementById('view-game-progress'),
    scoring: document.getElementById('view-scoring')
};

// --- INIT ---
function init() {
    // Real-time listener
    onValue(DB_REF, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state = data;
            if (!state.history) state.history = [];
            if (!state.players) state.players = [];
        } else {
            // No data on server, keep default state
            // Optionally save default state to init server? 
            // Better to just wait for user action to save.
        }

        // Migration checks (V3 -> V4 Rules)
        if (!state.rules) {
            state.rules = { win: 3, second: 1, ppHidden: 5, ppFound: -2, finder: 1 };
        }

        updateUI();
    });

    setupEventListeners();
}

function updateUI() {
    // Populate Rules Inputs
    if (document.getElementById('rule-win')) {
        document.getElementById('rule-win').value = state.rules.win;
        document.getElementById('rule-second').value = state.rules.second;
        document.getElementById('rule-pp-hidden').value = state.rules.ppHidden;
        document.getElementById('rule-pp-found').value = state.rules.ppFound;
        document.getElementById('rule-finder').value = state.rules.finder;
    }

    if (state.players.length === 0) {
        showView('setup');
        renderPlayersList();
    } else {
        // If we represent a non-empty state, we update lists.
        // We DO NOT auto-redirect to dashboard anymore, to allow adding multiple players.

        renderPlayersList(); // Update player list in setup view too just in case
        renderLeaderboard();
        renderHistory();

        // Refresh temp teams if in new game view
        if (state.currentGame && document.getElementById('view-new-game').classList.contains('active')) {
            renderTempTeams();
        }

        // Refresh live teams if in progress view
        if (state.currentGame && document.getElementById('view-game-progress').classList.contains('active')) {
            renderLiveTeams();
        }
    }
}

function getRandomEmoji() {
    const usedEmojis = state.players.map(p => p.avatar);
    const available = EMOJI_POOL.filter(e => !usedEmojis.includes(e));

    if (available.length > 0) {
        return available[Math.floor(Math.random() * available.length)];
    } else {
        // Fallback if we have more players than emojis
        return EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
    }
}

// --- NAVIGATION ---
function showView(viewName) {
    if (!views[viewName]) {
        console.error(`View '${viewName}' not found`);
        return;
    }
    Object.values(views).forEach(el => el.classList.remove('active'));
    views[viewName].classList.add('active');
}

// --- SETTINGS MODAL ---
function openSettings() {
    // Refresh inputs from state
    document.getElementById('rule-win').value = state.rules.win;
    document.getElementById('rule-second').value = state.rules.second;
    document.getElementById('rule-pp-hidden').value = state.rules.ppHidden;
    document.getElementById('rule-pp-found').value = state.rules.ppFound;
    document.getElementById('rule-finder').value = state.rules.finder;

    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function updateRules() {
    state.rules.win = parseFloat(document.getElementById('rule-win').value) || 0;
    state.rules.second = parseFloat(document.getElementById('rule-second').value) || 0;
    state.rules.ppHidden = parseFloat(document.getElementById('rule-pp-hidden').value) || 0;
    state.rules.ppFound = parseFloat(document.getElementById('rule-pp-found').value) || 0;
    state.rules.finder = parseFloat(document.getElementById('rule-finder').value) || 0;
    saveState();
}

// --- PLAYER MANAGEMENT ---
function addPlayer() {
    const input = document.getElementById('new-player-input');
    const name = input.value.trim();
    if (name) {
        state.players.push({
            id: Date.now() + Math.random(),
            name: name,
            avatar: getRandomEmoji()
        });
        input.value = '';
        saveState();
        // UI update handled by listener
    }
}

function quickAddPlayer() {
    const name = prompt("Nom du nouveau joueur :");
    if (name) {
        state.players.push({
            id: Date.now() + Math.random(),
            name: name,
            avatar: getRandomEmoji()
        });
        saveState();
        alert(`${name} ajouté!`);
    }
}

function removePlayer(id) {
    if (confirm("Supprimer ce joueur ?")) {
        // Use String() to ensure we match even if types defer (string vs number)
        state.players = state.players.filter(p => String(p.id) !== String(id));
        saveState();
    }
}

function renderPlayersList() {
    const container = document.getElementById('players-list');
    if (!container) return;
    container.innerHTML = state.players.map(p => `
        <div class="player-chip">
            <div class="chip-avatar">${p.avatar}</div>
            <div class="chip-name">${p.name}</div>
            <div class="remove-btn" onclick="removePlayer('${p.id}')">×</div>
        </div>
    `).join('');
}

// --- GAME LOGIC ---
function startParty() {
    if (state.players.length < 2) return alert("Il faut au moins 2 joueurs !");
    // Initial save of default rules if someone just clicks start without opening settings
    saveState();

    // Explicitly go to dashboard since we removed auto-redirect
    showView('dashboard');
    renderLeaderboard();
    renderHistory();
}

function prepareNewGame() {
    state.editingGameIndex = -1;
    document.getElementById('game-name-input').value = '';

    // UI Reset
    document.getElementById('custom-team-count').value = '';

    // We update local state, but don't save yet to avoid syncing incomplete game prep to everyone?
    // Actually, "Prepare" is usually local until "Start". 
    // BUT, if we want shared prep, we need to save state.
    // Let's keep prep local for now until generate teams, OR update state.
    // Current app architecture stores everything in `state`. So `state.currentGame` is shared.
    // If Player A clicks "New Game", Player B should see "New Game" view?
    // The current architecture doesn't sync "Current View". It syncs "Data".
    // So if I click "New Game", I see it. Other players don't see it unless I update `state.currentGame`.
    // Let's just switch view locally.

    showView('newGame');
    setTeamCount(2); // Local UI update
}

function setTeamCount(count) {
    const validCount = Math.max(2, parseInt(count));

    // Update active button state
    document.querySelectorAll('.btn-preset').forEach(btn => {
        if (parseInt(btn.innerText) === validCount) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // If count matches a preset, clear custom input, otherwise value is set by custom input
    const customInput = document.getElementById('custom-team-count');
    if (customInput) {
        if ([2, 3, 4, 5].includes(validCount)) {
            if (parseInt(customInput.value) !== validCount) {
                customInput.value = '';
            }
        } else {
            // Deselect all presets if manual number is not in presets
            document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
        }
    }

    generateTeams(validCount);
}

function setCustomTeamCount(val) {
    if (!val) return;
    setTeamCount(val);
}

function generateTeams(numTeams) {
    const shuffled = [...state.players].sort(() => 0.5 - Math.random());
    const teams = [];

    for (let i = 0; i < numTeams; i++) {
        teams.push({
            id: `team_${Date.now()}_${i}`,
            name: `Équipe ${i + 1}`,
            playerIds: []
        });
    }

    shuffled.forEach((p, index) => {
        teams[index % numTeams].playerIds.push(p.id);
    });

    // Determine if we should save immediately. 
    // If we save, everyone sees these teams in "New Game" if they are on that screen?
    // Let's save so everyone sees the teams being formed.
    state.currentGame = { name: '', teams: teams };
    saveState();

    renderTempTeams(); // Also calling this here for instant local feedback before sync roundtrip
}

// --- DRAG AND DROP & MOBILE TAP & TOUCH ---
let selectedPlayerId = null;
let touchDragItem = null;

function renderTempTeams() {
    if (!state.currentGame || !state.currentGame.teams) return;
    const teams = state.currentGame.teams;
    const container = document.getElementById('temp-teams-container');
    if (!container) return;

    container.innerHTML = teams.map(t => `
        <div class="team-preview drop-zone" 
             ondragover="allowDrop(event, this)" 
             ondrop="dropPlayer(event, '${t.id}')"
             ondragleave="leaveDrop(this)"
             onclick="handleTeamClick('${t.id}')"
             data-team-id="${t.id}">
            <h3>${t.name}</h3>
            <div class="team-members-list">
                ${t.playerIds.map(pid => {
        const p = state.players.find(x => x.id === pid);
        const isSelected = (pid === selectedPlayerId);
        return p
            ? `<span class="team-member-tag ${isSelected ? 'selected-for-move' : ''}" 
                     draggable="true" 
                     ondragstart="dragStart(event, ${pid})"
                     onclick="event.stopPropagation(); togglePlayerSelection(${pid})"
                     ontouchstart="handleTouchStart(event, ${pid})"
                     ontouchmove="handleTouchMove(event)"
                     ontouchend="handleTouchEnd(event)">
                     ${p.avatar} ${p.name}
               </span>`
            : '';
    }).join('')}
            </div>
        </div>
    `).join('');
}

// TAP LOGIC
function togglePlayerSelection(pid) {
    if (selectedPlayerId === pid) {
        selectedPlayerId = null;
    } else {
        selectedPlayerId = pid;
    }
    renderTempTeams();
}

function handleTeamClick(teamId) {
    if (selectedPlayerId) {
        movePlayerToTeam(selectedPlayerId, teamId);
        selectedPlayerId = null;
        renderTempTeams();
    }
}

// DESKTOP DRAG & DROP
function allowDrop(ev, el) {
    ev.preventDefault();
    el.classList.add('drag-over');
}
function leaveDrop(el) {
    el.classList.remove('drag-over');
}
function dragStart(ev, pid) {
    ev.dataTransfer.setData("playerId", pid);
}
function dropPlayer(ev, teamId) {
    ev.preventDefault();
    const el = ev.currentTarget;
    el.classList.remove('drag-over');
    const pid = parseFloat(ev.dataTransfer.getData("playerId"));
    movePlayerToTeam(pid, teamId);
    renderTempTeams();
}

// MOBILE TOUCH DRAG LOGIC
function handleTouchStart(e, pid) {
    const touch = e.touches[0];
    const target = e.currentTarget;

    const ghost = target.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = (touch.clientX - 20) + 'px';
    ghost.style.top = (touch.clientY - 20) + 'px';
    ghost.style.opacity = '0.8';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.transform = 'scale(1.1)';
    document.body.appendChild(ghost);

    touchDragItem = {
        pid: pid,
        ghost: ghost
    };

    if (navigator.vibrate) navigator.vibrate(50);
}

function handleTouchMove(e) {
    if (!touchDragItem) return;
    e.preventDefault();
    const touch = e.touches[0];
    touchDragItem.ghost.style.left = (touch.clientX - 20) + 'px';
    touchDragItem.ghost.style.top = (touch.clientY - 20) + 'px';
}

function handleTouchEnd(e) {
    if (!touchDragItem) return;

    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = el ? el.closest('.drop-zone') : null;

    if (dropZone) {
        const teamId = dropZone.dataset.teamId;
        movePlayerToTeam(touchDragItem.pid, teamId);
        renderTempTeams();
    }

    if (touchDragItem.ghost) touchDragItem.ghost.remove();
    touchDragItem = null;
}

function movePlayerToTeam(pid, targetTeamId) {
    state.currentGame.teams.forEach(t => {
        t.playerIds = t.playerIds.filter(id => id !== pid);
    });
    const targetTeam = state.currentGame.teams.find(t => t.id === targetTeamId);
    if (targetTeam) targetTeam.playerIds.push(pid);
    saveState(); // SYNC TEAM MOVE
}

// --- START GAME ---
function startGame() {
    const emptyTeam = state.currentGame.teams.find(t => t.playerIds.length === 0);
    if (emptyTeam && !confirm(`L'équipe "${emptyTeam.name}" est vide. Continuer ?`)) return;

    const nameInput = document.getElementById('game-name-input').value.trim();
    state.currentGame.name = nameInput || `Jeu #${state.history.length + 1}`;

    // We don't save yet, will be saved at end of func

    state.editingGameIndex = -1; // New game

    saveState();

    // Everyone should technically see this?
    // Current app doesn't force view sync. So only person who clicked start goes to progress.
    showView('gameProgress');
    renderLiveTeams();
}

function renderLiveTeams() {
    document.getElementById('current-game-title').innerText = state.currentGame.name;
    const liveContainer = document.getElementById('live-teams-display');
    if (!liveContainer) return;

    liveContainer.innerHTML = state.currentGame.teams.map(t => `
        <div class="team-preview">
            <strong>${t.name}</strong> : <br>
            ${t.playerIds.map(pid => {
        const p = state.players.find(x => x.id === pid);
        return p ? `<span style="display:inline-block; margin:2px 5px">${p.avatar} ${p.name}</span>` : '';
    }).join('')}
        </div>
    `).join('');
}


function editHistoryGame(index) {
    const gameRecord = state.history[index];
    state.editingGameIndex = index;
    state.currentGame = { ...gameRecord };
    state.currentGame.teams = JSON.parse(JSON.stringify(gameRecord.teams));
    state.currentGame.results = JSON.parse(JSON.stringify(gameRecord.results));

    scoringState = {
        winnerId: gameRecord.results.winnerId,
        secondId: gameRecord.results.secondId
    };

    prepareScoring(true);
}


// --- SCORING VIEW ---
let scoringState = { winnerId: null, secondId: null };

function prepareScoring(isEditing = false) {
    const teams = state.currentGame.teams;
    const winContainer = document.getElementById('winner-selection');
    const secContainer = document.getElementById('second-selection');
    const ppContainer = document.getElementById('pp-revelation-container');

    const createTeamBtns = (container, type, preSelectedId) => {
        container.innerHTML = teams.map(t => `
            <button class="team-select-btn ${t.id === preSelectedId ? 'selected' : ''}" 
                    onclick="selectTeam(this, '${type}', '${t.id}')">
                ${t.name}
            </button>
        `).join('');
    };

    if (!isEditing) {
        scoringState = { winnerId: null, secondId: null };
    }

    createTeamBtns(winContainer, 'winner', scoringState.winnerId);
    createTeamBtns(secContainer, 'second', scoringState.secondId);

    ppContainer.innerHTML = teams.map(t => {
        const teamPlayers = t.playerIds.map(pid => state.players.find(x => x.id === pid)).filter(p => p);

        // Skip if team empty
        if (teamPlayers.length === 0) return `<div class="pp-revealer"><h4>${t.name} (Aucun joueur)</h4></div>`;

        let existingPPData = null;
        if (isEditing && state.currentGame.results && state.currentGame.results.ppData) {
            existingPPData = state.currentGame.results.ppData[t.id];
        }

        const defaultPPId = existingPPData ? existingPPData.ppId : "";
        const defaultFound = existingPPData ? existingPPData.found : false;

        let defaultFinderIds = [];
        if (existingPPData) {
            if (existingPPData.finderIds) defaultFinderIds = existingPPData.finderIds;
            else if (existingPPData.finderId) defaultFinderIds = [existingPPData.finderId];
        }

        return `
            <div class="pp-revealer" id="pp-group-${t.id}">
                <h4>🍎 Pomme Pourrie - ${t.name}</h4>
                
                <label>C'était qui ?</label>
                <select class="pp-who-select" onchange="updatePPFinder(this, '${t.id}')">
                    <option value="">-- Sélectionner --</option>
                    ${teamPlayers.map(p => `<option value="${p.id}" ${p.id == defaultPPId ? 'selected' : ''}>${p.avatar} ${p.name}</option>`).join('')}
                </select>

                <label>Découverte ?</label>
                <div class="toggle-group">
                    <div class="toggle-opt no ${!defaultFound ? 'active' : ''}" onclick="setFound(this, '${t.id}', false)">Non</div>
                    <div class="toggle-opt yes ${defaultFound ? 'active' : ''}" onclick="setFound(this, '${t.id}', true)">Oui</div>
                </div>

                <div id="finder-box-${t.id}" class="${defaultFound ? '' : 'hidden'}" data-found="${defaultFound}">
                    <label>Trouvée par qui ?</label>
                    <div class="finders-list">
                        ${teamPlayers.map(p => {
            const isPP = (p.id == defaultPPId);
            return `
                            <label class="checkbox-item ${isPP ? 'hidden' : ''}">
                                <input type="checkbox" class="pp-finder-checkbox" value="${p.id}" 
                                    ${defaultFinderIds.includes(p.id) ? 'checked' : ''}>
                                <span>${p.avatar} ${p.name}</span>
                            </label>
                        `}).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    showView('scoring');
}

function updatePPFinder(select, teamId) {
    const ppId = select.value;
    const container = document.getElementById(`finder-box-${teamId}`);
    const checkboxes = container.querySelectorAll('.pp-finder-checkbox');

    checkboxes.forEach(cb => {
        const label = cb.parentElement;
        if (cb.value == ppId) {
            cb.checked = false;
            cb.disabled = true;
            label.classList.add('hidden'); // Hide completely
        } else {
            cb.disabled = false;
            label.classList.remove('hidden'); // Show
        }
    });
}

function selectTeam(btn, type, id) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    if (type === 'winner') scoringState.winnerId = id;
    if (type === 'second') scoringState.secondId = id;
}

function setFound(btn, teamId, found) {
    const group = btn.parentElement;
    group.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const finderBox = document.getElementById(`finder-box-${teamId}`);
    if (found) {
        finderBox.classList.remove('hidden');
        finderBox.dataset.found = "true";
    } else {
        finderBox.classList.add('hidden');
        finderBox.dataset.found = "false";
    }
}

function validateScores() {
    try {
        if (!scoringState.winnerId) return alert("Sélectionnez l'équipe gagnante !");

        const teams = state.currentGame.teams;
        let ppResults = {};
        let error = false;

        teams.forEach(team => {
            const teamEl = document.getElementById(`pp-group-${team.id}`);
            if (!teamEl || team.playerIds.length === 0) return;

            const ppSelect = teamEl.querySelector('.pp-who-select');
            const ppId = ppSelect ? ppSelect.value : null;

            if (!ppId) {
                error = true;
                return;
            }

            const finderBox = teamEl.querySelector(`#finder-box-${team.id}`);
            const isFound = finderBox ? finderBox.dataset.found === "true" : false;

            let finderIds = [];
            if (isFound) {
                const checkboxes = teamEl.querySelectorAll('.pp-finder-checkbox:checked');
                checkboxes.forEach(cb => finderIds.push(parseFloat(cb.value)));
            }

            ppResults[team.id] = {
                ppId: parseFloat(ppId),
                found: isFound,
                finderIds: finderIds
            };
        });

        if (error) return alert("Veuillez désigner toutes les Pommes Pourries !");

        const completeGameRecord = {
            name: state.currentGame.name,
            teams: state.currentGame.teams,
            results: {
                winnerId: scoringState.winnerId,
                secondId: scoringState.secondId,
                ppData: ppResults
            }
        };

        if (state.editingGameIndex > -1) {
            state.history[state.editingGameIndex] = completeGameRecord;
        } else {
            state.history.push(completeGameRecord);
        }

        state.currentGame = null;
        state.editingGameIndex = -1;

        saveState();

        renderLeaderboard();
        renderHistory();
        showView('dashboard');

    } catch (e) {
        console.error("Error in validateScores:", e);
        alert("Une erreur est survenue lors de la validation des scores : " + e.message);
    }
}

// --- SCORE ENGINE ---
function calculateTotalScore(playerId) {
    let score = 0;
    const R = state.rules || { win: 3, second: 1, ppHidden: 5, ppFound: 2, finder: 1 };

    state.history.forEach(game => {
        const { teams, results } = game;
        const team = teams.find(t => t.playerIds.includes(playerId));
        if (!team) return;

        const teamId = team.id;
        if (teamId === results.winnerId) score += R.win;
        else if (teamId === results.secondId) score += R.second;

        const ppData = results.ppData[teamId];
        if (!ppData) return;

        const isWinningTeam = (teamId === results.winnerId);
        if (!isWinningTeam) {
            if (ppData.ppId == playerId) {
                if (!ppData.found) score += R.ppHidden;
                else score += R.ppFound;
            }
            if (ppData.found) {
                const finders = ppData.finderIds || (ppData.finderId ? [ppData.finderId] : []);
                if (finders.includes(playerId)) score += R.finder;
            }
        }
    });

    return score;
}


// --- RENDERING ---
function renderLeaderboard() {
    const list = document.getElementById('leaderboard');
    const podium = document.getElementById('podium');

    const playersWithScores = state.players.map(p => ({
        ...p,
        score: calculateTotalScore(p.id)
    }));

    const sorted = playersWithScores.sort((a, b) => b.score - a.score);

    const top3 = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    // PODIUM RENDER
    let podiumHtml = '';
    if (top3.length > 0) {
        const p1 = top3[0];
        const p2 = top3[1];
        const p3 = top3[2];
        if (p2) {
            podiumHtml += `
                <div class="podium-item rank-2">
                    <div class="podium-name">${p2.name}</div>
                    <div class="podium-avatar">${p2.avatar}</div>
                    <div class="podium-bar">
                        <div class="podium-score">${p2.score}</div>
                    </div>
                </div>
            `;
        }
        if (p1) {
            podiumHtml += `
                <div class="podium-item rank-1">
                    <div class="podium-icon">👑</div>
                    <div class="podium-name">${p1.name}</div>
                    <div class="podium-avatar">${p1.avatar}</div>
                    <div class="podium-bar">
                        <div class="podium-score">${p1.score}</div>
                    </div>
                </div>
            `;
        }
        if (p3) {
            podiumHtml += `
                <div class="podium-item rank-3">
                    <div class="podium-name">${p3.name}</div>
                    <div class="podium-avatar">${p3.avatar}</div>
                    <div class="podium-bar">
                        <div class="podium-score">${p3.score}</div>
                    </div>
                </div>
            `;
        }
    }
    podium.innerHTML = podiumHtml;

    list.innerHTML = rest.map((p, idx) => `
        <div class="leader-item rank-${idx + 4}">
            <div class="leader-rank">#${idx + 4}</div>
            <div class="leader-info" style="display:flex; align-items:center; gap:8px">
                <span style="font-size:1.5rem">${p.avatar}</span>
                ${p.name}
            </div>
            <div class="leader-score">${p.score}</div>
        </div>
    `).join('');
}

function renderHistory() {
    const list = document.getElementById('games-history');
    let html = '';
    for (let i = state.history.length - 1; i >= 0; i--) {
        const h = state.history[i];
        const winnerName = h.teams.find(t => t.id === h.results.winnerId)?.name || '??';

        html += `
            <div class="history-item" onclick="editHistoryGame(${i})">
                <div>
                    <span class="game-name">${h.name}</span>
                    <br><span class="game-winner">🏆 ${winnerName}</span>
                </div>
                <div class="edit-icon">✏️</div>
            </div>
        `;
    }
    list.innerHTML = html;
}


// --- RESET LOGIC ---
function resetApp() {
    if (confirm("⚠️ Tout effacer et recommencer la soirée à zéro ?")) {
        set(DB_REF, null);
        location.reload();
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    const safeListen = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    safeListen('new-game-btn', 'click', prepareNewGame);
    safeListen('quick-add-player-btn', 'click', quickAddPlayer);

    document.querySelectorAll('.back-btn').forEach(b => {
        b.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            showView(target);
        });
    });

    safeListen('add-player-btn', 'click', addPlayer);
    safeListen('start-party-btn', 'click', startParty);

    safeListen('generate-teams-btn', 'click', () => {
        let count = 2;
        const custom = document.getElementById('custom-team-count').value;
        if (custom) {
            count = parseInt(custom);
        } else {
            const activeBtn = document.querySelector('.btn-preset.active');
            if (activeBtn) count = parseInt(activeBtn.innerText);
        }
        generateTeams(count);
    });
    safeListen('start-game-btn', 'click', startGame);
    safeListen('go-to-scoring-btn', 'click', () => prepareScoring(false));
    safeListen('validate-scores-btn', 'click', validateScores);
    safeListen('reset-app-btn', 'click', resetApp);
}

// --- EXPOSE TO WINDOW ---
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.updateRules = updateRules;
window.removePlayer = removePlayer;
window.setTeamCount = setTeamCount;
window.setCustomTeamCount = setCustomTeamCount;
window.editHistoryGame = editHistoryGame;

// Drag & Drop / Mobile
window.togglePlayerSelection = togglePlayerSelection;
window.handleTeamClick = handleTeamClick;
window.allowDrop = allowDrop;
window.leaveDrop = leaveDrop;
window.dragStart = dragStart;
window.dropPlayer = dropPlayer;
window.handleTouchStart = handleTouchStart;
window.handleTouchMove = handleTouchMove;
window.handleTouchEnd = handleTouchEnd;
window.resetApp = resetApp;

// Scoring
window.selectTeam = selectTeam;
window.updatePPFinder = updatePPFinder;
window.setFound = setFound;

// --- UTILS ---
function saveState() {
    set(DB_REF, state);
}

// Start
init();
