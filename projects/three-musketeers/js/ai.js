// Port of com.threemusketeers.ai.* — alpha-beta search over the rules engine.

import { MUSKETEER, GUARD, IN_PROGRESS, MUSKETEERS_WIN, GUARDS_WIN, legalMovesFor } from "./model.js";

function alignmentProgress(positions) {
    const rowCounts = new Map();
    const colCounts = new Map();
    for (const p of positions) {
        rowCounts.set(p.row, (rowCounts.get(p.row) || 0) + 1);
        colCounts.set(p.col, (colCounts.get(p.col) || 0) + 1);
    }
    const maxRow = Math.max(...rowCounts.values());
    const maxCol = Math.max(...colCounts.values());
    return maxRow + maxCol;
}

const GUARD_ALIGNMENT_WEIGHT = 10.0;
const GUARD_SURVIVAL_WEIGHT = 0.5;

/**
 * Enemies win by forcing all 3 Musketeers into the same row or column, and
 * lose their only lever (adjacency) if too many of them get captured.
 */
function evaluateForGuard(state) {
    const board = state.board;
    const musketeers = board.positionsOf(MUSKETEER);
    const alignment = alignmentProgress(musketeers);
    const enemyCount = board.positionsOf(GUARD).length;
    return GUARD_ALIGNMENT_WEIGHT * alignment + GUARD_SURVIVAL_WEIGHT * enemyCount;
}

const MUSKETEER_ALIGNMENT_WEIGHT = 10.0;
const MUSKETEER_MOBILITY_WEIGHT = 1.0;
const MUSKETEER_ENEMY_COUNT_WEIGHT = 0.3;

/**
 * Musketeers must avoid ending up all in the same row/column, while chipping
 * away at Enemies (their only legal moves are captures) toward the state
 * where no Enemy remains adjacent to any of them.
 */
function evaluateForMusketeer(state) {
    const board = state.board;
    const musketeers = board.positionsOf(MUSKETEER);
    const alignment = alignmentProgress(musketeers);
    const captureOptions = legalMovesFor(board, MUSKETEER).length;
    const enemyCount = board.positionsOf(GUARD).length;
    return (
        -MUSKETEER_ALIGNMENT_WEIGHT * alignment +
        MUSKETEER_MOBILITY_WEIGHT * captureOptions -
        MUSKETEER_ENEMY_COUNT_WEIGHT * enemyCount
    );
}

const EPSILON = 1e-9;
const WIN_SCORE = 100000;

/**
 * Alpha-beta search that always maximizes the evaluator for a single fixed
 * side (aiSide), whichever ply is currently on move.
 */
class Minimax {
    constructor(evaluator, aiSide, maxDepth) {
        this.evaluator = evaluator;
        this.aiSide = aiSide;
        this.maxDepth = maxDepth;
    }

    findBestMove(state) {
        const moves = legalMovesFor(state.board, state.sideToMove);
        if (moves.length === 0) {
            throw new Error(`No legal moves available for ${state.sideToMove}`);
        }

        let bestScore = -Infinity;
        let bestMoves = [];
        for (const move of moves) {
            const next = state.copy();
            next.applyMove(move);
            const score = this.search(next, this.maxDepth - 1, -Infinity, Infinity);
            if (score > bestScore + EPSILON) {
                bestScore = score;
                bestMoves = [move];
            } else if (Math.abs(score - bestScore) <= EPSILON) {
                bestMoves.push(move);
            }
        }
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    search(state, depthRemaining, alpha, beta) {
        if (state.status !== IN_PROGRESS) {
            return this.terminalScore(state.status, depthRemaining);
        }
        if (depthRemaining === 0) {
            return this.evaluator(state);
        }

        const moves = legalMovesFor(state.board, state.sideToMove);
        const maximizing = state.sideToMove === this.aiSide;

        let best = maximizing ? -Infinity : Infinity;
        for (const move of moves) {
            const next = state.copy();
            next.applyMove(move);
            const score = this.search(next, depthRemaining - 1, alpha, beta);
            if (maximizing) {
                best = Math.max(best, score);
                alpha = Math.max(alpha, best);
            } else {
                best = Math.min(best, score);
                beta = Math.min(beta, best);
            }
            if (alpha >= beta) {
                break;
            }
        }
        return best;
    }

    terminalScore(status, depthRemaining) {
        const aiWins =
            (status === MUSKETEERS_WIN && this.aiSide === MUSKETEER) ||
            (status === GUARDS_WIN && this.aiSide === GUARD);
        const magnitude = WIN_SCORE + depthRemaining;
        return aiWins ? magnitude : -magnitude;
    }
}

export const DEFAULT_DEPTH = 3;

export class AiPlayer {
    constructor(side, depth = DEFAULT_DEPTH) {
        const evaluator = side === GUARD ? evaluateForGuard : evaluateForMusketeer;
        this.minimax = new Minimax(evaluator, side, depth);
    }

    chooseMove(state) {
        return this.minimax.findBestMove(state);
    }
}
