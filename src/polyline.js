////////////////////////////////////////////////////////////////////////////////
// Polyline class.
////////////////////////////////////////////////////////////////////////////////

import { Vector } from './vector.js';
import { simplify } from './simplify.js';
import { moduloShift } from './helpers.js';

export class Polyline {

  // points is an array; each element is an array, or an object with x and y
  // properties
  constructor(points) {

    // public properties
    if (points.length < 2) throw Error('at least two points expected');
    this.xMin = Infinity;
    this.xMax = -Infinity;
    this.yMin = Infinity;
    this.yMax = -Infinity;
    this.pts = [];
    for (let pt of points) {
      pt = Vector[Array.isArray(pt) ? 'fromArray' : 'fromObject'](pt);
      this.pts.push(pt);
      if (pt.x < this.xMin) this.xMin = pt.x;
      if (pt.x > this.xMax) this.xMax = pt.x;
      if (pt.y < this.yMin) this.yMin = pt.y;
      if (pt.y > this.yMax) this.yMax = pt.y;
    }
    this.x = (this.xMax + this.xMin) / 2;
    this.y = (this.yMax + this.yMin) / 2;
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

    // if line has more than 2 segments, this._intervals contains the segment
    // index at equal intervals of this_step along the line; the last entry of
    // this._intervals corresponds to the point one step before the line's end
    if (this.segs.length > 2) {
      const n = Math.min(this.segs.length + 1);
      this._step = this.lineLength / n;
      this._intervals = [];
      let segIndex = 0;
      for (let i = 0; i < n; i++) {
        const t = i * this._step;
        while (t >= this.segLengthsCumu[segIndex + 1]) segIndex++;
        this._intervals.push(segIndex);
      }
    }
  
  }

  // transform: scale and rotate about firt point, then translate
  transform({ scale = 1, translate = [0, 0], rotate = 0 }) {
    if (scale === 1 && rotate === 0) {
      return new Polyline(this.pts.map(pt => {
        return [pt.x + translate[0], pt.y + translate[1]];
      }));
    }
    const base = this.pts[0];
    const newBase = base.copy().add(Vector.fromArray(translate));
    const newPoints = [newBase];
    for (let i = 1; i < this.pts.length; i++) {
      const pt = this.pts[i].copy().sub(base);
      if (!pt.isZero()) {
        if (rotate) pt.turn(rotate);
        if (scale !== 1) pt.mult(scale);
      }
      newPoints.push(pt.add(newBase));
    };
    return new Polyline(newPoints);
  }

  // simplify
  simplify(tolerance, highQuality) {
    return new Polyline(simplify(this.pts, tolerance, highQuality));
  }

  // get point on line at curve parameter t; returns a vector
  pointAt(t, wrap) {
    if (wrap) t = moduloShift(t, this.lineLength);
    else if (t <= 0) return this.pts[0].copy();
    else if (t >= this.lineLength) return this.pts.at(-1).copy();
    let segIndex = this._intervals
      ? this._intervals[Math.floor(t / this._step)]
      : 0;
    while (t > this.segLengthsCumu[segIndex + 1]) segIndex++;
    return this.pts[segIndex].lerp(
      this.pts[segIndex + 1],
      (t - this.segLengthsCumu[segIndex]) / this.segLengths[segIndex]
    );
  }

  // as pointAt, but based on curve parameter that runs from 0 to 1
  pointAtFrac(t, wrap) {
    return this.pointAt(t * this.lineLength, wrap);
  }

  // sample at n equally spaced points along the polyline; returns a polyline
  walk(n) {
    if (n < 2) throw Error('n cannot be less than 2');
    const first = this.pts[0];
    const last = this.pts.at(-1);
    if (n === 2) return new Polyline([first, last]);
    let pts = [first];
    const step = this.lineLength / (n - 1);
    let segIndex = 0;
    for (let i = 1; i < n - 1; i++) {
      const t = i * step;
      while (t > this.segLengthsCumu[segIndex + 1]) segIndex++;
      pts.push(this.pts[segIndex].lerp(
        this.pts[segIndex + 1],
        (t - this.segLengthsCumu[segIndex]) / this.segLengths[segIndex]
      ));
    }
    pts.push(last);
    return new Polyline(pts);
  }

  // point on segment nearest to p (an object with x and y properties); returns
  // an object with properties:
  // - point: vector, nearest point on segment
  // - param: number, value of curve parameter corresponding to nearest point
  // - scaProjec: number, scalar projection of p onto segment
  // - dist: number, distance from p to nearest point
  _pointNearestOnSeg(p, segIndex) {
    const seg = this.segs[segIndex];
    const pShift = Vector.fromObject(p).sub(this.pts[segIndex]);
    let scaProjec = pShift.scaProjec(seg);
    let param;
    let proj;
    if (scaProjec <= 0) {
      proj = this.pts[segIndex].copy();
      param = this.segLengthsCumu[segIndex];
    }
    else if (scaProjec >= this.segLengths[segIndex]) { 
      proj = this.pts[segIndex + 1].copy();
      param = this.segLengthsCumu[segIndex + 1];
    }
    else {
      proj = pShift.vecProjec(seg).add(this.pts[segIndex]);
      param = this.segLengthsCumu[segIndex] + scaProjec;
    }
    const dist = Math.hypot(proj.x - p.x, proj.y - p.y);
    return {point: proj, param, scaProjec, dist};
  }

  // as _pointNearestOnSeg, but only returns distance to nearest point on seg
  _distanceFromSeg(p, segIndex) {
    const seg = this.segs[segIndex];
    const pShift = Vector.fromObject(p).sub(this.pts[segIndex]);
    let scaProjec = pShift.scaProjec(seg);
    if (scaProjec <= 0) {
      const pt = this.pts[segIndex];
      return Math.hypot(p.x - pt.x, p.y - pt.y);
    }
    if (scaProjec >= this.segLengths[segIndex]) {
      const pt = this.pts[segIndex + 1];
      return Math.hypot(p.x - pt.x, p.y - pt.y);
    }
    return Math.abs(pShift.scaRejec(seg));
  }

  // point on polyline (or only from segments listed in segIndices) nearest to p
  // (an object with x and y properties); returns an object with properties:
  // - point: vector, nearest point on polyline
  // - param: number, value of curve parameter corresponding to nearest point
  // - segIndex: number, index of segment of nearest point
  // - scaProjec: number, scalar projection of p onto segment of nearest point
  // - dist: number, distance from p to nearest point
  pointNearest(p, segIndices) {
    let minDist = Infinity;
    let nearest;
    let segIndex;
    for (let i of segIndices ?? this.segs.keys()) {
      const obj = this._pointNearestOnSeg(p, i);
      if (obj.dist < minDist) {
        minDist = obj.dist;
        nearest = obj;
        segIndex = i;
      }
    }
    if (nearest) nearest.segIndex = segIndex;
    return nearest;
  }

}