import {operators, constants, methods, operation} from './postfix';
import {createStack} from "../datastructures/stack";


const infixToPostfixBuilder = () => {

    const isSymbol = token => token in operators;
    const isOperator = token => token in operation;
    const isMethod = token => token in methods;
    const isConstant = token => token in constants;
    const isNumber = token => /(\d+\.\d*)|(\d*\.\d+)|(\d+)/.test(token);
    const isOpenParenthesis = token => token === '(';
    const isCloseParenthesis = token => token === ')';
    const isComma = token => token === ',';
    const isWhitespace = token => /\s/.test(token);
    const isVariable = token => !isMethod(token) && /[A-Za-z]+/.test(token);

    const operatorStack = createStack();
    const postfixExpression = [];
    const argumentStack = createStack();

    const postfixExpr = [];
    const createToken = (type, value, extra = {}) => ({type, value, ...extra});


    const tokenize = (expression) => {
        const pattern = /(\d+\.\d*)|(\d*\.\d+)|(\d+)|([a-zA-Z0-9_]+)|(.)/g;

        const infixExpression = (expression.match(pattern) || [])
            .filter((token) => !isWhitespace(token))
            .map((token) => token.toUpperCase());

        console.log(infixExpression.join(' '));
        return infixExpression;
    }

    const isUnaryOperator = (currentToken, previousToken) => {
        return [
            () => previousToken === undefined,
            isOpenParenthesis,
            isSymbol,
            isComma
        ].some(func => func(previousToken));
    }

    const isBinaryOperator = (currentToken, previousToken) => {
        return [
            isCloseParenthesis,
            isNumber,
            isConstant
        ].some(func => func(previousToken));
    }

    function hasPrecedence(currentOperatorName) {
        const topToken = operatorStack.peek();

        // If the top token is not an operator, it does not have precedence.
        if (!isOperator(topToken)) return false;

        /* use ES6 destructuring */
        // Fetch the precedence and associativity of the top operator.
        const {precedence: topPrecedence, associativity: topAssociativity} = operation[topToken];

        // Fetch the precedence of the current operator.
        const {precedence: currentPrecedence} = operation[currentOperatorName];

        // Check if the top operator has higher precedence, or equal precedence with left associativity
        // For right associativity, the condition will return false when precedences are equal.
        return topPrecedence > currentPrecedence ||
            (topPrecedence === currentPrecedence && topAssociativity === 'left');
    }

    const popUntil = (stack, conditionFunc) => {
        while (!conditionFunc(stack.peek())) {
            stack.pop();
        }
    };

    const handlers = {

        comma: {
            check: isComma,
            handle: () => {
                popUntil(operatorStack, isOpenParenthesis)
                argumentStack.push(argumentStack.pop() + 1);
            }
        },
        method: {
            // if the token is a function push the token onto the stack
            check: isMethod,
            handle: token => {
                operatorStack.push(token);
            }
        },
        constant: {
            // If the token is an operand output the token
            check: isConstant,
            handle: token => {
                postfixExpression.push(token);
                postfixExpr.push(createToken("number", parseFloat(token)));
            }
        },
        variable: {
            check: isVariable,
            handle: token => {
                postfixExpression.push(token);
                //postfixExpr.push(createToken("number", parseFloat(token))); perform variable lookup
            }
        },
        number: {
            /* If the token is an operand output the token */
            check: isNumber,
            handle: token => {
                postfixExpression.push(parseFloat(token));
                postfixExpr.push(createToken("number", parseFloat(token)));
            }
        },
        openParenthesis: {
            check: isOpenParenthesis,
            handle: token => {

                // If the top of the stack contains a function:
                // Push a 1 on to the argument stack
                if (isMethod(operatorStack.peek()))
                    argumentStack.push(1);

                operatorStack.push(token);
            }
        },
        closedParenthesis: {
            check: isCloseParenthesis,
            handle: () => {

                // Pop any operators off the stack and output
                // them until an open parenthesis is on the top of the stack.
                while (!isOpenParenthesis(operatorStack.peek())) {
                    postfixExpression.push(operatorStack.pop());
                }

                // Pop and discard the open parenthesis.
                operatorStack.pop();

                // If the top of the stack contains a function:
                // - 1) Pop and output the top of the argument stack
                // - 2) Pop and output the function on the stack
                if (isMethod(operatorStack.peek())) {
                    postfixExpression.push(argumentStack.pop());
                    postfixExpression.push(operatorStack.pop());
                }
            }
        },
        unaryOperator: {
            // rule: If the token is a prefix unary operator -> Push the operator on to stack
            check: isUnaryOperator,
            handle: token => operatorStack.push(operators[token]['prefix']['name'])
        },
        binaryOperator: {
            check: isBinaryOperator,
            handle: token => {

                const operatorName = operators[token]?.['infix']?.name || operators[token]?.name;

                // Move operators to postfix expression until the top operator has lesser precedence
                // or is right associative with the same precedence.
                while (hasPrecedence(operatorName)) {
                    postfixExpression.push(operatorStack.pop());
                }

                // Push the current operator onto the operator stack.
                // If the operator is right associative and has the same precedence as the top operator,
                // it will be pushed without popping the top operator.
                operatorStack.push(operatorName)
            }
        }
    };

    const toPostfix = (infixExpression) => {

        infixExpression.forEach((token, index) => {

            //console.log("looking at " + token);
            for (let key in handlers) {
                if (handlers[key].check(token, infixExpression[index - 1])) {
                    //console.log("matched " + key);
                    handlers[key].handle(token);
                    break;
                }
            }
        });

        while (!operatorStack.isEmpty()) {
            postfixExpression.push(operatorStack.pop())
        }

        return postfixExpression;
    }

    return {
        tokenize,
        toPostfix
    }
}

const parser = infixToPostfixBuilder();
const infix = parser.tokenize("sin(x) + cos(x)^2 * 3");
console.log()
console.log(parser.toPostfix(infix).toString());









