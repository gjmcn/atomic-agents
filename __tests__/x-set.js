import { XSet } from '../src/x-set';

test('copy', () => {
  expect(
    (new XSet([3, 4])).copy()
  ).toStrictEqual(new XSet([3, 4]))
});

test('adds', () => {
  expect(
    (new XSet([3, 4])).adds([5, 6])
  ).toStrictEqual(new XSet([3, 4, 5, 6]));
});

test('deletes', () => {
  expect(
    (new XSet([3, 4, 5, 6])).deletes([4, 6])
  ).toStrictEqual(new XSet([3, 5]));
});

test('filter', () => {
  expect(
    (new XSet([3, 4, 5])).filter(e => e !== 4)
  ).toStrictEqual(new XSet([3, 5]))
});

test('filter, return array', () => {
  expect(
    (new XSet([3, 4, 5])).filter(e => e !== 4, true)
  ).toStrictEqual([3, 5])
});

test('find', () => {
  expect(
    (new XSet([3, 4, 5])).find(e => e > 3)
  ).toBe(4)
});

test('every', () => {
  expect(
    (new XSet([3, 4, 5])).every(e => e > 3)
  ).toBe(false)
});

test('some', () => {
  expect(
    (new XSet([3, 4, 5])).some(e => e > 3)
  ).toBe(true)
});

test('first', () => {
  expect(
    (new XSet([3, 4, 5])).first()
  ).toBe(3)
});

test('difference', () => {
  expect(
    (new XSet([3, 4, 5, 6])).difference(new XSet([5, 3, 9]))
  ).toStrictEqual(new XSet([4, 6]))
});

test('intersection', () => {
  expect(
    (new XSet([3, 4, 5, 6])).intersection(new XSet([5, 3, 9]))
  ).toStrictEqual(new XSet([3, 5]))
});

test('union', () => {
  expect(
    (new XSet([3, 4, 5, 6])).union(new XSet([5, 3, 9]))
  ).toStrictEqual(new XSet([3, 4, 5, 6, 9]))
});