// Port of com.threemusketeers.model.* — rules engine, no rendering concerns.

export const SIZE = 5;

export const MUSKETEER = "MUSKETEER";
export const GUARD = "GUARD";

export function opposite(side) {
    return side === MUSKETEER ? GUARD : MUSKETEER;
}

export const IN_PROGRESS = "IN_PROGRESS";
export const MUSKETEERS_WIN = "MUSKETEERS_WIN";
export const GUARDS_WIN = "GUARDS_WIN";

export function isOnBoard(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

export function orthogonalNeighbors(row, col) {
    const deltas = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ];
    const result = [];
    for (const [dr, dc] of deltas) {
        const r = row + dr;
        const c = col + dc;
        if (isOnBoard(r, c)) {
            result.push({ row: r, col: c });
        }
    }
    return result;
}

export function samePos(a, b) {
    return a.row === b.row && a.col === b.col;
}

const MUSKETEER_START = [
    [1, 2],
    [3, 1],
    [3, 3],
];

export class Board {
    constructor(grid) {
        this.grid = grid;
    }

    /**
     * The traditional 5x5 starting position: 3 Musketeers, 22 Enemies, and no
     * empty squares. Musketeers move first and can only move by capturing an
     * adjacent Enemy, so every square being occupied at the start is
     * intentional.
     */
    static initial() {
        const grid = [];
        for (let r = 0; r < SIZE; r++) {
            grid.push(new Array(SIZE).fill(GUARD));
        }
        for (const [r, c] of MUSKETEER_START) {
            grid[r][c] = MUSKETEER;
        }
        return new Board(grid);
    }

    /** Builds a board from an arbitrary layout, e.g. for test/debug positions. */
    static custom(layout) {
        return new Board(layout.map((row) => row.slice()));
    }

    at(row, col) {
        return this.grid[row][col];
    }

    isEmpty(row, col) {
        return this.grid[row][col] === null;
    }

    /** Moves the piece at (fromRow, fromCol) to (toRow, toCol), capturing whatever was there. */
    move(fromRow, fromCol, toRow, toCol) {
        const piece = this.grid[fromRow][fromCol];
        this.grid[fromRow][fromCol] = null;
        this.grid[toRow][toCol] = piece;
    }

    positionsOf(type) {
        const result = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (this.grid[r][c] === type) {
                    result.push({ row: r, col: c });
                }
            }
        }
        return result;
    }

    copy() {
        return new Board(this.grid.map((row) => row.slice()));
    }
}

/**
 * Musketeers and Enemies move differently: a Musketeer's only legal move is
 * capturing an orthogonally-adjacent Enemy (stepping onto its square); an
 * Enemy's only legal move is sliding onto an orthogonally-adjacent empty
 * square. Enemies can never capture a Musketeer.
 */
export function legalDestinations(board, from) {
    const mover = board.at(from.row, from.col);
    const destinations = [];
    if (mover === null) {
        return destinations;
    }
    for (const neighbor of orthogonalNeighbors(from.row, from.col)) {
        if (mover === MUSKETEER) {
            if (board.at(neighbor.row, neighbor.col) === GUARD) {
                destinations.push(neighbor);
            }
        } else {
            if (board.isEmpty(neighbor.row, neighbor.col)) {
                destinations.push(neighbor);
            }
        }
    }
    return destinations;
}

export function legalMovesFor(board, side) {
    const moves = [];
    for (const from of board.positionsOf(side)) {
        for (const to of legalDestinations(board, from)) {
            moves.push({ from, to });
        }
    }
    return moves;
}

/** Enemies win the moment all 3 Musketeers share the same row or column. */
export function isMusketeersAligned(board) {
    const musketeers = board.positionsOf(MUSKETEER);
    const rows = new Set(musketeers.map((p) => p.row));
    const cols = new Set(musketeers.map((p) => p.col));
    return rows.size === 1 || cols.size === 1;
}

/**
 * Alignment (an Enemy win) is checked first, since the Musketeer win
 * condition explicitly requires the Musketeers to NOT be aligned - the two
 * conditions are mutually exclusive by construction.
 */
export function evaluateStatus(board, sideToMove) {
    if (isMusketeersAligned(board)) {
        return GUARDS_WIN;
    }
    if (sideToMove === MUSKETEER && legalMovesFor(board, MUSKETEER).length === 0) {
        return MUSKETEERS_WIN;
    }
    return IN_PROGRESS;
}

export class GameState {
    constructor(board, sideToMove) {
        this.board = board;
        this.sideToMove = sideToMove;
        this.status = evaluateStatus(board, sideToMove);
    }

    static newGame() {
        return new GameState(Board.initial(), MUSKETEER);
    }

    applyMove(move) {
        if (this.status !== IN_PROGRESS) {
            throw new Error(`Cannot move: game has already ended (${this.status})`);
        }
        const mover = this.board.at(move.from.row, move.from.col);
        if (mover !== this.sideToMove) {
            throw new Error(`It is not ${this.sideToMove}'s turn, or that square is not their piece`);
        }
        const destinations = legalDestinations(this.board, move.from);
        if (!destinations.some((d) => samePos(d, move.to))) {
            throw new Error(`Illegal move: ${JSON.stringify(move)}`);
        }
        this.board.move(move.from.row, move.from.col, move.to.row, move.to.col);
        this.sideToMove = opposite(this.sideToMove);
        this.status = evaluateStatus(this.board, this.sideToMove);
    }

    copy() {
        const copy = new GameState(this.board.copy(), this.sideToMove);
        copy.status = this.status;
        return copy;
    }
}
