export const editDistance = (source, target) => {
    const m = source.length, n = target.length;

    // Initialize DP table and backtrace table
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    const backtrace = Array.from({ length: m + 1 }, () => Array(n + 1).fill(null));

    // Fill base cases
    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
        backtrace[i][0] = { op: 'delete', from: [i - 1, 0] };
    }
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
        backtrace[0][j] = { op: 'insert', from: [0, j - 1] };
    }
    backtrace[0][0] = null; // No operation at the start

    // Fill DP table
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const costReplace = source[i - 1] === target[j - 1] ? 0 : 1;

            // Compute minimum cost operations
            const choices = {
                delete: { cost: dp[i - 1][j] + 1, from: [i - 1, j] },
                insert: { cost: dp[i][j - 1] + 1, from: [i, j - 1] },
                replace: { cost: dp[i - 1][j - 1] + costReplace, from: [i - 1, j - 1] }
            };

            // Select the minimum cost operation
            const { op, cost, from } = Object.entries(choices)
                .reduce((min, [op, value]) => value.cost < min.cost ? { op, ...value } : min,
                    { op: 'replace', ...choices.replace });

            dp[i][j] = cost;
            backtrace[i][j] = { op, from };
        }
    }

    // Backtrace to reconstruct the edit steps
    const edits = [];
    let [i, j] = [m, n];

    while (i > 0 || j > 0) {
        const { op, from } = backtrace[i][j];
        if (op !== 'replace' || source[i - 1] !== target[j - 1]) {
            edits.push({ op, fromChar: source[i - 1] || '', toChar: target[j - 1] || '', index: i - 1 });
        }
        [i, j] = from;
    }

    return { cost: dp[m][n], edits: edits.reverse() };
};


