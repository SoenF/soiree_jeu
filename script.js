
// 🍎 POMME POURRIE - GAME ENGINE V4 (Rules & Drag-Drop)

const STORAGE_KEY = 'pp_game_v4';

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
    loadState();

    // Migration checks (V3 -> V4 Rules)
    if (!state.rules) {
        state.rules = { win: 3, second: 1, ppHidden: 5, ppFound: -2, finder: 1 };
    }

    // Populate Rules Inputs
    document.getElementById('rule-win').value = state.rules.win;
    document.getElementById('rule-second').value = state.rules.second;
    document.getElementById('rule-pp-hidden').value = state.rules.ppHidden;
    document.getElementById('rule-pp-found').value = state.rules.ppFound;
    document.getElementById('rule-finder').value = state.rules.finder;

    if (state.players.length === 0) {
        showView('setup');
    } else {
        showView('dashboard');
        renderLeaderboard();
        renderHistory();
    }
    setupEventListeners();
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
window.openSettings = function () {
    // Refresh inputs from state in case of inconsistency
    document.getElementById('rule-win').value = state.rules.win;
    document.getElementById('rule-second').value = state.rules.second;
    document.getElementById('rule-pp-hidden').value = state.rules.ppHidden;
    document.getElementById('rule-pp-found').value = state.rules.ppFound;
    document.getElementById('rule-finder').value = state.rules.finder;

    document.getElementById('settings-modal').classList.remove('hidden');
}

window.closeSettings = function () {
    document.getElementById('settings-modal').classList.add('hidden');
    // Re-render leaderboard in case rules changed retroactively
    if (state.players.length > 0) {
        renderLeaderboard();
    }
}

window.updateRules = function () {
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
        renderPlayersList();
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
        renderLeaderboard();
        alert(`${name} ajouté!`);
    }
}

function removePlayer(id) {
    if (confirm("Supprimer ce joueur ?")) {
        state.players = state.players.filter(p => p.id !== id);
        saveState();
        renderPlayersList();
    }
}

function renderPlayersList() {
    const container = document.getElementById('players-list');
    container.innerHTML = state.players.map(p => `
        <div class="player-chip">
            <div class="chip-avatar">${p.avatar}</div>
            <div class="chip-name">${p.name}</div>
            <div class="remove-btn" onclick="removePlayer(${p.id})">×</div>
        </div>
    `).join('');
}

// --- GAME LOGIC ---
function startParty() {
    if (state.players.length < 2) return alert("Il faut au moins 2 joueurs !");

    // Initial save of default rules if someone just clicks start without opening settings
    saveState();

    showView('dashboard');
    renderLeaderboard();
    renderHistory();
}

function prepareNewGame() {
    state.editingGameIndex = -1;
    document.getElementById('game-name-input').value = '';
    const slider = document.getElementById('team-count-slider');
    slider.value = 2;
    document.getElementById('team-count-val').innerText = '2';
    generateTeams(2);
    showView('newGame');
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

    state.currentGame = { name: '', teams: teams };
    renderTempTeams();
}

// --- DRAG AND DROP TEAMS ---
function renderTempTeams() {
    const teams = state.currentGame.teams;
    const container = document.getElementById('temp-teams-container');
    container.innerHTML = teams.map(t => `
        <div class="team-preview" 
             ondragover="allowDrop(event, this)" 
             ondrop="dropPlayer(event, '${t.id}')"
             ondragleave="leaveDrop(this)">
            <h3>${t.name}</h3>
            <div class="team-members-list">
                ${t.playerIds.map(pid => {
        const p = state.players.find(x => x.id === pid);
        return p
            ? `<span class="team-member-tag" draggable="true" ondragstart="dragStart(event, ${pid})">${p.avatar} ${p.name}</span>`
            : '';
    }).join('')}
            </div>
        </div>
    `).join('');
}

window.allowDrop = (ev, el) => {
    ev.preventDefault();
    el.classList.add('drag-over');
}
window.leaveDrop = (el) => {
    el.classList.remove('drag-over');
}
window.dragStart = (ev, pid) => {
    ev.dataTransfer.setData("playerId", pid);
}
window.dropPlayer = (ev, teamId) => {
    ev.preventDefault();
    const el = ev.currentTarget; // The team container
    el.classList.remove('drag-over');

    const pid = parseFloat(ev.dataTransfer.getData("playerId"));
    // Move logic
    movePlayerToTeam(pid, teamId);
    renderTempTeams();
}

function movePlayerToTeam(pid, targetTeamId) {
    // Remove from old team
    state.currentGame.teams.forEach(t => {
        t.playerIds = t.playerIds.filter(id => id !== pid);
    });
    // Add to new team
    const targetTeam = state.currentGame.teams.find(t => t.id === targetTeamId);
    if (targetTeam) targetTeam.playerIds.push(pid);
}

