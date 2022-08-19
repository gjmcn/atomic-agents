////////////////////////////////////////////////////////////////////////////////
// Actor class.
////////////////////////////////////////////////////////////////////////////////

import { random } from './random.js';
import { XSet } from './x-set.js';
import { Vector } from './vector.js';
import { assertAgentType, assertInteger, assertPositiveInteger, getOverlapping,
  roughlyEqual, moduloShift, getLayer, setVisOptions } from './helpers.js';
import { Agent } from "./agent.js";
import { overlap } from './overlap.js';
import { nearestFrom } from './from-functions.js';
import { within } from './within.js';
import { insideDistance } from "./inside-distance.js";
import { regions } from './regions.js';
import { autotile } from './autotile.js';

export class Actor extends Agent {

  static visOptions = new Set([...Agent.visOptions,
    'textRotate',
    'textMaxWidth'
  ]);

  static updatableVisOptions = Agent.updatableVisOptions;

  constructor(options = {}) {
    super(options);
    this.type          = 'actor';
    this._shape        = 'circle';
    this.zIndex        = options.zIndex ?? -Infinity;
    this.radius        = options.radius ?? 5;
    this.mass          = options.mass === 'area' 
                          ? Math.PI * this.radius ** 2
                          : (options.mass ?? 1);
    this.vel           = options.vel            ?? new Vector();
    this.pointing      = options.pointing       ?? null;
    this.maxSpeed      = options.maxSpeed       ?? 4;
    this.maxForce      = options.maxForce       ?? Infinity;
    this.steerMaxForce = options.steerMaxForce  ?? Infinity;
    this.still         = options.still          ?? false;
    this.wrap          = options.wrap           ?? false;
    this.wrapX         = options.wrapX          ?? false;
    this.wrapY         = options.wrapY          ?? false;
    this.contains      = options.contains       ?? null;
    if (options.updateMass)     this.updateMass     = options.updateMass;
    if (options.updateRadius)   this.updateRadius   = options.updateRadius;
    if (options.updatePointing) this.updatePointing = options.updatePointing;
    this.squares         = null;
    this.overlappingGrid = false;
    this._resetOnRemove  = ['squares', 'containsCurrent'];
    this._assertPositiveProp('radius');
    this._assertPositiveProp('mass');
    this.steer = new Map();
    this._force = new Vector();
    this._wanderAngle = 0;
    this._xChange = 0;
    this._yChange = 0;
    this.containsCurrent = null;
    // also: this._contains, set by this.contains setter
  }

  vis(obj = {}) {
    return setVisOptions(this, Actor, obj);
  }

  _assertPositiveProp(prop) {
    if (typeof this[prop] !== 'number' || !(this[prop] > 0)) {
      throw Error(`actor ${prop} must be a positive number`);
    }
  }

  addTo(simulation) {
    this._validateSimulation(simulation);
    this.squares = new XSet();
    this._addToSimulation(simulation);
    this._updateOverlappingSquares();
    return this;
  }

  _updateOverlappingSquares() {
    if (overlap(this, this._simulation)) {
      this.overlappingGrid = true;
      const { squares: gridSquares } = this._simulation._grid;
      const { xiMin, xiMax, yiMin, yiMax } = 
        this._simulation._bBoxIndices(this, this.radius);
      if (xiMin === xiMax &&
          yiMin === yiMax &&
          this.squares.size === 1 &&
          this.squares.has(gridSquares[yiMin][xiMin])
        ) {
          return;
      }
      for (let sq of this.squares) {
        if (sq.xIndex < xiMin || sq.xIndex > xiMax ||
            sq.yIndex < yiMin || sq.yIndex > yiMax) {
          this.squares.delete(sq);
          sq.actors.delete(this);
        }
      }
      for (let yi = yiMin; yi <= yiMax; yi++) {
        for (let xi = xiMin; xi <= xiMax; xi++) {
          const sq = gridSquares[yi][xi];
          const hadOverlap = this.squares.has(sq);
          const hasOverlap = overlap(this, sq);
          if (hadOverlap && !hasOverlap) {
            this.squares.delete(sq);
            sq.actors.delete(this);
          }
          else if (!hadOverlap && hasOverlap) {
            this.squares.add(sq);
            sq.actors.add(this);
          }
        }
      }        
    }
    else {
      this.overlappingGrid = false;
      for (let sq of this.squares) {
        this.squares.delete(sq);
        sq.actors.delete(this);
      }
    }
  }
  
