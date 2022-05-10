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
import { Simulation } from '../src/simulation';
import { Actor } from '../src/actor';

test('shuffle, 1', () => {
  random.seed(0.5);
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

test('roughlyEqual, 1', () => {
  expect(roughlyEqual(5, 5.0001)).toBe(false);
});
test('roughlyEqual, 2', () => {
  expect(roughlyEqual(5, 5 + 1e-12)).toBe(true);
});

test('assertAgentType, 1', () => {
  expect(assertAgentType('actor')).toBe(undefined);
});
test('assertAgentType, 2', () => {
  expect(() => assertAgentType('Actor')).toThrow('invalid agent type');
});

test('isIterable, 1', () => {
  expect(isIterable([4, 5])).toBe(true);
});
test('isIterable, 2', () => {
  expect(isIterable({u: 4, v: 5})).toBe(false);
});

test('randomElement, 1', () => {
  random.seed(0.5);
  const a = [];
  for (let i = 0; i < 100; i++) a[i] = i * 10;
  expect(randomElement(a)).toBe(730);
});

test('randomPointInCircle, 1', () => {
  random.seed(0.5);
  const p = randomPointInCircle(1, -2, 3);
  const v = [ p.x.toFixed(3), p.y.toFixed(3) ];
  expect(v).toStrictEqual(['0.153', '-0.844']);
});

test('getIndexLimits, 1', () => {
  expect(getIndexLimits([2, 5, 1, 7]))
    .toStrictEqual([2, 5, 1, 7]);
});

test('getIndexLimits, 2', () => {
  expect(getIndexLimits({
    yMinIndex: 1, yMaxIndex: 7, xMinIndex: 2, xMaxIndex: 5
  })).toStrictEqual([2, 5, 1, 7]);
});

test('getOverlapping, 1', () => {
  const sim = new Simulation({width: 100, height: 100, gridStep: 10});
  const a = [
    new Actor({x: 80, y: 10, radius:  3, state: { index: 0 }}).addTo(sim),
    new Actor({x: 60, y: 70, radius: 10, state: { index: 1 }}).addTo(sim),
    new Actor({x: 15, y: 35, radius: 20, state: { index: 2 }}).addTo(sim),
    new Actor({x:  0, y:  0, radius: 12, state: { index: 3 }}).addTo(sim)
  ];
  const squaresRow1 = sim.squares.filter(sq => sq.yIndex === 1);
  const indices = [...getOverlapping(squaresRow1, 'actor', a[2])]
    .map(sq => sq.state.index)
    .sort((a, b) => a - b);
  expect(indices).toStrictEqual([0, 3]);
});

// !! NOT FINISHED !!