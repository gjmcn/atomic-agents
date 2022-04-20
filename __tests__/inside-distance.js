import { circle, rect } from './test-helpers';
import { insideDistance } from '../src/inside-distance';

const c1 = circle(3, 6, 2);
const c2 = circle(2.5, 5.5, 0.5);
const c3 = circle(8, 5, 1);
const c4 = circle(7, 6, Math.SQRT2);

const r1 = rect(0, 6, 2, 9);

test('c2, c1: insideDistance', () => {
  expect(insideDistance(c2, c1))
    .toBeCloseTo(2 - 0.5 - Math.SQRT1_2)
});

test('c1, c2: insideDistance', () => {
  expect(insideDistance(c1, c2))
    .toBeCloseTo(-(2 + Math.SQRT1_2 - 0.5))
});

test('c3, c1: insideDistance', () => {
  expect(insideDistance(c3, c1))
    .toBeCloseTo(-(Math.sqrt(26) - 1))
});

test('c3, c4: insideDistance', () => {
  expect(insideDistance(c3, c4))
    .toBeCloseTo(-1)
});

test('c4, c3: insideDistance', () => {
  expect(insideDistance(c4, c3))
    .toBeCloseTo(-(2 * Math.SQRT2 - 1))
});

test('c1, r1: insideDistance', () => {
  expect(insideDistance(c1, r1))
    .toBeCloseTo(1)
});

test('c3, r1: insideDistance', () => {
  expect(insideDistance(c3, r1))
    .toBeCloseTo(-3)
});

test('c4, r1: insideDistance', () => {
  expect(insideDistance(c4, r1))
    .toBeCloseTo(-(1 + Math.SQRT2))
});