  heading() {
    return Math.atan2(this.vel.y, this.vel.x);
  }
  
  _updateXY(x, y) {
    const sim = this._simulation;
    if (sim) {
      const xOld = this.x;
      const yOld = this.y;
      this.x = this.wrap || this.wrapX
        ? moduloShift(x, sim.width)
        : x;
      this.y = this.wrap || this.wrapY
        ? moduloShift(y, sim.height)
        : y;
      if (!roughlyEqual(this.x, xOld) || !roughlyEqual(this.y, yOld)) {
        this._updateOverlappingSquares();
      }
      if (sim.applyContainers) {
        this._xChange += this.x - xOld;
        this._yChange += this.y - yOld;
      }
    }
    else {
      this.x = x;
      this.y = y;
    }
  }

  setXY(x, y) {
    this._updateXY(x, y);
    return this;
  }

  useXY(v) {
    this._updateXY(v.x, v.y);
    return this;
  }

  get contains() {
    return this._contains;
  }

  set contains(p) {
    this._contains = p;
    this.label('__container', !!p);
    return p;
  }

  _updateContainsCurrent() {
    const c = this.contains;
    if (c) {
      if (typeof c === 'function') {
        this.containsCurrent = this.contains(this._simulation);  // call using 'this.' not c
      }
      else if (c === 'within') {
        this.containsCurrent = this.enclosing('actor');
      }
      else if (c === 'centroid') {
        this.containsCurrent = this.enclosingCentroid('actor');
      }
      else if (c === 'overlap') {
        this.containsCurrent = this.overlapping('actor');
      }
      else {
        this.containsCurrent = c;
      }
    }
    else {
      this.containsCurrent = null;
      this.label('__container', null);
    }
  }

  regions(options) {
    this._assertSimulation();
    return regions(this, options);
  }

  autotile(options) {
    return autotile(
      this.enclosing('square'), {...options, _forceUseProbs: false });
  }


  // ========== proximity methods ==========

  squareOfCentroid() {
    this._assertSimulation();
    return this._simulation.squareOf(this.x, this.y);
  }

  layer(level = 1) {
    this._assertSimulation();
    assertInteger(level);
    if (!this.overlappingGrid) {
      return null;
    }
    const limits = this._simulation._bBoxIndices(this, this.radius);
    if (level) {
      return getLayer(this._simulation, level, limits);
    }
    else {
      const { xiMin, xiMax, yiMin, yiMax } = limits;
      const s = [];
      const gridSquares = this._simulation._grid.squares;
      for (let yi = yiMin; yi <= yiMax; yi++) {
        for (let xi = xiMin; xi <= xiMax; xi++) {
          s.push(gridSquares[yi][xi]);
        }
      }
      return s;
    }
  }

  insideDistance(otherAgent) {
    return insideDistance(this, otherAgent);
  }
  
  _insideNeighbors(maxDistance) {  // actor neighbors, no type parameter
    this._assertSimulation();
    if (!this.overlappingGrid) {
      return null;
    }
    let candidates;
    const innerRadius = this.radius - maxDistance - 1e-12;
    if (this.squares.size < 9 || innerRadius <= 0) {
      candidates = getOverlapping(this.squares, 'actor', this);
    }
    else {
      candidates = new XSet();
      const innerCircle = {
        _shape: 'circle',
        x: this.x,
        y: this.y,
        radius: innerRadius
      };
      for (let sq of this.squares) {
        if (!within(sq, innerCircle)) {
          candidates.adds(sq.actors);
        }
      }
      candidates.delete(this);
    }
    const r = [];
    for (let a of candidates) {
      const d = insideDistance(a, this);
      if (d >= -a.radius && d <= maxDistance) {
        r.push(a);
      }
    }
    return r;
  }

  _overlappingBoundaryCandidateSet() {  // actors only, no type parameter
    this._assertSimulation();
    if (this.radius <= 4 || this.squares.size < 9) {
      return getOverlapping(this.squares, 'actor', this);
    }
    const r = new XSet();
    const innerCircle = {
      _shape: 'circle',
      x: this.x,
      y: this.y,
      radius: this.radius - 2
    };
    for (let sq of this.squares) {
      if (!within(sq, innerCircle)) {
        r.adds(sq.actors);
      }
    }
    r.delete(this);
    return r;
  }

