import { centroidWithin } from '../src/centroid-within';

function circle(x, y, radius) {
  return {_shape: 'circle', x, y, radius};
}

function rect(xMin, xMax, yMin, yMax) {
  return {
    _shape: 'rect',
    xMin,
    xMax,
    yMin,
    yMax,
    x: (xMin + xMax) / 2,
    y: (yMin + yMax) / 2
  };
}

const c1 = circle(4, 3, 2);
const c2 = circle(4.5, 3.5, 0.5);

const r1 = rect(2, 7, 1, 6);
const r2 = rect(3, 6, 2, 5);
const r3 = rect(4, 5, 2, 3);

test('c2, c1: centroidWithin', () => { expect(centroidWithin(c2, c1)).toBe(true) });
test('c1, c2: centroidWithin', () => { expect(centroidWithin(c1, c2)).toBe(false) });

test('r2, r1: centroidWithin', () => { expect(centroidWithin(r2, r1)).toBe(true) });
test('r1, r2: centroidWithin', () => { expect(centroidWithin(r1, r2)).toBe(true) });
test('r1, r3: centroidWithin', () => { expect(centroidWithin(r1, r3)).toBe(false) });
test('r2, r2: centroidWithin', () => { expect(centroidWithin(r2, r2)).toBe(true) });

test('c1, r2: centroidWithin', () => { expect(centroidWithin(c1, r2)).toBe(true) });
test('c2, r3: centroidWithin', () => { expect(centroidWithin(c2, r3)).toBe(false) });
test('r3, c1: centroidWithin', () => { expect(centroidWithin(r3, c1)).toBe(true) });
test('r3, c2: centroidWithin', () => { expect(centroidWithin(r3, c2)).toBe(false) });