////////////////////////////////////////////////////////////////////////////////
// Polyline class.
////////////////////////////////////////////////////////////////////////////////

import { Vector } from './vector.js';
import { simplify } from './simplify.js';

export class Polyline {

  // - points is an array, each element is an object with x and y properties
  // - if reducePoints is true, creates a simplified polyline
  // - if sim (a simulation object) is passed, the constructor throws if any of
  //   the polyline is outside the simulation grid
  constructor(points, reducePoints = true, sim) {
  
    // points
    if (points.length < 2) throw Error('at least two points expected');
    if (reducePoints) points = simplify(points);
    this.pts = points.map(pt => Vector.fromObject(pt));
    if (sim) {
      for (let pt of this.pts) {
      if (pt.x < this.xMin || pt.x > this.xMax ||
          pt.y < this.yMin || pt.y > this.yMax)
        throw Error('polyline must lie within the simulation grid');
      }
    };
  
    // segments, segment lengths, cumulative lengths and line length
    this.segs = [];
    this.segLengths = [];
    this.segLengthsCumu = [0];
    for (let i = 0; i < this.pts.length - 1; i++) {
      const seg = this.pts[i + 1].copy().sub(this.pts[i]);
      this.segs.push(seg);
      const m = seg.mag();
      this.segLengths.push(m);
      this.segLengthsCumu.push(this.segLengthsCumu.at(-1) + m);
    }
    this.lineLength = this.segLengthsCumu.at(-1);
  
  }

  // get point on line at curve parameter value t
  // - startIndex is an index of this.pts at which to start the search for the
  //   segment containing the result
  // - returns a vector
  pointAt(t, startIndex = 0) {
    if (t <= 0 && startIndex === 0) return this.pts[0].copy();
    if (t >= this.lineLength) return this.pts.at(-1).copy();
    let q = startIndex;
    while (t > this.segLengthsCumu[q + 1]) q++;
    return this.pts[q].lerp(
      this.pts[q + 1],
      (t - this.segLengthsCumu[q]) / this.segLengths[q]
    );
  }

  // point on polyline nearest to p (an object with x and y properties);
  // returns an object with properties:
  // - point: vector, nearest point on polyline
  // - param: number, value of curve parameter corresponding to nearest point
  // - dist: number, distance from p to nearest point
  pointNearest(p) {
    let minDist = Infinity;
    let minPoint;
    let minParam;
    p = Vector.fromObject(p); 
    for (let [i, seg] of this.segs.entries()) {
      const pShift = p.copy().sub(this.pts[i]);
      let param = pShift.scaProjec(seg);
      let proj;
      if (param <= 0) {
        proj = this.pts[i];
        param = this.segLengthsCumu[i];
      }
      else if (param >= this.segLengths[i]) { 
        proj = this.pts[i + 1];
        param = this.segLengthsCumu[i + 1];
      }
      else {
        proj = pShift.vecProjec(seg).add(this.pts[i]);
        param += this.segLengthsCumu[i];
      }
      const dist = Math.hypot(proj.x - p.x, proj.y - p.y);
      if (dist < minDist) {
        minDist = dist;
        minParam = param;
        minPoint = proj.copy();
      }
    }
    return { point: minPoint, param: minParam, dist: minDist };
  }

}