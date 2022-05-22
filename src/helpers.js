////////////////////////////////////////////////////////////////////////////////
// Helper functions. Some are only used internally, whereas others are also
// exported from Atomic Agents. 
////////////////////////////////////////////////////////////////////////////////

import { random } from './random.js';
import { Vector } from './vector.js';
import { XSet } from './x-set.js';

// Shuffle array in place using Fisher–Yates algorithm. 
export function shuffle(x) {
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(random.uniform_01() * (i + 1));
    if (i !== j) {
      const t = x[i];
      x[i] = x[j];
      x[j] = t;
    }
  }
  return x;
}

// Loop n times; pass f the index each step.
export function loop(n, f) {
  for (let i = 0; i < n; i++) {
    f(i);
  }
}

// Bound value to given min and max.
export function bound(val, min, max) {
  return Math.max(Math.min(val, max), min);
}

// Is positive integer?
export function isPositiveInteger(k) {
  return Number.isInteger(k) && k > 0;
}

// Is non-negative integer?
export function isNonnegativeInteger(k) {
  return Number.isInteger(k) && k > -1;
}

// Assert integer.
export function assertInteger(k, name) {
  if (!Number.isInteger(k)) {
    throw Error(`${name} must be an integer`);
  }
}

// Assert positive integer.
export function assertPositiveInteger(k, name) {
  if (!isPositiveInteger(k)) {
    throw Error(`${name} must be a positive integer`);
  }
}

// Assert non-negative integer.
export function assertNonnegativeInteger(k, name) {
  if (!isNonnegativeInteger(k)) {
    throw Error(`${name} must be a non-negative integer`);
  }
}

// Roughly equal to?
export function roughlyEqual(u, v) {
  return Math.abs(u - v) < 1e-10; 
}

// Throw if t is not a valid agent type.
export function assertAgentType(t) {
  if (t !== 'actor' && t !== 'square' && t !== 'zone') {
    throw Error('invalid agent type');
  }
}

// Is iterable?
export function isIterable(a) {
  return typeof a?.[Symbol.iterator] === 'function';
}

// Random element of an array.
export function randomElement(a) {
  return a[random.int(a.length)()];
}

// Random point in circle.
export function randomPointInCircle({x = 0, y = 0, radius = 1}) {
  const r = radius * Math.sqrt(random.uniform_01());
  const theta = random.uniform_01() * 2 * Math.PI;
  return {
    x: x + r * Math.cos(theta),
    y: y + r * Math.sin(theta)
  };
}

// Iterable of index limits. No checking: either returns passed iterable, or
// assumes passed an object and puts the relevant property values in an array.
export function getIndexLimits(a) {
  return isIterable(a)
    ? a
    : [a.xMinIndex, a.xMaxIndex, a.yMinIndex, a.yMaxIndex];
}

// XSet of actors or zones that overlap any square in an iterable of squares.
// - type should be 'actor' or 'zone'
// - omitThis should be an actor or zone
export function getOverlapping(squares, type, omitThis) {
  const r = new XSet();
  const prop = type + 's';
  for (let sq of squares) {
    for (let a of sq[prop]) {
      if (a !== omitThis) r.add(a);
    }
  }
  return r;
}

// Set vis options for simulation or agent.
const interactionEvents = new Set([
  'click',
  'pointercancel',
  'pointerdown',
  'pointerout',
  'pointerover',
  'pointertap',
  'pointerup',
  'pointerupoutside'
]);
export function setVisOptions(a, cls, ops) {
  if (a._vis || a._visUpdates  || a._interaction) {
    throw Error('can only set vis options once');
  }
  for (let [key, value] of Object.entries(ops)) {
    if (interactionEvents.has(key.toLowerCase())) {
      if (typeof value !== 'function') {
        throw Error(`interaction option "${key}": function expected`);
      }
      (a._interaction ??= new Map()).set(key.toLowerCase(), value.bind(a));
    }
    else if (typeof value === 'function') {
      if (!cls.updatableVisOptions.has(key)) {
        throw Error(`"${key}" is not an updatable vis option`);
      }
      (a._visUpdates ??= new Map()).set(key, value.bind(a));
    }
    else {
      if (!cls.visOptions.has(key)) {
        throw Error(`"${key}" is not a vis option`);
      }
      (a._vis ??= new Map()).set(key, value);
    }
  }
  return a;
}