// --- START GAME ---
function startGame() {
    // Check for empty teams?? User might want uneven teams.
    const emptyTeam = state.currentGame.teams.find(t => t.playerIds.length === 0);
    if (emptyTeam && !confirm(`L'équipe "${emptyTeam.name}" est vide. Continuer ?`)) return;

    const nameInput = document.getElementById('game-name-input').value.trim();
    state.currentGame.name = nameInput || `Jeu #${state.history.length + 1}`;
    document.getElementById('current-game-title').innerText = state.currentGame.name;

    const liveContainer = document.getElementById('live-teams-display');
    liveContainer.innerHTML = state.currentGame.teams.map(t => `
        <div class="team-preview">
            <strong>${t.name}</strong> : <br>
            ${t.playerIds.map(pid => {
        const p = state.players.find(x => x.id === pid);
        return p ? `<span style="display:inline-block; margin:2px 5px">${p.avatar} ${p.name}</span>` : '';
    }).join('')}
        </div>
    `).join('');

    saveState();
    showView('gameProgress');
}

function editHistoryGame(index) {
    const gameRecord = state.history[index];
    state.editingGameIndex = index;
    state.currentGame = { ...gameRecord }; // Deep clone needed ideally but shallow ok for single edit flow usually
    // Deep clone teams to avoid mutating history directly if cancelled? 
    // Simplified: we directly edit clones and save on validate.
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
            // If user is PP, hide the option
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

window.updatePPFinder = (select, teamId) => {
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
};

window.selectTeam = (btn, type, id) => {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    if (type === 'winner') scoringState.winnerId = id;
    if (type === 'second') scoringState.secondId = id;
};

window.setFound = (btn, teamId, found) => {
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
};

function validateScores() {
    console.log("Validating scores...");
    try {
        if (!scoringState.winnerId) return alert("Sélectionnez l'équipe gagnante !");

        const teams = state.currentGame.teams;
        let ppResults = {};
        let error = false;

        teams.forEach(team => {
            // Look up element
            const teamEl = document.getElementById(`pp-group-${team.id}`);
            // Skip empty teams
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

        saveState();
        state.currentGame = null;
        state.editingGameIndex = -1;

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

    // SAFEGUARDS FOR RULES
    const R = state.rules || { win: 3, second: 1, ppHidden: 5, ppFound: 2, finder: 1 };

    state.history.forEach(game => {
        const { teams, results } = game;
        const team = teams.find(t => t.playerIds.includes(playerId));
        if (!team) return;

        const teamId = team.id;

        // Team Pts
        if (teamId === results.winnerId) score += R.win;
        else if (teamId === results.secondId) score += R.second;

        // PP Pts
        const ppData = results.ppData[teamId];
        if (!ppData) return;

        const isWinningTeam = (teamId === results.winnerId);
        // Rule: If win, no PP bonus/malus for the PP itself
        if (!isWinningTeam) {
            if (ppData.ppId == playerId) {
                if (!ppData.found) score += R.ppHidden;
                else score += R.ppFound;
            }
            // Finder bonus IS applicable even if their team lost (common sense, or keep current rule)
            // User did not specify Finder rule for winning team, assumed constant.
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

    // Split Top 3 vs Rest
    const top3 = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    // PODIUM RENDER
    // Order visually for pyramid: #2, #1, #3
    let podiumHtml = '';
    if (top3.length > 0) {
        // Prepare slots (if less than 3 players, handle gracefully)
        const p1 = top3[0];
        const p2 = top3[1];
        const p3 = top3[2];

        // Rank 2 (Left)
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

        // Rank 1 (Center)
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

        // Rank 3 (Right)
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

    // LIST RENDER
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


// --- NAVIGATION ---
function showView(viewName) {
    if (!views[viewName]) {
        console.error(`View '${viewName}' not found`);
        return;
    }
    Object.values(views).forEach(el => el.classList.remove('active'));
    views[viewName].classList.add('active');
}

// ... (Rest of modal logic) ...

// --- RESET LOGIC ---
window.resetApp = function () {
    if (confirm("⚠️ Tout effacer et recommencer la soirée à zéro ?")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Helper to safely add listener
    const safeListen = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
        else console.warn(`Element ${id} not found for event ${event}`);
    };

    safeListen('new-game-btn', 'click', prepareNewGame);
    safeListen('quick-add-player-btn', 'click', quickAddPlayer);

    // Fix: Use currentTarget to ensure we get the button's dataset, not the inner span's
    document.querySelectorAll('.back-btn').forEach(b => {
        b.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            showView(target);
        });
    });

    safeListen('add-player-btn', 'click', addPlayer);
    safeListen('start-party-btn', 'click', startParty);

    const slider = document.getElementById('team-count-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            document.getElementById('team-count-val').innerText = e.target.value;
        });
    }

    safeListen('generate-teams-btn', 'click', () => {
        generateTeams(document.getElementById('team-count-slider').value);
    });
    safeListen('start-game-btn', 'click', startGame);
    safeListen('go-to-scoring-btn', 'click', () => prepareScoring(false));
    safeListen('validate-scores-btn', 'click', validateScores);
    safeListen('reset-app-btn', 'click', resetApp);
}

// --- UTILS ---
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
        state = JSON.parse(s);
        // Ensure v3 structure (history array)
        if (!state.history) state.history = [];
    }
}

// Start
init();
