# Edit Distance Algorithm with Backtracking

## Overview
The **Edit Distance (Levenshtein Distance)** algorithm calculates the minimum number of operations required to convert one string into another. The allowed operations are:
- **Insertion**: Add a character.
- **Deletion**: Remove a character.
- **Substitution**: Replace one character with another.

This implementation uses **dynamic programming (DP) with backtracking** to reconstruct the exact sequence of edits.

---

## Algorithm Steps

### **1. Define the Recurrence Relation**
The minimum edit distance `dp[i][j]` is computed based on three possible operations:

\[
dp(i, j) =
\begin{cases} 
    dp(i-1, j) + 1 & \text{(delete a character from source)} \\
    dp(i, j-1) + 1 & \text{(insert a character into source)} \\
    dp(i-1, j-1) + \text{cost} & \text{(replace if different, cost = 1; otherwise, 0)}
\end{cases}
\]

Where:
- `dp(i-1, j) + 1` → **Delete** the character `source[i-1]`.
- `dp(i, j-1) + 1` → **Insert** the character `target[j-1]`.
- `dp(i-1, j-1) + cost` → **Replace** `source[i-1]` with `target[j-1]` (**cost = 0** if they match, otherwise **1**).

**Base Cases:**
\[
dp(i, 0) = i, \quad dp(0, j) = j
\]
- If one string is empty, the cost is the length of the other string (all insertions or deletions).

---

### **2. Initialize the DP Table**
Create a `(m+1) x (n+1)` DP table, where `m` and `n` are the lengths of the source and target strings.
- `dp[i][j]` represents the minimum edit cost to transform `source[0..i]` into `target[0..j]`.

#### **Base Cases**
- If `source` is empty (`i == 0`), `dp[0][j] = j` (all insertions).
- If `target` is empty (`j == 0`), `dp[i][0] = i` (all deletions).

---

### **3. Fill the DP Table**
For each position `(i, j)`, compute the minimum cost using:

1. **Deletion:** `dp[i-1][j] + 1`
2. **Insertion:** `dp[i][j-1] + 1`
3. **Substitution:** `dp[i-1][j-1] + (1 if characters differ else 0)`

Store the **operation** (`insert`, `delete`, `replace`) in a backtrace table.

---

### **4. Backtrace to Reconstruct Edits**
Starting from `dp[m][n]`, follow the **backtrace pointers** to determine the exact sequence of edits.

- If `replace`, record a character substitution.
- If `delete`, record character removal.
- If `insert`, record character addition.

Reverse the edit sequence to get the correct order.

---

## Complexity Analysis
- **Time Complexity**: `O(m × n)`, where `m` and `n` are string lengths.
- **Space Complexity**: `O(m × n)` (DP table and backtrace matrix).

For large strings, a **space-optimized version** using only two rows can reduce space to `O(n)`, but backtracking would require additional logic.

---

## Example
**Input:** `"kitten"` → `"sitting"`

**Output:**
```json
{
  "cost": 3,
  "edits": [
    { "op": "replace", "fromChar": "k", "toChar": "s", "index": 0 },
    { "op": "insert", "fromChar": "", "toChar": "i", "index": 4 },
    { "op": "insert", "fromChar": "", "toChar": "g", "index": 6 }
  ]
}
```

### **Transformation Steps**
1. **Replace** `'k'` with `'s'` at index `0`
2. **Insert** `'i'` at index `4`
3. **Insert** `'g'` at index `6`

---

## Alternatives
| Method | Time Complexity | Space Complexity | Suitable For |
|--------|----------------|------------------|--------------|
| **Standard DP with backtracking** | `O(m × n)` | `O(m × n)` | Small to medium strings |
| **Space-optimized DP** | `O(m × n)` | `O(n)` | Large strings, but no direct backtracking |
| **Hirschberg’s Algorithm** | `O(m × n)` | `O(min(m, n))` | Large datasets with backtracking |
| **A* Search with DP** | `Varies` | `O(n)` | Sparse edit cases (few changes) |

For very large inputs, consider **Hirschberg’s Algorithm** to reduce space usage.

---

## Usage
This algorithm is widely used in:
- **Spell checkers**
- **DNA sequence alignment**
- **Chatbot NLP (natural language processing)**
- **Diff tools (file comparison)**

---

## References
- [Levenshtein Distance - Wikipedia](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Dynamic Programming - MIT OpenCourseWare](https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/6-006-introduction-to-algorithms-fall-2011/)
```

