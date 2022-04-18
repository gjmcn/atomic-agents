import { centroidDistance, centroidDistanceSqd }
  from '../src/centroid-distance';

const u = {x:  2, y:  6};
const v = {x: -1, y: 10};

test('centroidDistance', () => { 
  expect(centroidDistance(u, v)).toBe(5)
});

test('centroidDistanceSqd', () => { 
  expect(centroidDistanceSqd(u, v)).toBe(25)
});