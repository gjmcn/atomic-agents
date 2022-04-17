import { within } from '../src/within';

function circle(x, y, radius) {
  return {_shape: 'circle', x, y, radius};
}

function rect(xMin, xMax, yMin, yMax) {
  return {_shape: 'rect', xMin, xMax, yMin, yMax};
}

const c1 = circle(4, 3, 2);
const c2 = circle(4.5, 3.5, 1);

const r1 = rect(2, 7, 1, 6);
const r2 = rect(3, 6, 2, 5);
const r3 = rect(4, 5, 2, 3);

test('c2, c1: within', () => { expect(within(c2, c1)).toBe(true) });
test('c1, c2: within', () => { expect(within(c1, c2)).toBe(false) });

test('r2, r1: within', () => { expect(within(r2, r1)).toBe(true) });
test('r1, r2: within', () => { expect(within(r1, r2)).toBe(false) });
test('r3, r2: within', () => { expect(within(r3, r2)).toBe(true) });
test('r2, r2: within', () => { expect(within(r2, r2)).toBe(true) });

test('c2, r2: within', () => { expect(within(c2, r2)).toBe(true) });
test('c1, r2: within', () => { expect(within(c1, r2)).toBe(false) });
test('r3, c1: within', () => { expect(within(r3, c1)).toBe(true) });
test('r2, c1: within', () => { expect(within(r2, c1)).toBe(false) });