  neighbors(maxDistance, type) {
    this._assertSimulation();
    assertAgentType(type);
    if (!this.overlappingGrid) {
      return null;
    }
    if (!(maxDistance > 0)) {
      return [];
    }
    const { squares: gridSquares } = this._simulation._grid;
    const { xiMin, xiMax, yiMin, yiMax } =
      this._simulation._bBoxIndices(this, this.radius + maxDistance);
    let r;
    if (type === 'square') {
      r = [];
      for (let yi = yiMin; yi <= yiMax; yi++) {
        for (let xi = xiMin; xi <= xiMax; xi++) {
          const sq = gridSquares[yi][xi];
          if (this.squares.has(sq) || this.distance(sq) < maxDistance) {
            r.push(sq);
          }
        }
      }
    }
    else {
      r = new XSet();
      const prop = type + 's';
      for (let yi = yiMin; yi <= yiMax; yi++) {
        for (let xi = xiMin; xi <= xiMax; xi++) {
          r.adds(gridSquares[yi][xi][prop]);
        }
      }
      r.delete(this);
      r = r.filter(a => this.distance(a) < maxDistance, 'array');
    }
    return r;
  }

  overlapping(type) {
    this._assertSimulation();
    assertAgentType(type);
    if (!this.overlappingGrid) {
      return null;
    }
    if (type === 'square') {
      return [...this.squares];
    }
    else {
      let r;
      const prop = type + 's';
      if (this.squares.size === 1) {
        r = this.squares[Symbol.iterator]().next().value[prop];
      }
      else {
        r = new XSet();
        for (let sq of this.squares) {
          for (let a of sq[prop]) {
            if (a !== this) r.add(a);
          }
        }
      }
      return type === 'actor'
        ? r.filter(a => a !== this && this.isOverlapping(a), 'array')
        : [...r];
    }
  }

  within(type) {
    this._assertSimulation();
    assertAgentType(type);
    if (!this.overlappingGrid) {
      return null;
    }
    if (type !== 'actor' && !this.isWithin(this._simulation)) {
      return [];
    }
    if (type === 'square') {
      return this.squares.size === 1 ? [...this.squares] : [];
    }
    else {
      const prop = type + 's';
      let [firstSq, ...otherSquares] = this.squares;
      const firstSqCandidates = firstSq[prop].copy();
      firstSqCandidates.delete(this);
      const candidates =
        firstSqCandidates.intersection(...otherSquares.map(sq => sq[prop]));
      return type === 'zone'
        ? [...candidates]
        : candidates.filter(a => this.isWithin(a), 'array');
    }
  }

  _centroidIndices(dim) {
    const vs = this[dim] / this._simulation._grid.step;
    if (Number.isInteger(vs)) {
      const ns = this._simulation._grid['n' + dim];
      if (vs === 0) return [0];
      else if (vs === ns) return [ns - 1];
      else return [vs - 1, vs];
    }
    return [Math.floor(vs)]; 
  }

  centroidWithin(type) {
    this._assertSimulation();
    assertAgentType(type);
    if (!this.overlappingGrid) {
      return null;
    }
    if (!this.isCentroidWithin(this._simulation)) {
      return null;
    }
    const centroidSquares = [];
    for (let yi of this._centroidIndices('y')) {
      for (let xi of this._centroidIndices('x')) {
        centroidSquares.push(this._simulation.squareAt(xi, yi));
      }
    }
    if (type === 'square') {
      return centroidSquares;
    }
    else {
      const r = getOverlapping(centroidSquares, type, this);
      return type === 'zone'
        ? [...r]
        : r.filter(a => this.isCentroidWithin(a), 'array');
    }
  }

  _enclosing(type, testName) {
    this._assertSimulation();
    assertAgentType(type);
    if (!this.overlappingGrid) {
      return null;
    }
    return type === 'square'
      ? this.squares.filter(sq => this[testName](sq), 'array')
      : getOverlapping(this.squares, type, this).filter(
          a => this[testName](a), 'array');
  }

  enclosing(type) {
    return this._enclosing(type, 'isEnclosing');
  }

