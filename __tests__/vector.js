////////////////////////////////////////////////////////////////////////////////
// At least one test for each method except randomAngle and randomPoint. 
////////////////////////////////////////////////////////////////////////////////

import { Vector } from '../src/vector';

test('from-object', () => {
  expect(Vector.fromObject({x:3, y: 4})).toStrictEqual(new Vector(3, 4))
});

test('from-array', () => {
  expect(Vector.fromArray([3, 4])).toStrictEqual(new Vector(3, 4))
});

test('fromPolar-x', () => {
  expect(Vector.fromPolar(5, 2.214297).x).toBeCloseTo(-3)
});

test('fromPolar-y', () => {
  expect(Vector.fromPolar(5, 2.214297).y).toBeCloseTo(4)
});

test('copy', () => {
  expect(
    (new Vector(3, 4)).copy()
  ).toStrictEqual(new Vector(3, 4))
});

test('set', () => {
  expect(
    (new Vector(3, 4)).set(10,20)
  ).toStrictEqual(new Vector(10, 20))
});

test('add', () => {
  expect(
    (new Vector(3, 4)).add(new Vector(10, 20))
  ).toStrictEqual(new Vector(13, 24))
});

test('add number', () => {
  expect(
    (new Vector(3, 4)).add(5)
  ).toStrictEqual(new Vector(8, 9))
});

test('sub', () => {
  expect(
    (new Vector(3, 4)).sub(new Vector(10, 20))
  ).toStrictEqual(new Vector(-7, -16))
});

test('sub number', () => {
  expect(
    (new Vector(3, 4)).sub(5)
  ).toStrictEqual(new Vector(-2, -1))
});

test('mult', () => {
  expect(
    (new Vector(3, 4)).mult(5)
  ).toStrictEqual(new Vector(15, 20))
});

test('div', () => {
  expect(
    (new Vector(8, 6)).div(2)
  ).toStrictEqual(new Vector(4, 3))
});

test('dot', () => {
  expect(
    (new Vector(3, 4)).dot(new Vector(10, 20))
  ).toBe(110)
});

test('mag', () => {
  expect(
    (new Vector(3, 4)).mag()
  ).toBe(5)
});

test('setMag', () => {
  expect(
    (new Vector(3, 4)).setMag(20)
  ).toStrictEqual(new Vector(12, 16))
});

test('normalize', () => {
  expect(
    (new Vector(3, 4)).normalize()
  ).toStrictEqual(new Vector(3/5, 4/5))
});

test('limit, no change', () => {
  expect(
    (new Vector(3, 4)).limit(10)
  ).toStrictEqual(new Vector(3, 4))
});

test('limit, change', () => {
  expect(
    (new Vector(9, 12)).limit(10)
  ).toStrictEqual(new Vector(6, 8))
});

test('distance', () => {
  expect(
    (new Vector(-1, 2)).distance(new Vector(2, -2))
  ).toBe(5)
});

test('heading', () => {
  expect(
    (new Vector(-3, 4)).heading()
  ).toBeCloseTo(2.214297)
});

test('setHeading-x', () => {
  expect(
    (new Vector(0, 5)).setHeading(2.214297).x
  ).toBeCloseTo(-3)
});

test('setHeading-y', () => {
  expect(
    (new Vector(0, 5)).setHeading(2.214297).y
  ).toBeCloseTo(4)
});

test('turn-x', () => {
  expect(
    (new Vector(0, 5)).turn(Math.PI / 4).x
  ).toBeCloseTo(-5 / Math.SQRT2);
});

test('turn-y', () => {
  expect(
    (new Vector(0, 5)).turn(Math.PI / 4).y
  ).toBeCloseTo(5 / Math.SQRT2);
});

test('direction', () => {
  expect(
    (new Vector(1, -5)).direction()
  ).toBe('up');
});

test('directionIndex', () => {
  expect(
    (new Vector(1, -5)).directionIndex()
  ).toBe(3);
});

test('getUnit', () => {
  expect(
    (new Vector(3, 4)).getUnit()
  ).toStrictEqual(new Vector(3/5, 4/5))
});

test('getUnitNormal', () => {
  expect(
    (new Vector(3, 4)).getUnitNormal()
  ).toStrictEqual(new Vector(-4/5, 3/5))
});

test('lerp', () => {
  expect(
    (new Vector(3, 4)).lerp(new Vector(11, 6), 0.5)
  ).toStrictEqual(new Vector(7, 5))
});

test('isZero', () => {
  expect(
    (new Vector(0, 0)).isZero()
  ).toBe(true)
});

test('vecProjec', () => {
  expect(
    (new Vector(1, 2)).vecProjec(new Vector(3, 4))
  ).toStrictEqual(new Vector(1.32, 1.76))
});

test('scaProjec', () => {
  expect(
    (new Vector(1, 2)).scaProjec(new Vector(3, 4))
  ).toBe(2.2)
});

test('vecRejec-x', () => {
  expect(
    (new Vector(1, 2)).vecRejec(new Vector(3, 4)).x
  ).toBeCloseTo(-0.32)
});

test('vecRejec-y', () => {
  expect(
    (new Vector(1, 2)).vecRejec(new Vector(3, 4)).y
    ).toBeCloseTo(0.24)
});

test('scaRejec', () => {
  expect(
    (new Vector(1, 2)).scaRejec(new Vector(3, 4))
  ).toBe(0.4)
});