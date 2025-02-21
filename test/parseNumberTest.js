// can't use import because of browser libs used
// import { parseNumber } from '../src/content.js';

// still bugged in node 9.3
// import { test } from 'node:test';

import assert from 'node:assert';


const isThousands = string => ['k', 'mil'].some(s => string?.includes(s));

const parseNumber = string => {
    string = string + '';
    let number = parseFloat((string + '').replace(',', '.').match(/[\d\.]+/g));
    number = isThousands(string) ? number * 1000 : number;
    return isNaN(number) ? 0 : number;
}

// test('parseNumber', () => {
    assert.equal(parseNumber('Đã bán 13,7k'), 13700);
    assert.equal(parseNumber('5,2mil vendidos'), 5200);
    assert.equal(parseNumber('20 sold'), 20);
    assert.equal(parseNumber(''), 0);
    assert.equal(parseNumber(null), 0);
    assert.equal(parseNumber(1), 1);
// })
