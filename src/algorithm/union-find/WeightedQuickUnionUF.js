export const WeightedUnionFind = (size) => {
    // Initialize two arrays:
    // 'id' stores the parent of each element (initially, each element is its own parent)
    // 'sz' stores the size of each tree (initially, each tree has size 1)
    const id = [...Array(size)].map((_, i) => i);
    const sz = Array(size).fill(1);

    // Find the root of an element with path compression
    const root = (i) => {
        while (i !== id[i]) {
            id[i] = id[id[i]]; // Path compression: make every other node in path point to its grandparent
            i = id[i];
        }
        return i;
    };

    // Check if two elements are in the same set (connected)
    const connected = (p, q) => root(p) === root(q);

    // Unite two sets by linking the roots
    const union = (p, q) => {
        const i = root(p);
        const j = root(q);
        if (i === j) return; // If already in the same set, do nothing

        // Weighted union: attach smaller tree to root of larger tree
        sz[i] < sz[j]
            ? (id[i] = j, sz[j] += sz[i]) // If i's tree is smaller, link i to j
            : (id[j] = i, sz[i] += sz[j]); // If j's tree is smaller (or equal), link j to i
    };

    // Return public methods
    return { connected, union };
};