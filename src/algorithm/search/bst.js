const defaultCompare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

const Compare = {LESS_THAN: -1, BIGGER_THAN: 1};

const createNode = key => ({key, left: null, right: null});

export const createBinarySearchTree = (compareFn = defaultCompare) => {
    let root = null;

    const insertNode = (node, key) => {
        if (compareFn(key, node.key) === Compare.LESS_THAN) {
            node.left = node.left ? insertNode(node.left, key) : createNode(key);
        } else {
            node.right = node.right ? insertNode(node.right, key) : createNode(key);
        }
        return node;
    };

    const insert = key => {
        root = root ? insertNode(root, key) : createNode(key);
    };

    const searchNode = (node, key) => node === null ? false :
        compareFn(key, node.key) === Compare.LESS_THAN ? searchNode(node.left, key) :
            compareFn(key, node.key) === Compare.BIGGER_THAN ? searchNode(node.right, key) : true;

    const inOrderTraverseNode = (node, callback) => {
        if (node) {
            inOrderTraverseNode(node.left, callback);
            callback(node.key);
            inOrderTraverseNode(node.right, callback);
        }
    };

    const traverse = (callback, method) => {
        const actions = {
            'inOrder': n => inOrderTraverseNode(n, callback),
            'preOrder': n => {
                if (n) {
                    callback(n.key);
                    actions.preOrder(n.left);
                    actions.preOrder(n.right);
                }
            },
            'postOrder': n => {
                if (n) {
                    actions.postOrder(n.left);
                    actions.postOrder(n.right);
                    callback(n.key);
                }
            }
        };
        actions[method](root);
    };

    const findMinMax = (node, isMin) => {
        while (node && (isMin ? node.left : node.right)) {
            node = isMin ? node.left : node.right;
        }
        return node;
    };

    const min = () => findMinMax(root, true);
    const max = () => findMinMax(root, false);

    const removeNode = (node, key) => {
        if (!node) return null;
        if (compareFn(key, node.key) === Compare.LESS_THAN) {
            node.left = removeNode(node.left, key);
        } else if (compareFn(key, node.key) === Compare.BIGGER_THAN) {
            node.right = removeNode(node.right, key);
        } else {
            if (!node.left && !node.right) return null;
            if (!node.left) return node.right;
            if (!node.right) return node.left;
            const aux = findMinMax(node.right, true);
            node.key = aux.key;
            node.right = removeNode(node.right, aux.key);
        }
        return node;
    };

    const remove = key => {
        root = removeNode(root, key);
    };

    return {insert, search: key => searchNode(root, key), traverse, min, max, remove};
};


