let players = [];
let currentPlayerIndex = 0;
let gameActive = false;
let editModeCell = null;
let winners = [];
let nextPlace = 1;

const MAX_VISIBLE_ROUNDS = 5;

const playerColors = [
    "#e6194b", "#3cb44b", "#f032e6", "#ffe119",
    "#4363d8", "#f58231", "#911eb4", "#46f0f0"
];

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("startGameBtn").addEventListener("click", startGame);
    document.getElementById("keypad").addEventListener("click", handleKeypadClick);
    document.getElementById("undoBtn").addEventListener("click", undoLast);

    const addPlayerBtn = document.getElementById("addPlayerBtn");
    const playersListEl = document.getElementById("playersList");
    addPlayerBtn.addEventListener("click", () => {
        if (playersListEl.children.length >= 8) return;
        addPlayerRow();
    });

    document.getElementById("randomizeOrderBtn").addEventListener("click", randomizeOrder);
    document.getElementById("endGameBtn").addEventListener("click", endGame);
});

function assignPlayerColor(playerIndex) {
    return playerColors[playerIndex % playerColors.length];
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function randomizeOrder() {
    const playersListEl = document.getElementById("playersList");
    const rows = [...playersListEl.children];
    shuffleArray(rows);
    rows.forEach(row => playersListEl.appendChild(row));
    renumberPlaceholders();
}

function addPlayerRow(name = "") {
    const playersListEl = document.getElementById("playersList");
    const row = document.createElement("div");
    const color = assignPlayerColor(playersListEl.children.length);

    row.className = "player-row";
    row.innerHTML = `
        <input type="text" placeholder="Name" value="${name}" aria-label="Player name" maxlength="8"/>
        <div class="order-buttons">
            <button class="btn" data-dir="up" title="Move up">▲</button>
            <button class="btn" data-dir="down" title="Move down">▼</button>
        </div>
        <button class="btn remove-btn" title="Remove">✖</button>
    `;

    // Move up/down
    row.querySelectorAll(".order-buttons .btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const dir = btn.dataset.dir;
            const rows = [...playersListEl.children];
            const idx = rows.indexOf(row);
            if (dir === "up" && idx > 0) playersListEl.insertBefore(row, rows[idx - 1]);
            if (dir === "down" && idx < rows.length - 1) playersListEl.insertBefore(rows[idx + 1], row.nextSibling);
            renumberPlaceholders();
        });
    });

    // Remove
    row.querySelector(".remove-btn").addEventListener("click", () => {
        row.remove();
        renumberPlaceholders();
    });

    playersListEl.appendChild(row);
    renumberPlaceholders();
}

function renumberPlaceholders() {
    document.querySelectorAll(".player-row input[type='text']").forEach((inp, i) => {
        if (!inp.value) inp.placeholder = `Player ${i + 1}`;
    });
}

function startGame(e) {
    e.preventDefault();
    const nameInputs = document.querySelectorAll("#playersList input[type='text']");
    players = [];
    nameInputs.forEach((input, index) => {
        const name = input.value.trim() || `Player ${index + 1}`;
        const color = assignPlayerColor(index);
        players.push({
            name,
            color,
            scores: [],
            total: 0,
            misses: 0,
            eliminated: false,
        });
    });

    currentPlayerIndex = 0;
    gameActive = true;
    winners = [];
    nextPlace = 1;
    renderScoreboard();
    initKeypad();
    document.getElementById("setup").style.display = "none";
    document.getElementById("game").style.display = "block";
    document.getElementById("appFooter").style.display = "none";
}

function getCurrentRoundIndex() {
    return Math.max(...players.map(p => p.scores.length - 1), 0);
}

function recalcTotals() {
    players.forEach((p, index) => {
        p.total = 0;
        p.misses = 0;
        p.eliminated = false;

        let missStreak = 0;
        for (const s of p.scores) {
            if (s === "X") {
                missStreak++;
                if (missStreak >= 3) p.eliminated = true;
            } else if (typeof s === "number") {
                missStreak = 0;
                p.total += s;
                if (p.total > 50) p.total = 25;
            }
        }

        if (p.total >= 50 && !winners.find(w => w.playerIndex === index)) {
            winners.push({
                playerIndex: index,
                name: p.name,
                total: p.total,
                place: nextPlace++
            });
        }

        // Update winner/loser
        const activePlayers = players.filter((p, i) =>
            !p.eliminated && !winners.find(w => w.playerIndex === i)
        );

        if (activePlayers.length === 1 && gameActive) {
            gameActive = false;
            // Push the last remaining player as loser/final placer
            const last = activePlayers[0];
            winners.push({ playerIndex: players.indexOf(last), name: last.name, total: last.total, place: nextPlace++ });
            showFinalResults();
        }
    });

    renderScoreboard();
}

function showFinalResults() {
    let message = "Game Over!\n\nFinal Results:\n";
    winners
        .sort((a, b) => a.place - b.place)
        .forEach(w => {
            message += `${w.place}. ${w.name} (${w.total} points)\n`;
        });
    alert(message);

    document.getElementById("setup").style.display = "block";
    document.getElementById("game").style.display = "none";
    document.getElementById("appFooter").style.display = "block";
}

