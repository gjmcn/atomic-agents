import { circle, rect } from './test-helpers';
import {
  neighborsFrom,
  nearestFrom,
  overlappingFrom,
  withinFrom,
  centroidWithinFrom,
  enclosingFrom,
  enclosingCentroidFrom
} from '../src/from-functions';

const c1 = circle(1, 1, 1);
const c2 = circle(2, 4, 0.5);
const c3 = circle(3.5, 4, 1.25);

const r1 = rect(4, 5, 1, 4);
const r2 = rect(2, 5, 1, 2);
const r3 = rect(1, 3, 4, 6);

const all = [c1, c2, c3, r1, r2, r3];
function split(target) {
  const others = new Set(all);
  others.delete(target);
  return [target, others];
}

test('neighborsFrom, 1', () => {
  const [target, others] = split(c3);
  expect(neighborsFrom(target, 1, others))
    .toStrictEqual([c2, r1, r2, r3])
});
test('neighborsFrom, 2', () => {
  const [target, others] = split(r2)
  expect(neighborsFrom(target, 0.5, others))
    .toStrictEqual([c1, r1])
});

test('nearestFrom, 1', () => {
  const [target, others] = split(c1);
  expect(nearestFrom(target, 3, others))
    .toStrictEqual([r2, c3, c2])
});
test('nearestFrom, 2', () => {
  expect(nearestFrom(r3, 2, [c1, c2, r1, r2]))
    .toStrictEqual([c2, r1])
});

test('overlappingFrom, 1', () => {
  const [target, others] = split(c3);
  expect(overlappingFrom(target, others))
    .toStrictEqual([c2, r1, r3])
});
test('overlappingFrom, 2', () => {
  const [target, others] = split(r1);
  expect(overlappingFrom(target, others))
    .toStrictEqual([c3, r2])
});

test('withinFrom, 1', () => {
  expect(withinFrom(circle(2.9, 4.1, 0.05), all))
    .toStrictEqual([c3, r3])
});
test('withinFrom, 2', () => {
  expect(withinFrom(rect(2.9, 2.95, 4.05, 4.1), all))
    .toStrictEqual([c3, r3])
});

test('centroidWithinFrom, 1', () => {
  const [target, others] = split(c2);
  expect(centroidWithinFrom(target, others))
    .toStrictEqual([r3])
});
test('centroidWithinFrom, 2', () => {
  expect(centroidWithinFrom(rect(0.8, 0.9, 1.1, 1.2), all))
    .toStrictEqual([c1])
});

test('enclosingFrom, 1', () => {
  expect(enclosingFrom(circle(3.5, 1.5, 2), all))
    .toStrictEqual([r2])
});
test('enclosingFrom, 2', () => {
  expect(enclosingFrom(rect(0, 5, 0, 2), all))
    .toStrictEqual([c1, r2])
});

test('enclosingCentroidFrom, 1', () => {
  expect(enclosingCentroidFrom(circle(2, 5, 1.25), all))
    .toStrictEqual([c2, r3])
});
test('enclosingCentroidFrom, 2', () => {
  expect(enclosingCentroidFrom(rect(1.5, 2.5, 3, 6), all))
    .toStrictEqual([c2, r3])
});