////////////////////////////////////////////////////////////////////////////////
// Vector class.
// (inspired by p5.Vector: https://github.com/processing/p5.js)
// 
// Where a method takes a vector argument, the 'vector' can actually be any
// object with x and y properties.
////////////////////////////////////////////////////////////////////////////////

import { random } from './random.js';

const directionNames = ['right', 'down', 'left', 'up'];

export class Vector {

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static fromObject(o) {
    return new Vector(o.x, o.y);
  }

  static fromArray(a) {
    return new Vector(a[0], a[1]);
  }

  static fromPolar(m, a) {
    return new Vector(m * Math.cos(a), m * Math.sin(a));
  }

  static randomAngle(m = 1) {
    return Vector.fromPolar(m, random.uniform_01() * 2 * Math.PI);
  }

  static randomPoint(xMin, xMax, yMin, yMax) {
    return new Vector(
      random.uniform_01() * (xMax - xMin) + xMin,
      random.uniform_01() * (yMax - yMin) + yMin
    );
  }
  
  copy() {
    return new Vector(this.x, this.y);
  }
  
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  add(v) {
    if (typeof v === 'number') {
      this.x += v;
      this.y += v;
    }
    else {
      this.x += v.x;
      this.y += v.y;
    }
    return this;
  }

  sub(v) {
    if (typeof v === 'number') {
      this.x -= v;
      this.y -= v;
    }
    else {
      this.x -= v.x;
      this.y -= v.y;
    }
    return this;
  }

  mult(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  div(s) {
    this.x /= s;
    this.y /= s;
    return this;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  mag() {
    return Math.sqrt(this.dot(this));
  }

  setMag(m) {
    return this.mult(m / this.mag());
  }

  normalize() {
    return this.div(this.mag());
  }

  limit(mx) {
    const m = this.mag();
    if (m > mx) {
      this.mult(mx / m);
    }
    return this;
  }

  distance(v) {
    return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  setHeading(a) {
    const m = this.mag();
    this.x = m * Math.cos(a);
    this.y = m * Math.sin(a);
    return this;
  }

  turn(a) {
    return this.setHeading(this.heading() + a);
  }

  direction() {
    return directionNames.at(Math.round(this.heading() / (Math.PI / 2)));
  }

  directionIndex() {
    let d = Math.round(this.heading() / (Math.PI / 2));
    if (d === -1) d = 3;
    else if (d === -2) d = 2;
    return d;
  }

  getUnit() {
    return this.copy().normalize();
  }
  
  getUnitNormal() {
    return new Vector(-this.y, this.x).normalize();
  }

  lerp(v, s) {
    return new Vector(
      this.x + (v.x - this.x) * s,
      this.y + (v.y - this.y) * s
    );
  }

  isZero() {
    return this.x === 0 && this.y === 0;
  }

  
  // ===== projection of this onto vector v =====

  vecProjec(v) {
    v = new Vector(v.x, v.y);
    return v.mult(this.dot(v) / v.dot(v));
  }

  scaProjec(v) {
    return this.dot(v) / Math.sqrt(v.x ** 2 + v.y ** 2);
  }

  vecRejec(v) {
    return this.vecProjec(v).sub(this).mult(-1);
  }
  
  scaRejec(v) {
    return (this.y * v.x - this.x * v.y) / Math.sqrt(v.x ** 2 + v.y ** 2);
  }

}