  enclosingCentroid(type) {
    return this._enclosing(type, 'isEnclosingCentroid');
  }
  
  nearest(k, filterFunction, type) {
    
    this._assertSimulation();
    assertPositiveInteger(k, 'k');
    assertAgentType(type);
    if (!this.overlappingGrid) {
      return null;
    }
    filterFunction ||= () => true;
    const gridStep = this._simulation.gridStep;
    
    // squares
    if (type === 'square') {
      const candidates = [];
      const dists = new Map();
      const neighbors = [];
      for (let sq of this.squares) {
        if (filterFunction(sq, this)) neighbors.push(sq);
        if (neighbors.length === k) return neighbors;
      }
      let level = 0;
      let layerSquares = this.layer(level);
      if (layerSquares.length > this.squares.size) {
        for (let sq of layerSquares) {
          if (!this.squares.has(sq) && filterFunction(sq, this)) {
            candidates.push(sq);
            dists.set(sq, this.distance(sq));
          }
        }
        candidates.sort((a, b) => dists.get(a) - dists.get(b));
      }
      sqOuterLoop: while (true) {
        layerSquares = this.layer(++level);
        if (layerSquares.length === 0) {
          while (candidates.length && neighbors.length < k) {
            neighbors.push(candidates.shift());
          }
          return neighbors;
        }
        for (let sq of layerSquares) {
          if (filterFunction(sq, this)) {
            candidates.push(sq);
            dists.set(sq, this.distance(sq));
          }
        }
        candidates.sort((a, b) => dists.get(a) - dists.get(b));
        const guaranteedDistance = level * gridStep;
        while (candidates.length) {
          const sq = candidates[0];
          if (dists.get(sq) <= guaranteedDistance) {
            neighbors.push(sq);
            candidates.shift();
            if (neighbors.length === k) return neighbors;
          }
          else {
            continue sqOuterLoop;
          }
        }
      }
    }

    // actors or zones
    else {
      const candidates = [];
      const dists = new Map();
      const neighbors = new Set();
      const rejected = new Set();
      const bBox = this._simulation._bBoxIndices(this, this.radius);
      const distanceToEdge =  // min dist from actor to edge of its squares bbox
        Math.max(Math.min(
          (this.x - this.radius) - (bBox.xiMin * gridStep),
          (bBox.xiMax + 1) * gridStep - (this.x + this.radius),
          (this.y - this.radius) - (bBox.yiMin * gridStep),
          (bBox.yiMax + 1) * gridStep - (this.y + this.radius)
        ), 0);
      let level = -1;
      outerLoop: while (true) {
        const layerSquares = this.layer(++level);
        if (layerSquares.length === 0) {
          while (candidates.length && neighbors.size < k) {
            neighbors.add(candidates.shift());
          }
          break outerLoop;
        }
        for (let a of getOverlapping(layerSquares, type, this)) {
          if (!neighbors.has(a) &&
              !dists.has(a) &&
              !rejected.has(a)) {
            if (filterFunction(a, this)) {
              candidates.push(a);
              dists.set(a, this.distance(a));
            }
            else {
              rejected.add(a);
            }
          }
        }
        candidates.sort((a, b) => dists.get(a) - dists.get(b));
        const guaranteedDistance = distanceToEdge + level * gridStep;
        while (candidates.length) {
          const a = candidates[0];
          if (dists.get(a) <= guaranteedDistance) {
            neighbors.add(a);
            candidates.shift();
            dists.delete(a);
            if (neighbors.size === k) break outerLoop;
          }
          else {
            continue outerLoop;
          }
        }
      }
      return [...neighbors];
    }

  }

  nearestFrom(k, candidates) {
    assertPositiveInteger(k, 'k');
    return nearestFrom(this, k, candidates);
  }


  // ========== update radius, mass, force, velocity, position ==========

  _updateRadiusAndMass() {
    if (this.updateRadius) {
      const radiusOld = this.radius;
      this.radius = this.updateRadius(this._simulation);
      this._assertPositiveProp('radius');
      if (!roughlyEqual(this.radius, radiusOld)) {
        this._updateOverlappingSquares();
        if (this.updateMass === 'area') {
          this.mass = Math.PI * this.radius ** 2;
        }
      }
    }
    if (this.updateMass && this.updateMass !== 'area') {
      this.mass = this.updateMass(this._simulation);
      this._assertPositiveProp('mass');
    }
  }

