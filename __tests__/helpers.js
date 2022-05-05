import {
  shuffle,
  loop,
  bound,
  isPositiveInteger,
  isNonnegativeInteger,
  assertInteger,
  assertPositiveInteger,
  assertNonnegativeInteger,
  roughlyEqual,
  assertAgentType,
  isIterable,
  randomElement,
  randomPointInCircle,
  getIndexLimits,
  getOverlapping,
  moduloShift,
  normalizeAngle,
  getLayer,
  frame,
  gridInRect,
  gridInHex,
  partitionRect
} from '../src/helpers';

import { random } from '../src/random';
random.seed(0.5);

test('shuffle, 1', () => {
  expect(shuffle([51, 52, 53, 54, 55, 56, 57, 58, 59]))
    .toStrictEqual([56, 54, 58, 51, 55, 52, 53, 59, 57])
});

test('loop, 1', () => {
  const a = [];
  loop(3, i => a.push(10 * i));
  expect(a).toStrictEqual([0, 10, 20]);
});

test('bound, 1', () => {
  expect(bound(5, 3, 7)).toBe(5);
});
test('bound, 2', () => {
  expect(bound(1, 3, 7)).toBe(3);
});
test('bound, 3', () => {
  expect(bound(10, 3, 7)).toBe(7);
});

test('isPositiveInteger, 1', () => {
  expect(isPositiveInteger(3)).toBe(true);
});
test('isPositiveInteger, 2', () => {
  expect(isPositiveInteger('3')).toBe(false);
});
test('isPositiveInteger, 3', () => {
  expect(isPositiveInteger('-3')).toBe(false);
});
test('isPositiveInteger, 4', () => {
  expect(isPositiveInteger('3.1')).toBe(false);
});

test('isNonnegativeInteger, 1', () => {
  expect(isNonnegativeInteger(0)).toBe(true);
});
test('isNonnegativeInteger, 2', () => {
  expect(isNonnegativeInteger(3)).toBe(true);
});
test('isNonnegativeInteger, 3', () => {
  expect(isNonnegativeInteger('0')).toBe(false);
});
test('isNonnegativeInteger, 4', () => {
  expect(isNonnegativeInteger(-3)).toBe(false);
});
test('isNonnegativeInteger, 5', () => {
  expect(isNonnegativeInteger(3.1)).toBe(false);
});

test('assertInteger, 1', () => {
  expect(assertInteger(3, 'theValue')).toBe(undefined);
});
test('assertInteger, 2', () => {
  expect(() => assertInteger(3.1, 'theValue'))
    .toThrow('theValue must be an integer')
});

test('assertPositiveInteger, 1', () => {
  expect(assertPositiveInteger(3, 'theValue')).toBe(undefined);
});
test('assertPositiveInteger, 2', () => {
  expect(() => assertPositiveInteger(3.1, 'theValue'))
    .toThrow('theValue must be a positive integer')
});

test('assertNonnegativeInteger, 1', () => {
  expect(assertNonnegativeInteger(3, 'theValue')).toBe(undefined);
});
test('assertNonnegativeInteger, 2', () => {
  expect(() => assertNonnegativeInteger(3.1, 'theValue'))
    .toThrow('theValue must be a non-negative integer')
});

// !! NOT FINISHED !!
