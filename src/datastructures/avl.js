const createAVLTree = () => {
    const createNode = (value) => ({ value, height: 1, left: null, right: null });

    const height = (node) => node ? node.height : 0;
    const balanceFactor = (node) => height(node.left) - height(node.right);
    const updateHeight = (node) => {
        node.height = 1 + Math.max(height(node.left), height(node.right));
    };

    const rotateRight = (y) => {
        const x = y.left;
        const T2 = x.right;
        x.right = y;
        y.left = T2;
        updateHeight(y);
        updateHeight(x);
        return x;
    };

    const rotateLeft = (x) => {
        const y = x.right;
        const T2 = y.left;
        y.left = x;
        x.right = T2;
        updateHeight(x);
        updateHeight(y);
        return y;
    };

    const balance = (node) => {
        updateHeight(node);
        const bf = balanceFactor(node);
        if (bf > 1) {
            return balanceFactor(node.left) < 0
                ? rotateRight({ ...node, left: rotateLeft(node.left) })
                : rotateRight(node);
        }
        if (bf < -1) {
            return balanceFactor(node.right) > 0
                ? rotateLeft({ ...node, right: rotateRight(node.right) })
                : rotateLeft(node);
        }
        return node;
    };

    const insert = (node, value) => {
        if (!node) return createNode(value);
        if (value < node.value) node.left = insert(node.left, value);
        else if (value > node.value) node.right = insert(node.right, value);
        else return node;
        return balance(node);
    };

    const findMin = (node) => node.left ? findMin(node.left) : node;

    const remove = (node, value) => {
        if (!node) return null;
        if (value < node.value) node.left = remove(node.left, value);
        else if (value > node.value) node.right = remove(node.right, value);
        else {
            if (!node.left || !node.right) {
                return node.left || node.right;
            }
            const temp = findMin(node.right);
            node.value = temp.value;
            node.right = remove(node.right, temp.value);
        }
        return balance(node);
    };

    let root = null;

    return {
        insert: (value) => { root = insert(root, value); },
        remove: (value) => { root = remove(root, value); },
        getRoot: () => root
    };
};
