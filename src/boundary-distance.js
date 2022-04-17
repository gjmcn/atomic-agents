////////////////////////////////////////////////////////////////////////////////
// Boundary-to-boundary distance function.
////////////////////////////////////////////////////////////////////////////////

import { centroidDistance } from './centroid-distance.js';

export function boundaryDistance(u, v) {
  return Math.max(distanceFunctions[u._shape][v._shape](u, v), 0);
}

const distanceFunctions = {

  circle: {

    circle(c1, c2) {
      return centroidDistance(c1, c2) - c1.radius - c2.radius;
    },

    rect(c, r) {
      let xDist, yDist;
      if (c.x < r.xMin)      xDist = r.xMin - c.x;
      else if (c.x > r.xMax) xDist = c.x - r.xMax;
      else                   xDist = 0;
      if (c.y < r.yMin)      yDist = r.yMin - c.y;
      else if (c.y > r.yMax) yDist = c.y - r.yMax;
      else                   yDist = 0;
      return (xDist
        ? (yDist ? Math.sqrt(xDist ** 2 + yDist ** 2) : xDist)
        : yDist
      ) - c.radius;
    }

  },

  rect: {

    circle(r, c) {
      return distanceFunctions.circle.rect(c, r);
    },

    rect(r1, r2) {
      let xDist, yDist;
      if      (r1.xMax < r2.xMin) xDist = r2.xMin - r1.xMax;  // r1 on left
      else if (r1.xMin > r2.xMax) xDist = r1.xMin - r2.xMax;  // r1 on right
      else                        xDist = 0;                  // x overlap
      if      (r1.yMax < r2.yMin) yDist = r2.yMin - r1.yMax;  // r1 above
      else if (r1.yMin > r2.yMax) yDist = r1.yMin - r2.yMax;  // r1 below
      else                        yDist = 0;                  // y overlap
      return xDist
        ? (yDist ? Math.sqrt(xDist ** 2 + yDist ** 2) : xDist)
        : yDist;
    }

  }

};