// Returns r = p + mq, such that: 0 <= r < q (so assumes q > 0).
export function moduloShift(p, q) {
  return p < 0 || p >= q
    ? p - Math.floor(p / q) * q
    : p;
}

// Convert angle to a value in [0, 2 * pi).
export function normalizeAngle(a) {
  return moduloShift(a, 2 * Math.PI);
}

// Get layer - an array of squares.
// sim: simulation object
// level: non-zero integer (can be negative)
// limits: object with props `xiMin`, `xiMax`, `yiMin`, `yiMax'
//         (valid x and y grid indices with min <= max on each dimension)
export function getLayer(sim, level, limits) {

  // process limits and bound them if necessary
  const { nx, ny, squares: gridSquares } = sim._grid;
  if (level < 0) level++;
  const xStart = limits.xiMin - level;
  const xEnd   = limits.xiMax + level;
  const yStart = limits.yiMin - level;
  const yEnd   = limits.yiMax + level;
  if (xStart > xEnd || yStart > yEnd) {
    return [];
  }
  const xStartBounded = Math.max(xStart, 0);
  const xEndBounded   = Math.min(xEnd, nx - 1);
  const yStartBounded = Math.max(yStart, 0);
  const yEndBounded   = Math.min(yEnd, ny - 1);
  const s = [];
  
  // layer has length 1 on one or both dimensions
  if (xStartBounded === xEndBounded) {
    if (yStartBounded === yEndBounded) {
      s.push(gridSquares[yStartBounded][xStartBounded]);
    } 
    else {
      for (let yi = yStartBounded; yi <= yEndBounded; yi++) {
        s.push(gridSquares[yi][xStartBounded]);
      }
    } 
  }
  else if (yStartBounded === yEndBounded) {
    for (let xi = xStartBounded; xi <= xEndBounded; xi++) {
      s.push(gridSquares[yStartBounded][xi]);
    }
  }

  // layer greater than langth 1 on both dimensions
  else {
    if (yStart >= 0) {  // top
      const xn = xEndBounded < xEnd ? xEndBounded : xEndBounded - 1;
      for (let xi = xStartBounded; xi <= xn; xi++) {
        s.push(gridSquares[yStart][xi]);
      }
    }
    if (xEnd < nx) {    // right
      const yn = yEndBounded < yEnd ? yEndBounded : yEndBounded - 1;
      for (let yi = yStartBounded; yi <= yn; yi++) {
        s.push(gridSquares[yi][xEnd]);
      }
    }
    if (yEnd < ny) {    // bottom
      const xn = xStartBounded > xStart ? xStartBounded : xStartBounded + 1;
      for (let xi = xEndBounded; xi >= xn; xi--) {
        s.push(gridSquares[yEnd][xi]);
      }
    }
    if (xStart >= 0) {  // left
      const yn = yStartBounded > yStart ? yStartBounded : yStartBounded + 1;
      for (let yi = yEndBounded; yi >= yn; yi--) {
        s.push(gridSquares[yi][xStart]);
      }
    }
  }

  return s;

}

// The value at the given time of a repeating sequence with the given period
// and steps 0, 1, ..., steps - 1.
// - if time < 0, it is rounded up to 0
// - period should be divisible by steps
export function frame(period, steps, time) {
  return Math.floor(Math.max(time, 0) % period / (period / steps));
}