  _applySteeringForces() {
    // assume force has been reset, add all steering accelerations then multiply
    // by mass to get force
    for (let obj of this.steer.values()) {
      if (!(typeof obj.disabled === 'function'
            ? obj.disabled.call(this, this._simulation)
            : obj.disabled)) {
        const steeringAcc = this[`_${obj.behavior}`](obj);
        if (steeringAcc) {
          this._force.add(steeringAcc);
        }
      }  
    }
    this._force.mult(this.mass);
    if (this.steerMaxForce < Infinity) {
      this._force.limit(this.steerMaxForce);
    }
  }

  _optionValue(obj, optionName, def) {
    const option = obj[optionName];
    return typeof option === 'function'
      ? option.call(this, this._simulation) ?? def
      : option ?? def;
  }
   
  _seek(obj) {
    const target = this._optionValue(obj, 'target');
    if (!target) {
      return null;
    }
    const off = this._optionValue(obj, 'off', 0);
    let slowMultiplier = 1;
    const d = this[obj.proximity === 'centroid' || !target.__agent
      ? 'centroidDistance'
      : 'distance'
    ](target);
    if (d <= off) {
      return null;
    }
    const slow = this._optionValue(obj, 'slow', 0);
    const maxSpeed = this._optionValue(obj, 'maxSpeed', this.maxSpeed);
    if (d <= slow) {
      slowMultiplier = (d - off) / (slow - off);
    }
    return new Vector(target.x, target.y).sub(this)  // desired velocity
      .setMag(maxSpeed * slowMultiplier)             // scaled
      .sub(this.vel);                                // acceleration (i.e. change in velocity)
  }

  _flee(obj) {
    const target = this._optionValue(obj, 'target');
    if (!target) {
      return null;
    }
    const off = this._optionValue(obj, 'off', Infinity);
    let slowMultiplier = 1;
    const d = this[obj.proximity === 'centroid' || !target.__agent
      ? 'centroidDistance'
      : 'distance'
    ](target);
    if (d >= off) {
      return null;
    }
    const slow = this._optionValue(obj, 'slow', Infinity);
    const maxSpeed = this._optionValue(obj, 'maxSpeed', this.maxSpeed);
    if (d >= slow) {
      slowMultiplier = (off - d) / (off - slow);
    }
    return new Vector(this.x, this.y).sub(target)  // desired velocity
      .setMag(maxSpeed * slowMultiplier)           // scaled
      .sub(this.vel);                              // acceleration (i.e. change in velocity)
  }
    
  _wander(obj) {
    const wanderStrength = this._optionValue(obj, 'wanderStrength', 0.1);
    const wanderRate = this._optionValue(obj, 'wanderRate', 0.02);
    const maxSpeed = this._optionValue(obj, 'maxSpeed', this.maxSpeed);
    const negLimit = Math.max(-wanderRate, -(this._wanderAngle + wanderStrength)); 
    const posLimit = Math.min(wanderRate, wanderStrength - this._wanderAngle);
    this._wanderAngle += random.uniform_01() * (posLimit - negLimit) + negLimit;
    const heading = this.vel.x === 0 && this.vel.y === 0
      ? random.uniform_01() * Math.PI * 2
      : this.heading(); 
    return Vector.fromPolar(maxSpeed, heading + this._wanderAngle)
      .sub(this.vel);
  }

  _go(obj) {
    const nextPoint = obj.paths.get(this._simulation.squareOf(this.x, this.y));
    if (nextPoint) {
      return nextPoint.copy().sub(this)
        .setMag(this._optionValue(obj, 'maxSpeed', this.maxSpeed))
        .sub(this.vel);
    }
    return null;
  }

  _updateVelocityAndPosition() {
    if (this.maxForce < Infinity) {
      this._force.limit(this.maxForce);
    }
    this.vel.add(this._force.div(this.mass));
    this.vel.limit(this.maxSpeed);
    this._updateXY(this.x + this.vel.x, this.y + this.vel.y);
  }

  _estimateNextPosition() {
    return {
      x: this.x + this.vel.x,
      y: this.y + this.vel.y,
      radius: this.radius,
      _shape: 'circle'
    };
  }

}