function renderScoreboard() {
    const container = document.getElementById("scoreTable");
    container.innerHTML = "";

    const numRounds = Math.max(...players.map(p => p.scores.length), 0);

    // Header
    const headerRow = document.createElement("div");
    headerRow.className = "score-row header-row";
    const roundHeader = document.createElement("div");
    roundHeader.className = "round-header";
    roundHeader.textContent = "#";
    headerRow.appendChild(roundHeader);
    players.forEach(p => {
        const ph = document.createElement("div");
        ph.className = "player-name-header";
        ph.textContent = `${p.name}${p.eliminated ? " (Out)" : ""}`;
        ph.style.backgroundColor = p.color;
        headerRow.appendChild(ph);
    });
    container.appendChild(headerRow);

    // Rounds
    const startRound = Math.max(numRounds - MAX_VISIBLE_ROUNDS, 0);
    for (let ri = startRound; ri < numRounds; ri++) {
        const rowEl = document.createElement("div");
        rowEl.className = "score-row round";

        const roundNumberEl = document.createElement("div");
        roundNumberEl.className = "round-number";
        roundNumberEl.textContent = ri + 1;
        rowEl.appendChild(roundNumberEl);

        players.forEach((player, pi) => {
            const cell = document.createElement("div");
            cell.className = "score-cell";
            if (pi === currentPlayerIndex && !player.eliminated) cell.classList.add("current-player");
            cell.textContent = player.scores[ri] ?? "-";
            cell.dataset.playerIndex = pi;
            cell.dataset.roundIndex = ri;
            cell.addEventListener("click", () => enterEditMode(cell));
            rowEl.appendChild(cell);
        });

        container.appendChild(rowEl);
    }

    // Totals
    const totalRow = document.createElement("div");
    totalRow.className = "score-row total-row";
    const totalLabel = document.createElement("div");
    totalLabel.textContent = "Total";
    totalRow.appendChild(totalLabel);
    players.forEach(p => {
        const totalCell = document.createElement("div");
        totalCell.className = "total-cell";
        totalCell.textContent = p.total;
        totalRow.appendChild(totalCell);
    });
    container.appendChild(totalRow);
}

function nextTurn() {
    if (!gameActive) return;

    let nextIndex = (currentPlayerIndex + 1) % players.length;
    let tries = 0;

    while ((players[nextIndex].eliminated || winners.find(w => w.playerIndex === nextIndex)) && tries < players.length) {
        nextIndex = (nextIndex + 1) % players.length;
        tries++;
    }

    currentPlayerIndex = nextIndex;

    // If back to first player, add new round
    if (currentPlayerIndex === 0) {
        players.forEach(p => p.scores.push("-"));
    }

    renderScoreboard();
}

function undoLast() {
    let found = false;
    for (let ri = getCurrentRoundIndex(); ri >= 0 && !found; ri--) {
        for (let pi = players.length - 1; pi >= 0; pi--) {
            const val = players[pi].scores[ri];
            if (val !== "-" && val !== undefined) {
                players[pi].scores[ri] = "-";
                currentPlayerIndex = pi;
                found = true;
                break;
            }
        }
    }

    // Remove trailing empty rounds
    let maxRound = Math.max(...players.map(p => p.scores.length - 1));
    while (maxRound >= 0) {
        const isEmpty = players.every(p => p.scores[maxRound] === "-");
        if (!isEmpty) break;
        players.forEach(p => p.scores.pop());
        maxRound--;
    }

    recalcTotals();
}

function initKeypad() {
    const keypad = document.getElementById("keypad");
    keypad.innerHTML = "";
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = "key";
        btn.dataset.value = i;
        keypad.appendChild(btn);
    }
    const missBtn = document.createElement("button");
    missBtn.textContent = "X";
    missBtn.className = "key";
    missBtn.id = "missBtn";
    missBtn.dataset.value = "X";
    keypad.appendChild(missBtn);
}

function handleKeypadClick(e) {
    if (!e.target.classList.contains("key")) return;
    const value = e.target.dataset.value;
    if (!gameActive) return;

    if (editModeCell) {
        const ri = parseInt(editModeCell.dataset.roundIndex);
        const pi = parseInt(editModeCell.dataset.playerIndex);
        players[pi].scores[ri] = value === "X" ? "X" : parseInt(value);
        exitEditMode();
    } else {
        const roundIndex = getCurrentRoundIndex();
        players.forEach(p => {
            if (p.scores.length <= roundIndex) p.scores.push("-");
        });

        const player = players[currentPlayerIndex];
        player.scores[roundIndex] = value === "X" ? "X" : parseInt(value);
        nextTurn();
    }

    recalcTotals();
}

function enterEditMode(cell) {
    exitEditMode();
    editModeCell = cell;
    cell.classList.add("editing");
}

function exitEditMode() {
    if (editModeCell) editModeCell.classList.remove("editing");
    editModeCell = null;
}

function endGame() {
    if (!gameActive) return;
    const confirmEnd = window.confirm("Are you sure you want to end the game?");
    if (!confirmEnd) return;
    gameActive = false;

    // Add remaining active players into results
    players.forEach((p, i) => {
        if (!winners.find(w => w.playerIndex === i)) {
            winners.push({ playerIndex: i, name: p.name, total: p.total, place: nextPlace++ });
        }
    });

    document.getElementById("setup").style.display = "block";
    document.getElementById("game").style.display = "none";
    document.getElementById("appFooter").style.display = "block";
}
