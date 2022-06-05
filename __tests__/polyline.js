import { Polyline } from '../src/polyline';
import { Vector } from '../src/vector';

const p1 = new Polyline([
  {x: 1,   y: 3},
  {x: 2.5, y: 0},
  {x: 4,   y: 1},
  {x: 3,   y: 2},
]);

const p2 = new Polyline([
  {x: 1,   y: 3},
  {x: 2.5, y: 0},
  {x: 4,   y: 1},
  {x: 3,   y: 2},
  {x: 1,   y: 3},
]);

test('constructor, 1', () => {
  expect(p1.pts)
    .toStrictEqual([
      new Vector(1, 3),
      new Vector(2.5, 0),
      new Vector(4, 1),
      new Vector(3, 2),
    ]);
  expect([p1.xMin, p1.xMax, p1.yMin, p1.yMax, p1.x, p1.y])
    .toStrictEqual([1, 4, 0, 3, 2.5, 1.5]);
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

test('constructor, 2', () => {
  expect(p2.lineLength).toBeCloseTo(8.8072);
  expect(p2._step).toBeCloseTo(8.8072 / 5);
  expect(p2._intervals).toStrictEqual([0, 0, 1, 2, 3]);
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
  const {x, y} = p2.pointAt(p2.lineLength + 4.25549, true);
  expect(x).toBeCloseTo(3.25);
  expect(y).toBeCloseTo(0.5);
});
test('pointAt, 6', () => {
  const {x, y} = p2.pointAt(-p2.lineLength + 4.25549, true);
  expect(x).toBeCloseTo(3.25);
  expect(y).toBeCloseTo(0.5);
});
test('pointAt, 7', () => {
  const {x, y} = p2.pointAt(p2.lineLength);
  expect(x).toBeCloseTo(1);
  expect(y).toBeCloseTo(3);
});

test('walk, 1', () => {
  const pts = p1.walk(4).pts;
  const step = p1.lineLength / 3;
  const pt1 = p1.pointAt(step);
  const pt2 = p1.pointAt(2 * step);
  expect(pts.length).toBe(4);
  expect(pts[0].x).toBeCloseTo(1);
  expect(pts[0].y).toBeCloseTo(3);
  expect(pts[1].x).toBeCloseTo(pt1.x);
  expect(pts[1].y).toBeCloseTo(pt1.y);
  expect(pts[2].x).toBeCloseTo(pt2.x);
  expect(pts[2].y).toBeCloseTo(pt2.y);
  expect(pts[3].x).toBeCloseTo(3);
  expect(pts[3].y).toBeCloseTo(2);
});

test('pointAtFrac, 1', () => {
  const {x, y} = p1.pointAtFrac(4.25549 / p1.lineLength);
  expect(x).toBeCloseTo(3.25);
  expect(y).toBeCloseTo(0.5);
});
test('pointAtFrac, 2', () => {
  const {x, y} =
    p2.pointAtFrac((p2.lineLength + 4.25549) / p2.lineLength, true);
  expect(x).toBeCloseTo(3.25);
  expect(y).toBeCloseTo(0.5);
});
test('pointAtFrac, 3', () => {
  const {x, y} =
    p2.pointAtFrac((-p2.lineLength + 4.25549) / p2.lineLength, true);
  expect(x).toBeCloseTo(3.25);
  expect(y).toBeCloseTo(0.5);
});

test('pointNearest, 1', () => {
  const {point, param, scaProjec, dist} = p1.pointNearest({x: 0.5, y: 5.5});
  const {x, y} = point;
  expect(x).toBeCloseTo(1);
  expect(y).toBeCloseTo(3);
  expect(param).toBe(0);
  expect(scaProjec).toBeCloseTo(-2.4597);
  expect(dist).toBeCloseTo(2.5495);
});
test('pointNearest, 2', () => {
  const {point, param, scaProjec, dist} = p1.pointNearest({x: 2.8, y: 2});
  const {x, y} = point;
  expect(x).toBeCloseTo(3);
  expect(y).toBeCloseTo(2);
  expect(param).toBeCloseTo(p1.lineLength);
  expect(scaProjec).toBeCloseTo(1.5556);
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
  const {point, param, segIndex, dist} = p1.pointNearest({x: 4, y: 2});
  const {x, y} = point;
  expect(x).toBeCloseTo(3.5);
  expect(y).toBeCloseTo(1.5);
  expect(param).toBeCloseTo(p1.segLengthsCumu[2] + 0.5 * p1.segLengths.at(-1));
  expect(segIndex).toBe(2);
  expect(dist).toBeCloseTo(0.7071);
});