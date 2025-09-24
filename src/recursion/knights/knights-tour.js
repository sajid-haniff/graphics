// knight-tour.js

/**
 * Implements the recursive backtracking algorithm for the Knight's Tour.
 *
 * The knight visits every square of an N x N board exactly once.
 * We attempt all valid knight moves recursively. If we reach a dead end, we backtrack.
 *
 * @param {number} cols - Number of columns in the board
 * @param {number} rows - Number of rows in the board
 * @param {number} startX - Starting x position of the knight
 * @param {number} startY - Starting y position of the knight
 * @returns {Object} - { board, path } solution board and path of knight moves
 */
export const solveKnightsTour = (cols, rows, startX = 0, startY = 0) => {
    // Direction offsets for knight moves
    const moves = [
        [2, 1], [1, 2], [-1, 2], [-2, 1],
        [-2, -1], [-1, -2], [1, -2], [2, -1],
    ];

    // Initialize board with -1 (unvisited)
    const board = Array.from({ length: rows }, () => Array(cols).fill(-1));
    const path = [];

    /**
     * Recursive backtracking function.
     *
     * @param {number} x - Current x position
     * @param {number} y - Current y position
     * @param {number} moveIndex - Current move number (starts at 0)
     * @returns {boolean} - true if tour is complete, false if we must backtrack
     */
    const recurse = (x, y, moveIndex) => {
        board[y][x] = moveIndex;
        path.push([x, y]);

        // Base case: if all squares are visited
        if (moveIndex === cols * rows - 1) {
            return true;
        }

        // Try all possible knight moves from current position
        for (const [dx, dy] of moves) {
            const nx = x + dx;
            const ny = y + dy;

            const isValid =
                nx >= 0 && nx < cols &&
                ny >= 0 && ny < rows &&
                board[ny][nx] === -1;

            if (isValid) {
                if (recurse(nx, ny, moveIndex + 1)) return true;
            }
        }

        // Backtrack
        board[y][x] = -1;
        path.pop();
        return false;
    };

    recurse(startX, startY, 0);
    return { board, path };
};