// Grid points in rectangle - any object with properties xMin, xMax, yMin, yMax.
// Pass options in second argument:
export function gridInRect(rect, {
      n: nPoints,    // min number of points to generate - see crop option
      pairs = true,  // if true, return array of points (vectors); if false,
                     // return an array; the first element is an array of
                     // x-values, the second is an array of y-values
      padding = 0,   // distance between rectangle boundary and closest grid
                     // point
      descX,         // true for descending x, ascending by default,
      descY,         // true for descending y, ascending by default,
      //  ----- following options ignored if pairs is false -----
      crop = true,   // false to generate all grid points (so possibly more than
                     // n); true to return only n points
      columnsFirst   // true to fill columns first; rows first by default
    } = {}) {

  // check and process arguments
  if (!Number.isInteger(nPoints) || nPoints <= 0) {
    throw Error('n must be a positive integer');
  }
  const width = rect.xMax - rect.xMin - 2 * padding;
  const height = rect.yMax - rect.yMin - 2 * padding;
  if (width <= 0 || height <= 0) {
    throw Error(
      'width and height of rectangle must be more than double the padding');
  }
  const aspect = width / height;

  // 1 point is a special case
  if (nPoints === 1) {
    const x = padding + rect.xMin + width / 2;
    const y = padding + rect.yMin + height / 2;
    return pairs ? [new Vector(x, y)] : [[x], [y]];
  }

  // compute number of columns and rows: consider 2 possibilities and take
  // closest to aspect ratio of the rectangle
  // - initially compute possible values for the number of x and y steps, then
  //   add 1 to get numbers of columns and rows
  let nx, ny, nx1, ny1, nx2, ny2;
  if (width > height) {  // smaller height: start from 2 height candidates
    const nyRaw = Math.sqrt(nPoints / aspect) - 1;
    ny1 = Math.max(0, Math.floor(nyRaw));
    ny2 = ny1 + 1;
    nx2 = Math.floor((nyRaw + 1) * aspect - 1);
    nx1 = ny1 === 0 ? nPoints - 1 : nx2;
    nx1++; ny1++; nx2++; ny2++;
    while (nx1 * ny1 < nPoints) nx1++;
    while ((nx1 - 1) * ny1 >= nPoints) nx1--;
    while (nx2 * ny2 < nPoints) nx2++;
    while ((nx2 - 1) * ny2 >= nPoints) nx2--;
    [nx, ny] =  // use logs to compare ratios - so e.g. 2.5 and 10 are same distance from 5
          (Math.log((nx1 - 1) / (ny1 - 1 || 1)) - Math.log(aspect)) ** 2 <
          (Math.log((nx2 - 1) / (ny2 - 1 || 1)) - Math.log(aspect)) ** 2
      ? [nx1, ny1]
      : [nx2, ny2];
  }
  else {  // smaller width: start from 2 width candidates
    const nxRaw = Math.sqrt(nPoints * aspect) - 1;
    nx1 = Math.max(0, Math.floor(nxRaw));
    nx2 = nx1 + 1;
    ny2 = Math.floor((nxRaw + 1) / aspect - 1);
    ny1 = nx1 === 0 ? nPoints - 1 : ny2;
    nx1++; ny1++; nx2++; ny2++;
    while (nx1 * ny1 < nPoints) ny1++;
    while (nx1 * (ny1 - 1) >= nPoints) ny1--;
    while (nx2 * ny2 < nPoints) ny2++;
    while (nx2 * (ny2 - 1) >= nPoints) ny2--;
    [nx, ny] =
          (Math.log((ny1 - 1) / (nx1 - 1 || 1)) - Math.log(1 / aspect)) ** 2 <
          (Math.log((ny2 - 1) / (nx2 - 1 || 1)) - Math.log(1 / aspect)) ** 2
      ? [nx1, ny1]
      : [nx2, ny2];
  }
  
  // generate grid points
  const xStep = nx > 1 ? width / (nx - 1) : null;
  const yStep = ny > 1 ? height / (ny - 1) : null;
  let step = xStep || yStep;
  let xPadding = padding;
  let yPadding = padding;
  if (xStep && yStep) {
    if (xStep < yStep) {
      yPadding += (yStep - xStep) * (ny - 1) / 2;
      step = xStep;
    }
    else if (yStep < xStep) {
      xPadding += (xStep - yStep) * (nx - 1) / 2;
      step = yStep;
    }
  }
  else if (xStep) {
    yPadding += height / 2;
  }
  else {  // yStep is truthy
    xPadding += width / 2;
  }
  const xStart = rect.xMin + xPadding;
  const yStart = rect.yMin + yPadding;
  const xStop  = rect.xMax - xPadding + 1e-10;
  const yStop  = rect.yMax - yPadding + 1e-10;
  const rx = [];
  const ry = [];
  for (let x = xStart; x < xStop; x += step) rx.push(x);
  for (let y = yStart; y < yStop; y += step) ry.push(y);
  if (descX) rx.reverse();
  if (descY) ry.reverse();
  if (!pairs) return [rx, ry];
  const r = [];
  if (columnsFirst) {
    for (let x of rx) {
      for (let y of ry) {
        r.push(new Vector(x, y));
        if (crop && r.length === nPoints) return r;
      }
    }
  }
  else {
    for (let y of ry) {
      for (let x of rx) {
        r.push(new Vector(x, y));
        if (crop && r.length === nPoints) return r;
      }
    }
  }
  return r;

}

