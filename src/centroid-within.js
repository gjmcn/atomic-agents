////////////////////////////////////////////////////////////////////////////////
// Centroid within function - returns true if centroid of first argument is
// within second.
////////////////////////////////////////////////////////////////////////////////

import { centroidDistanceSqd } from './centroid-distance.js';

export function centroidWithin(u, v) {
  return centroidWithinFunctions[u._shape][v._shape](u, v);
}

const centroidWithinFunctions = {

  circle: {

    circle(c1, c2) {
      return centroidDistanceSqd(c1, c2) <= c2.radius ** 2;
    },

    rect(c, r) {
      return c.x >= r.xMin &&
             c.x <= r.xMax &&
             c.y >= r.yMin &&
             c.y <= r.yMax;
    }

  },

  rect: {

    circle(r, c) {
      return centroidDistanceSqd(r, c) <= c.radius ** 2;
    },

    rect(r1, r2) {
      return r1.x >= r2.xMin &&
             r1.x <= r2.xMax &&
             r1.y >= r2.yMin &&
             r1.y <= r2.yMax;
    }
    
  }

};