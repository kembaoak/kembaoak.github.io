// Port of com.threemusketeers.ui.* — DOM board rendering + game controller.

import { GameState, MUSKETEER, GUARD, IN_PROGRESS, MUSKETEERS_WIN, legalDestinations, samePos } from "./model.js";
import { AiPlayer } from "./ai.js";

const MUSKETEER_ICON = "🤺";
const ENEMY_ICON = "🪖";
const SIZE = 5;

const boardEl = document.getElementById("board");
const statusLabel = document.getElementById("status-label");
const newGameButton = document.getElementById("new-game-button");

const newGameModal = document.getElementById("new-game-modal");
const sideFieldset = document.getElementById("side-fieldset");
const startGameButton = document.getElementById("start-game-button");

const gameOverModal = document.getElementById("game-over-modal");
const gameOverHeading = document.getElementById("game-over-heading");
const gameOverText = document.getElementById("game-over-text");
const gameOverNewGameButton = document.getElementById("game-over-new-game-button");
const gameOverCloseButton = document.getElementById("game-over-close-button");

let gameState = null;
let selected = null;
let aiPlayers = {};
let aiThinking = false;

const cells = [];

function buildBoard() {
    boardEl.innerHTML = "";
    for (let row = 0; row < SIZE; row++) {
        const rowCells = [];
        for (let col = 0; col < SIZE; col++) {
            const cell = document.createElement("div");
            cell.className = "cell " + ((row + col) % 2 === 0 ? "cell-light" : "cell-dark");

            const token = document.createElement("div");
            token.className = "piece-token";
            token.style.display = "none";
            cell.appendChild(token);

            cell.addEventListener("mouseenter", () => cell.classList.add("hover"));
            cell.addEventListener("mouseleave", () => cell.classList.remove("hover"));
            cell.addEventListener("click", () => onCellClicked({ row, col }));

            boardEl.appendChild(cell);
            rowCells.push({ cell, token });
        }
        cells.push(rowCells);
    }
}

function renderBoard() {
    const board = gameState.board;
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const { cell, token } = cells[row][col];
            const piece = board.at(row, col);
            cell.classList.remove("selected", "legal-destination");
            if (piece === null) {
                token.style.display = "none";
            } else {
                token.style.display = "flex";
                token.className = "piece-token " + (piece === MUSKETEER ? "musketeer" : "enemy");
                token.textContent = piece === MUSKETEER ? MUSKETEER_ICON : ENEMY_ICON;
            }
        }
    }
    if (selected) {
        cells[selected.row][selected.col].cell.classList.add("selected");
        for (const dest of legalDestinations(board, selected)) {
            cells[dest.row][dest.col].cell.classList.add("legal-destination");
        }
    }
    updateClickability();
}

function updateClickability() {
    const humanTurn = gameState.status === IN_PROGRESS && !aiPlayers[gameState.sideToMove] && !aiThinking;
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            cells[row][col].cell.classList.toggle("clickable", humanTurn);
        }
    }
}

function updateStatusLabel() {
    if (gameState.status !== IN_PROGRESS) {
        const winner = gameState.status === MUSKETEERS_WIN ? "Musketeers" : "Enemies";
        statusLabel.textContent = `${winner} win!`;
        return;
    }
    const sideName = gameState.sideToMove === MUSKETEER ? "Musketeers" : "Enemies";
    const isAiTurn = !!aiPlayers[gameState.sideToMove];
    statusLabel.textContent = isAiTurn ? `${sideName} (AI) is thinking...` : `${sideName}'s turn`;
}

function onCellClicked(pos) {
    if (!gameState || aiThinking || gameState.status !== IN_PROGRESS) {
        return;
    }
    if (aiPlayers[gameState.sideToMove]) {
        return;
    }

    const board = gameState.board;
    const clicked = board.at(pos.row, pos.col);

    if (!selected) {
        if (clicked === gameState.sideToMove) {
            selected = pos;
            renderBoard();
        }
        return;
    }
    if (samePos(pos, selected)) {
        selected = null;
        renderBoard();
        return;
    }
    if (clicked === gameState.sideToMove) {
        selected = pos;
        renderBoard();
        return;
    }

    const destinations = legalDestinations(board, selected);
    if (destinations.some((d) => samePos(d, pos))) {
        applyMove({ from: selected, to: pos });
    }
}

function applyMove(move) {
    gameState.applyMove(move);
    selected = null;
    renderBoard();
    updateStatusLabel();
    checkGameOver();
    maybeTriggerAiMove();
}

function maybeTriggerAiMove() {
    if (gameState.status !== IN_PROGRESS) {
        return;
    }
    const aiPlayer = aiPlayers[gameState.sideToMove];
    if (!aiPlayer) {
        return;
    }

    aiThinking = true;
    updateStatusLabel();
    updateClickability();

    // Let the "thinking" label paint before running the (synchronous) search.
    setTimeout(() => {
        const move = aiPlayer.chooseMove(gameState);
        aiThinking = false;
        applyMove(move);
    }, 30);
}

function checkGameOver() {
    if (gameState.status === IN_PROGRESS) {
        return;
    }
    const musketeersWin = gameState.status === MUSKETEERS_WIN;
    gameOverHeading.textContent = (musketeersWin ? "Musketeers" : "Enemies") + " win!";
    gameOverText.textContent = musketeersWin
        ? "The Musketeers cleared their surroundings without ever lining up in a row or column."
        : "The Enemies forced all three Musketeers into the same row or column.";
    gameOverModal.classList.add("open");
}

function startNewGame() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    aiPlayers = {};
    if (mode === "human-vs-ai") {
        const humanSide = document.querySelector('input[name="side"]:checked').value;
        const aiSide = humanSide === MUSKETEER ? GUARD : MUSKETEER;
        aiPlayers[aiSide] = new AiPlayer(aiSide);
    }

    gameState = GameState.newGame();
    selected = null;
    aiThinking = false;

    newGameModal.classList.remove("open");
    gameOverModal.classList.remove("open");

    renderBoard();
    updateStatusLabel();
    maybeTriggerAiMove();
}

document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
        const isAi = document.querySelector('input[name="mode"]:checked').value === "human-vs-ai";
        sideFieldset.disabled = !isAi;
    });
});

newGameButton.addEventListener("click", () => newGameModal.classList.add("open"));
startGameButton.addEventListener("click", startNewGame);
gameOverNewGameButton.addEventListener("click", () => newGameModal.classList.add("open"));
gameOverCloseButton.addEventListener("click", () => gameOverModal.classList.remove("open"));

buildBoard();
newGameModal.classList.add("open");
