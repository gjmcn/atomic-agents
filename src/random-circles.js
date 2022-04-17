////////////////////////////////////////////////////////////////////////////////
// Generate random circles within a simulation or agent. Returns an array of
// circles; each circle is an object with properties x, y and radius. Pass
// options in second argument.
////////////////////////////////////////////////////////////////////////////////

import { random } from './random.js';
import {
  assertNonnegativeInteger, assertPositiveInteger, randomPointInCircle
} from './helpers.js';
import { boundaryDistance } from './boundary-distance.js';
import { insideDistance } from './inside-distance.js';
import { overlap as testOverlap} from './overlap.js';
import { within as testWithin} from './within.js';

export function randomCircles(area, {
    n = 1,             // number of circles; not used if both nMax and nMin are 
                       // used
    nMax = n,          // max number of circles; use Infinity to get as many
                       // as possible - but ensure nMin is not Infinity
    nMin = n,          // min number of circles
    aimForMax = true,  // aim for nMax circles? If false, aims for random
                       // integer between nMin and nMax - always aims for nMax
                       // if it is Infinity
    radius = 5,        // radius of circles; can be a function that returns a
                       // radius (passed the circle's x, y and index)
    exclude = null,    // iterable of agents that circles cannot overlap
    gap = 0,           // min distance between circles (if overlap falsy) and
                       // between circles and excluded agents
    padding = 0,       // min distance between circles and edge of area
    overlap = false,   // if true, circles can overlap
    retry = 5000,      // max total retries after generate invalid circle
  } = {}) {

  // process and check args
  assertNonnegativeInteger(nMin, 'nMin');
  if (nMax !== Infinity) {
    assertPositiveInteger(nMax, 'nMax');
    if (nMin > nMax) {
      throw Error('nMin is greater than nMax');
    }
  }
  assertNonnegativeInteger(retry, 'retry');

  // useful constants
  const isAreaActor = area.type === 'actor';
  const isRadiusFunction = typeof radius === 'function';

  // target number of circles
  const targetCircles = 
    nMax === Infinity || aimForMax || nMin === nMax
      ? nMax
      : random.int(nMin, nMax + 1)();
  
  // random point
  const finalPadding = isRadiusFunction ? padding : padding + radius;
  let randomPoint;
  if (isAreaActor) {
    randomPoint = () => randomPointInCircle({
      x: area.x,
      y: area.y,
      radius: area.radius - finalPadding
    });
  }
  else {
    const randomX = random.uniform(
      area.xMin + finalPadding, area.xMax - finalPadding);
    const randomY = random.uniform(
      area.yMin + finalPadding, area.yMax - finalPadding);
    randomPoint = () => ({x: randomX(), y: randomY()});
  }
  
  // validate circle
  function validateCircle(circle) {
    if (isRadiusFunction) {
      if (padding) {
        if (insideDistance(circle, area) < padding) return false;
      }
      else {
        if (!testWithin(circle, area)) return false;
      }
    }
    if (gap) {
      for (let agent of exclude || []) {
        if (boundaryDistance(circle, agent) < gap) return false;
      }
      if (!overlap) {
        for (let c of circles) {
          if (boundaryDistance(circle, c) < gap) return false;
        }
      }
    }
    else {
      for (let agent of exclude || []) {
        if (testOverlap(circle, agent)) return false;
      }
      if (!overlap) {
        for (let c of circles) {
          if (testOverlap(circle, c)) return false;
        }
      }
    }
    return true;
  };
  
  // generate circles
  const circles = [];
  while (circles.length < targetCircles) {
    const circle = randomPoint();
    circle._shape = 'circle';  // hack to make insideDistance etc. work
    circle.radius = isRadiusFunction
      ? radius(circle.x, circle.y, circles.length)
      : radius;
    if (validateCircle(circle)) {
      circles.push(circle);
    }
    else if (retry-- === 0) {
      break;
    }
  }

  // check have sufficient circles
  if (circles.length < nMin) {
    throw Error('number of valid circles found is less than nMin');
  }
  for (let c of circles) {
    delete c._shape;
  }

  return circles;

}