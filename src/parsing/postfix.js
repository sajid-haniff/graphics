export const constants = {
    'E': Math.E,
    'LN2': Math.LN2,
    'LN10': Math.LN10,
    'LOG2E': Math.LOG2E,
    'LOG10E': Math.LOG10E,
    'PHI': (1 + Math.sqrt(5)) / 2,
    'PI': Math.PI,
    'SQRT1_2': Math.SQRT1_2,
    'SQRT2': Math.SQRT2,
    'TAU': 2 * Math.PI,
};

export const methods = {
    'COS': (x) => Math.abs(x),
    'SIN': (x) => Math.acos(x),
    'POW': (x, y) => x ** y,
    'MAX': (...args) => Math.max(...args)
};

export const operators = {
    '^': {
        name: '_POW',
        precedence: 4,
        associativity: 'right',
        method: (x, y) => x ** y
    },
    '*': {
        name: '_MUL',
        precedence: 2,
        associativity: 'left',
        method: (x, y) => x * y
    },
    '/': {
        name: '_DIV',
        precedence: 2,
        associativity: 'left',
        method: (x, y) => x / y
    },
    '%': {
        name: '_MOD',
        precedence: 2,
        associativity: 'left',
        method: (x, y) => x % y
    },
    '+': {
        infix: {
            name: '_ADD',
            precedence: 1,
            associativity: 'left',
            method: (x, y) => x + y
        },
        prefix: {
            name: '_POS',
            precedence: 3,
            associativity: 'right',
            method: x => x
        }
    },
    '-': {
        infix: {
            name: '_SUB',
            precedence: 1,
            associativity: 'left',
            method: (x, y) => x - y
        },
        prefix: {
            name: '_NEG',
            precedence: 3,
            associativity: 'right',
            method: x => -x
        }
    }
};


export const operation = Object.entries(operators).reduce((acc, [key, value]) => {
    if (value.name) {
        acc[value.name] = value;
    } else if (value.infix || value.prefix) {
        if (value.infix) acc[value.infix.name] = value.infix;
        if (value.prefix) acc[value.prefix.name] = value.prefix;
    }
    return acc;
}, {});



