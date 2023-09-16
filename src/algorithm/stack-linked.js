const createNode = (value) => ({
    value,
    next: null,
});

export const createStack = () => {
    let top = null;
    let count = 0;

    const push = (value) => {
        const node = createNode(value);
        if (top) {
            node.next = top;
        }
        top = node;
        count++;
    };

    const pop = () => {
        if (isEmpty()) {
            return 'Underflow';
        }
        const value = top.value;
        top = top.next;
        count--;
        return value;
    };

    const peek = () => {
        if (isEmpty()) {
            return 'Underflow';
        }
        return top.value;
    };

    const isEmpty = () => count === 0;

    const size = () => count;

    const clear = () => {
        top = null;
        count = 0;
    };

    const toString = () => {
        let str = '';
        let current = top;
        while (current) {
            str += current.value + ' ';
            current = current.next;
        }
        return str.trim();
    };

    return {
        push,
        pop,
        peek,
        isEmpty,
        size,
        clear,
        toString,
    };
};