// Triangular grid points in hexagon - any object with properties x, y, radius.
// Returns an array of vectors. Pass options in second argument:
export function gridInHex(hex, {
      n: nPoints,        // min number of points to generate - see crop option 
      padding = 0,       // distance between hexagon boundary and closest grid
                         // point
      clockwise = true,  // true for clockwise points in each hexagonal layer,
                         // false for counterclockwise
      start = 'top',     // 'top' 'right', 'bottom' or 'left'; position of first
                         // point in each hexagonal layer
      crop = true        // false to generate all grid points (so possibly more
                         // than n); true to return only n points
    } = {}) {
  
  // check and process arguments
  if (!Number.isInteger(nPoints) || nPoints <= 0) {
    throw Error('n must be a positive integer');
  }
  const radius = hex.radius - padding;
  if (radius <= 0) {
    throw Error('hexagon radius must be greater than padding');
  }
  const {x: cx, y: cy} = hex;

  // 1 point is a special case
  if (nPoints === 1) {
    return [new Vector(cx, cy)];
  }

  // number of hexagonal layers (not including middle point)
  // - see https://planetmath.org/CenteredHexagonalNumber
  const nLayers = Math.ceil(-0.5 + Math.sqrt((nPoints - 1) / 3 + 0.25));

  // generate points
  const center = new Vector(cx, cy);
  const mainPoints = [];
  const startAngle = {
    top:    -Math.PI / 2,
    right:  0,
    bottom: Math.PI / 2,
    left:   Math.PI
  }[start];
  const magStep = radius / nLayers;
  const angleStep = Math.PI / 3 * (clockwise ? 1 : -1);
  for (let i = 0; i < 6; i++) {
    mainPoints.push(Vector.fromPolar(1, startAngle + angleStep * i));
  }
  const r = [center];
  for (let layer = 1; layer <= nLayers; layer++) {
    const layerMainPoints =
      mainPoints.map(mp => mp.copy().setMag(layer * magStep).add(center));
    for (let i = 0; i < 6; i++) {  // loop over layer main points
      const mp = layerMainPoints[i];
      const mpNext = layerMainPoints[(i + 1) % 6];
      r.push(mp);
      if (crop && r.length === nPoints) return r;
      for (let j = 1; j < layer; j++) {  // interpolate between main points
        r.push(mp.lerp(mpNext, j / layer));
        if (crop && r.length === nPoints) return r;
      }
    }
  }
  return r;

}

