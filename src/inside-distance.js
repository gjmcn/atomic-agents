////////////////////////////////////////////////////////////////////////////////
// Inside boundary-to-boundary distance function: smallest distance between
// boundaries measured inwardly from the second argument - the 'distance' is
// negative if the first argument is not within the second.
//
// Currently only implemented for circular first argument.
////////////////////////////////////////////////////////////////////////////////

import { centroidDistance } from './centroid-distance.js';

export function insideDistance(u, v) {
  return distanceFunctions[u._shape][v._shape](u, v);
}

function dist(x1, x2, y1, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

const distanceFunctions = {

  circle: {

    circle(c1, c2) {
      return c2.radius - centroidDistance(c1, c2) - c1.radius;
    },

    rect(c, r) {
      
      const d = Math.min(
        c.x - c.radius - r.xMin,
        r.xMax - c.x - c.radius,
        c.y - c.radius - r.yMin,
        r.yMax - c.y - c.radius,  
      );
      
      // if the circle centroid is outside the rectangle, may need to use
      // distance from corner of rectangle
      if (d < -c.radius) {
        let dCorner = 0;
        if (c.x < r.xMin) {
          if      (c.y < r.yMin) dCorner = dist(c.x, r.xMin, c.y, r.yMin); 
          else if (c.y > r.yMax) dCorner = dist(c.x, r.xMin, c.y, r.yMax);
        }
        else if (c.x > r.xMax) {
          if      (c.y < r.yMin) dCorner = dist(c.x, r.xMax, c.y, r.yMin);
          else if (c.y > r.yMax) dCorner = dist(c.x, r.xMax, c.y, r.yMax);
        }
        return Math.min(d, -(dCorner + c.radius));
      }

      return d;

    }

  }

};