////////////////////////////////////////////////////////////////////////////////
// Within function - returns true if first argument is within second.
////////////////////////////////////////////////////////////////////////////////

import { centroidDistance } from './centroid-distance.js';

export function within(u, v) {
  return withinFunctions[u._shape][v._shape](u, v);
}

const withinFunctions = {

  circle: {

    circle(c1, c2) {
      return centroidDistance(c1, c2) + c1.radius <= c2.radius;
    },

    rect(c, r) {
      return c.x - c.radius >= r.xMin &&
             c.x + c.radius <= r.xMax &&
             c.y - c.radius >= r.yMin &&
             c.y + c.radius <= r.yMax;
    }

  },

  rect: {

    circle(r, c) {
      return Math.max((r.xMax - c.x) ** 2, (r.xMin - c.x) ** 2) + 
             Math.max((r.yMax - c.y) ** 2, (r.yMin - c.y) ** 2)
              <= c.radius ** 2;
    },

    rect(r1, r2) {  // check opposite corners of r1 are both in r2
      return r1.xMin >= r2.xMin &&
             r1.xMin <= r2.xMax &&
             r1.yMin >= r2.yMin &&
             r1.yMin <= r2.yMax &&
             r1.xMax >= r2.xMin &&
             r1.xMax <= r2.xMax &&
             r1.yMax >= r2.yMin &&
             r1.yMax <= r2.yMax;
    }
    
  }

};