// Partition a rectangle (at integer indices) into smaller rectangles.
// indexLimits describes the passed rectangle: an iterable with elements
// `xMinIndex`, `xMaxIndex`, `yMinIndex`, `yMaxIndex`, or an object with these
// properties. Returns an array of rectangles; each rectangle is an array of
// index limits. Pass options in second argument.
export function partitionRect(indexLimits, {
    n: nRect    = 2,     // number of rectangles in partition
    minWidth    = 1,     // min width of rectangles in the partition
    minHeight   = 1,     // min height of rectangles in the partition
    gap         = 0,     // space between rectangles in the partition
    padding     = 0,     // space between boundary of original rectangle and
                         // rectangles in the partition
    randomSplit = true,  // choose next rectangle to split:
                         //  - false: split largest rectangle with a valid split
                         //  - true: random choice - greater area, greater prob
    dim         = 'xy',  // split on either dimension ('xy') or only x' or only 
                         // 'y'
    randomDim   = true,  // if dim is 'xy':
                         //  - false: split rectangle on longest side (if can)
                         //  - true: random choice - longer side, greater prob
    randomSite  = true   // where to split the side:
                         //  - false: half way (rounded up)
                         //  - true: random 
  } = {}) {

  // process and check args
  let [xiMin, xiMax, yiMin, yiMax] = getIndexLimits(indexLimits);
  assertNonnegativeInteger(padding, 'padding');
  if (padding) {
    xiMin += padding;
    xiMax -= padding;
    yiMin += padding;
    yiMax -= padding;
  }
  for (let [name, value, assertFunc] of [
        ['xiMin',     xiMin,     assertNonnegativeInteger],
        ['xiMax',     xiMax,     assertNonnegativeInteger],
        ['yiMin',     yiMin,     assertNonnegativeInteger],
        ['yiMax',     yiMax,     assertNonnegativeInteger],
        ['gap',       gap,       assertNonnegativeInteger],
        ['n',         nRect,     assertPositiveInteger   ],
        ['minWidth',  minWidth,  assertPositiveInteger   ],
        ['minHeight', minHeight, assertPositiveInteger   ],
      ]) {
    assertFunc(value, name);
  }
  if (xiMin > xiMax) throw Error('xiMin is greater than xiMax');
  if (yiMin > yiMax) throw Error('yiMin is greater than yiMax');
  if (xiMax - xiMin + 1 < minWidth) {
    throw Error('minWidth is greater than the width of the rectangle');
  }
  if (yiMax - yiMin + 1 < minHeight) {
    throw Error('minHeight is greater than the height of the rectangle');
  }
  if (nRect === 1) {
    return [[xiMin, xiMax, yiMin, yiMax]];
  }

  // rectangle class
  const xSplitAllowed = dim.includes('x');
  const ySplitAllowed = dim.includes('y');
  class Rectangle {
    constructor(indexLimits) {
      [this.xiMin, this.xiMax, this.yiMin, this.yiMax] = indexLimits;
      this.width       = this.xiMax - this.xiMin + 1;
      this.height      = this.yiMax - this.yiMin + 1;
      this.area        = this.width * this.height;
      this.xSplitValid = xSplitAllowed && this.width  >= 2 * minWidth + gap;
      this.ySplitValid = ySplitAllowed && this.height >= 2 * minHeight + gap;
    }
  }

  // get the x or y index of the split site
  // - the split is before the square at the split index
  function getSplitSite(len, min) {
    return randomSite
      ? Math.floor(random.uniform_01() * (len - 2 * min - gap + 1)) + min
      : Math.ceil((len - gap) / 2);
  }

  // partition, initialise with the original rectangle
  const partition = [
    new Rectangle([xiMin, xiMax, yiMin, yiMax])
  ];

  // select rectangle to split - return an index of partition
  function getRectToSplit() {
    let probsSum = 0;
    const probs = [];  // probs or cumulative probs (unnormalised)
    for (let r of partition) {
      const p = r.xSplitValid || r.ySplitValid ? r.area : 0;
      probsSum += p;
      probs.push(randomSplit ? probsSum : p);
    }
    if (probsSum === 0) {
      throw Error('no valid rectangles to split');
    }
    if (randomSplit) {
      const v = random.uniform_01() * probsSum;
      for (var i = 0; i < probs.length - 1; i++) {
        if (v < probs[i]) return i;
      }
      return i;
    }
    else {
      let [i, pMax] = [0, 0];
      for (let [j, p] of probs.entries()) {
        if (p > pMax) [i, pMax] = [j, p];
      }
      return i;
    }
  }

  // split partition[i] into 2 smaller rectangles
  // - can assume partition[i] has a valid x-split or y-split
  // - replace partition[i] with the two new rectangles
  function splitRect(i) {
    const r = partition[i];
    let r1, r2;
    let xSplit = false;
    if (r.xSplitValid && r.ySplitValid) {
      if (randomDim) {
        if (random.uniform_01() <= r.width / (r.width + r.height)) {
          xSplit = true;
        }
      }
      else if (r.width >= r.height) {
        xSplit = true;
      }
    }
    else if (r.xSplitValid) {
      xSplit = true;
    }
    if (xSplit) {
      const splitAt = getSplitSite(r.width, minWidth) + r.xiMin;
      r1 = new Rectangle([r.xiMin,       splitAt - 1, r.yiMin, r.yiMax]); 
      r2 = new Rectangle([splitAt + gap, r.xiMax,     r.yiMin, r.yiMax]); 
    }
    else {  // y-split
      const splitAt = getSplitSite(r.height, minHeight) + r.yiMin;
      r1 = new Rectangle([r.xiMin, r.xiMax, r.yiMin,       splitAt - 1]); 
      r2 = new Rectangle([r.xiMin, r.xiMax, splitAt + gap, r.yiMax]); 
    }
    partition.splice(i, 1, r1, r2);
  }

  // split rectangles until reach required number
  while (partition.length < nRect) {
    splitRect(getRectToSplit());
  }

  // return rectangles as 4-arrays
  return partition.map(r => [r.xiMin, r.xiMax, r.yiMin, r.yiMax]);

}