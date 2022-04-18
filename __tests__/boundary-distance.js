import { circle, rect } from './test-helpers';
import { boundaryDistance } from '../src/boundary-distance';

const c1 = circle(0.5, 0.5, 0.5);
const c2 = circle(3, 2, 1);
const c3 = circle(5, 3, 2);

const r1 = rect(3, 5, 1, 2);
const r2 = rect(0, 2, 4, 5);
const r3 = rect(1, 2, 3, 6);

// circle-circle
test('c1, c2: boundaryDistance', () => {
  expect(boundaryDistance(c1, c2))
    .toBeCloseTo(Math.sqrt(2.5 ** 2 + 1.5 ** 2) - 1.5)
});
test('c2, c1: boundaryDistance', () => {
  expect(boundaryDistance(c2, c1))
    .toBeCloseTo(Math.sqrt(2.5 ** 2 + 1.5 ** 2) - 1.5)
});
test('c2, c3: boundaryDistance', () => {
  expect(boundaryDistance(c2, c3))
    .toBe(0)
});

// rect-rect
test('r1, r2: boundaryDistance', () => {
  expect(boundaryDistance(r1, r2))
    .toBeCloseTo(Math.sqrt(5))
});
test('r2, r1: boundaryDistance', () => {
  expect(boundaryDistance(r2, r1))
    .toBeCloseTo(Math.sqrt(5))
});
test('r2, r3: boundaryDistance', () => {
  expect(boundaryDistance(r2, r3))
    .toBe(0)
});

// circle-rect
test('c2, r2: boundaryDistance', () => {
  expect(boundaryDistance(c2, r2))
    .toBeCloseTo(Math.sqrt(5) - 1)
});
test('r2, c2: boundaryDistance', () => {
  expect(boundaryDistance(r2, c2))
    .toBeCloseTo(Math.sqrt(5) - 1)
});
test('r1, c2: boundaryDistance', () => {
  expect(boundaryDistance(r1, c2))
    .toBe(0)
});