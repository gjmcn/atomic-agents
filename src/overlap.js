////////////////////////////////////////////////////////////////////////////////
// Overlap function.
////////////////////////////////////////////////////////////////////////////////

import { centroidDistanceSqd } from './centroid-distance.js';

export function overlap(u, v) {
  return overlapFunctions[u._shape][v._shape](u, v);
}

const overlapFunctions = {

  circle: {

    circle(c1, c2) {
      return centroidDistanceSqd(c1, c2) < (c1.radius + c2.radius) ** 2;
    },

    rect(c, r) {
      let testX, testY;
      if (c.x < r.xMin)      testX = r.xMin;
      else if (c.x > r.xMax) testX = r.xMax;
      else                   testX = c.x;
      if (c.y < r.yMin)      testY = r.yMin;
      else if (c.y > r.yMax) testY = r.yMax;
      else                   testY = c.y;
      return (c.x - testX) ** 2 + (c.y - testY) ** 2 < c.radius ** 2;
    }

  },

  rect: {

    circle(r, c) {
      return overlapFunctions.circle.rect(c, r);
    },

    rect(r1, r2) {
      return r1.xMax > r2.xMin &&
             r1.xMin < r2.xMax &&
             r1.yMax > r2.yMin &&
             r1.yMin < r2.yMax;
    }

  }

};