import { Polyline } from '../src/polyline';
import { Vector } from '../src/vector';

const p1 = new Polyline([
  {x: 1,   y: 3},
  {x: 2.5, y: 0},
  {x: 4,   y: 1},
  {x: 3,   y: 2},
], false);

test('constructor, 1', () => {
  expect(p1.pts)
    .toStrictEqual([
      new Vector(1, 3),
      new Vector(2.5, 0),
      new Vector(4, 1),
      new Vector(3, 2),
    ]);
  expect(p1.segs)
    .toStrictEqual([
      new Vector(1.5, -3),
      new Vector(1.5, 1),
      new Vector(-1, 1),
    ]);
  expect(p1.segLengths.map(v => Number(v.toFixed(2))))
    .toStrictEqual([3.35, 1.80, 1.41]);
  expect(p1.segLengthsCumu.map(v => Number(v.toFixed(2))))
    .toStrictEqual([0.00, 3.35, 5.16, 6.57]);
  expect(Number(p1.lineLength.toFixed(2))).toBe(6.57);
});

test('pointAt, 1', () => {
  const {x, y} = p1.pointAt(0);
  expect(x).toBeCloseTo(1);
  expect(y).toBeCloseTo(3);
});
test('pointAt, 2', () => {
  const {x, y} = p1.pointAt(7);
  expect(x).toBeCloseTo(3);
  expect(y).toBeCloseTo(2);
})
;test('pointAt, 3', () => {
  const {x, y} = p1.pointAt(p1.segLengths[0]);
  expect(x).toBeCloseTo(2.5);
  expect(y).toBeCloseTo(0);
});
test('pointAt, 4', () => {
  const {x, y} = p1.pointAt(4.25549);
  expect(x).toBeCloseTo(3.25);
  expect(y).toBeCloseTo(0.5);
});
test('pointAt, 5', () => {
  const {x, y} = p1.pointAt(4.25549, 1);
  expect(x).toBeCloseTo(3.25);
  expect(y).toBeCloseTo(0.5);
});

test('pointNearest, 1', () => {
  const {point, param, dist} = p1.pointNearest({x: 0.5, y: 5.5});
  const {x, y} = point;
  expect(x).toBeCloseTo(1);
  expect(y).toBeCloseTo(3);
  expect(param).toBe(0);
  expect(dist).toBeCloseTo(2.5495);
});
test('pointNearest, 2', () => {
  const {point, param, dist} = p1.pointNearest({x: 2.8, y: 2});
  const {x, y} = point;
  expect(x).toBeCloseTo(3);
  expect(y).toBeCloseTo(2);
  expect(param).toBeCloseTo(p1.lineLength);
  expect(dist).toBeCloseTo(0.2);
});
test('pointNearest, 3', () => {
  const {point, param, dist} = p1.pointNearest({x: 4.5, y: 0.5});
  const {x, y} = point;
  expect(x).toBeCloseTo(4);
  expect(y).toBeCloseTo(1);
  expect(param).toBeCloseTo(p1.segLengthsCumu[2]);
  expect(dist).toBeCloseTo(0.7071);
});
test('pointNearest, 4', () => {
  const {point, param, dist} = p1.pointNearest({x: 4, y: 2});
  const {x, y} = point;
  expect(x).toBeCloseTo(3.5);
  expect(y).toBeCloseTo(1.5);
  expect(param).toBeCloseTo(p1.segLengthsCumu[2] + 0.5 * p1.segLengths.at(-1));
  expect(dist).toBeCloseTo(0.7071);
});