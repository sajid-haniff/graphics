const createNode = (value, left = null, right = null) => ({ value, left, right });

const createBinarySearchTree = () => {
    let root = null;

    const insert = (value, node = root) => {
        if (!root) return root = createNode(value);
        if (value < node.value) {
            node.left = node.left ? insert(value, node.left) : createNode(value);
        } else {
            node.right = node.right ? insert(value, node.right) : createNode(value);
        }
        return node;
    };

    const find = (value, node = root) => {
        if (!node) return null;
        if (value === node.value) return node;
        return find(value, value < node.value ? node.left : node.right);
    };

    const contains = (value) => !!find(value);

    const findMin = (node = root) => (node.left ? findMin(node.left) : node.value);

    const findMax = (node = root) => (node.right ? findMax(node.right) : node.value);

    const deleteNode = (value, node = root) => {
        if (!node) return null;
        if (value < node.value) {
            node.left = deleteNode(value, node.left);
        } else if (value > node.value) {
            node.right = deleteNode(value, node.right);
        } else {
            if (!node.left) return node.right;
            if (!node.right) return node.left;
            let minRight = findMin(node.right);
            node.value = minRight;
            node.right = deleteNode(minRight, node.right);
        }
        return node;
    };

    const printTree = (node = root, indent = "") => {
        if (node) {
            console.log(indent + node.value);
            printTree(node.left, indent + "  ");
            printTree(node.right, indent + "  ");
        }
    };

    return { insert, find, contains, findMin, findMax, delete: deleteNode, printTree };
};

// usage
const bst = createBinarySearchTree();
bst.insert(10);
bst.insert(6);
bst.insert(15);
bst.insert(3);
bst.insert(8);
bst.insert(20);
console.log(bst.findMin()); // 3
console.log(bst.findMax()); // 20
console.log(bst.contains(15)); // true
console.log(bst.contains(100)); // false
bst.printTree();
bst.delete(15);
console.log(bst.contains(15)); // false
bst.printTree();
