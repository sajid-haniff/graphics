// main.js
import { createCSP } from './csp.js';

const data = {
    "WA": ["ID", "OR"],
    "DE": ["MD", "NJ", "PA"],
    "DC": ["MD", "VA"],
    "WI": ["IA", "IL", "MI", "MN"],
    "WV": ["KY", "MD", "OH", "PA", "VA"],
    "FL": ["AL", "GA"],
    "WY": ["CO", "ID", "MT", "NE", "SD", "UT"],
    "NH": ["MA", "ME", "VT"],
    "NJ": ["DE", "NY", "PA"],
    "NM": ["AZ", "CO", "OK", "TX", "UT"],
    "TX": ["AR", "LA", "NM", "OK"],
    "LA": ["AR", "MS", "TX"],
    "NC": ["GA", "SC", "TN", "VA"],
    "ND": ["MN", "MT", "SD"],
    "NE": ["CO", "IA", "KS", "MO", "SD", "WY"],
    "TN": ["AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA"],
    "NY": ["CT", "MA", "NJ", "PA", "VT"],
    "PA": ["DE", "MD", "NJ", "NY", "OH", "WV"],
    "RI": ["CT", "MA"],
    "NV": ["AZ", "CA", "ID", "OR", "UT"],
    "VA": ["DC", "KY", "MD", "NC", "TN", "WV"],
    "CO": ["AZ", "KS", "NE", "NM", "OK", "UT", "WY"],
    "CA": ["AZ", "NV", "OR"],
    "AL": ["FL", "GA", "MS", "TN"],
    "AR": ["LA", "MO", "MS", "OK", "TN", "TX"],
    "VT": ["MA", "NH", "NY"],
    "IL": ["IA", "IN", "KY", "MO", "WI"],
    "GA": ["AL", "FL", "NC", "SC", "TN"],
    "IN": ["IL", "KY", "MI", "OH"],
    "IA": ["MN", "MO", "NE", "SD", "WI", "IL"],
    "MA": ["CT", "NH", "NY", "RI", "VT"],
    "AZ": ["CA", "CO", "NM", "NV", "UT"],
    "ID": ["MT", "NV", "OR", "UT", "WA", "WY"],
    "CT": ["MA", "NY", "RI"],
    "ME": ["NH"],
    "MD": ["DC", "DE", "PA", "VA", "WV"],
    "OK": ["AR", "CO", "KS", "MO", "NM", "TX"],
    "OH": ["IN", "KY", "MI", "PA", "WV"],
    "UT": ["AZ", "CO", "ID", "NM", "NV", "WY"],
    "MO": ["AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN"],
    "MN": ["IA", "ND", "SD", "WI"],
    "MI": ["IN", "OH", "WI"],
    "KS": ["CO", "MO", "NE", "OK"],
    "MT": ["ID", "ND", "SD", "WY"],
    "MS": ["AL", "AR", "LA", "TN"],
    "SC": ["GA", "NC"],
    "KY": ["IL", "IN", "MO", "OH", "TN", "VA", "WV"],
    "OR": ["CA", "ID", "NV", "WA"],
    "SD": ["IA", "MN", "MT", "ND", "NE", "WY"],
    "HI": [],
    "AK": []
};

// Initialize variables and constraints
const variables = {};
const constraints = [];

// Function to check inequality
const neq = (s1, s2) => s1 !== s2;

// Populate variables and constraints
Object.keys(data).forEach(state => {
    variables[state] = ['red', 'yellow', 'green', 'blue'];
    data[state].forEach(neighbor => {
        constraints.push([state, neighbor, neq]);
    });
});


// refactor
/*
const variables = Object.fromEntries(
    Object.keys(data).map(state => [state, colors])
);

const constraints = Object.entries(data).flatMap(([state, neighbors]) =>
    neighbors.map(neighbor => [state, neighbor, neq])
);
*/

// CSP problem definition
const csp = createCSP();
const us = { variables, constraints };

// Solve the CSP
const result = csp.solve(us);

// Validate the result
const valid = Object.keys(data).every(state =>
    data[state].every(neighbor => result[state] !== result[neighbor])
);

// Determine the status and log the result
const status = (result === 'FAILURE' || !valid) ? 'FAILURE' : 'SUCCESS';
console.log('\n***************');
console.log(`    ${status}`);
console.log('***************');
console.log(JSON.stringify(result, null, 2));
console.log('\n');
