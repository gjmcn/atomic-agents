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

const distanceFunctions = {

  circle: {

    circle(c1, c2) {
      return c2.radius - centroidDistance(c1, c2) - c1.radius;
    },

    rect(c, r) {
      return Math.min(
        c.x - c.radius - r.xMin,
        r.xMax - c.x - c.radius,
        c.y - c.radius - r.yMin,
        r.yMax - c.y - c.radius,  
      );
    }

  }

};