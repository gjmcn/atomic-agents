////////////////////////////////////////////////////////////////////////////////
// Simulation class.
////////////////////////////////////////////////////////////////////////////////

import { random } from './random.js';
import { XSet } from './x-set.js';
import { Vector } from './vector.js';
import {
  assertInteger, normalizeAngle, getIndexLimits, getLayer, gridInRect,
  partitionRect, frame, setVisOptions, isIterable
} from './helpers.js';
import { Grid } from  './grid.js';
import { centroidDistanceSqd } from './centroid-distance.js';
import { insideDistance } from './inside-distance.js';
import * as d3 from 'd3-ease';
import { boundaryDistance } from './boundary-distance.js';
import { Zone } from './zone.js';
import { Actor } from './actor.js';
import { regions } from './regions.js';
import { randomCircles } from './random-circles.js';

export class Simulation {

  static single = false;
  static _currentSimulation = null;
  static visOptions = new Set([
    'baseColor',
    'baseAlpha',
    'background',
    'tint',
    'alpha',
    'image',
    'tile'
  ]);
  static updatableVisOptions = new Set([
    'tint',
    'alpha',
    'image'
  ]);

  constructor(options = {}) {
    this.width                  = options.width                  ?? 300;
    this.height                 = options.height                 ?? 300;
    this.gridStep               = options.gridStep               ?? 20;
    this.state                  = options.state                  ?? {};
    this.history                = options.history                ?? {};
    this.updateMassesAndRadii   = options.updateMassesAndRadii   ?? true;
    this.updatePointings        = options.updatePointings        ?? true;
    this.updateActorStates      = options.updateActorStates      ?? true;
    this.updateSquareStates     = options.updateSquareStates     ?? true;
    this.updateZoneStates       = options.updateZoneStates       ?? true;
    this.applyInteractionForces = options.applyInteractionForces ?? true;
    this.applySteeringForces    = options.applySteeringForces    ?? true;
    this.applyContainers        = options.applyContainers        ?? true;
    if (options.beforeTick) this.beforeTick = options.beforeTick;
    if (options.afterTick)  this.afterTick  = options.afterTick;
    if (options.stop)       this.stop       = options.stop;
    this.tickIndex      = -1;
    this._labels        = new Map();
    this.__simulation   = true;
    this._shape         = 'rect';
    this.xMin           = 0;
    this.xMax           = this.width;
    this.yMin           = 0;
    this.yMax           = this.height;
    this.x              = this.width / 2;
    this.y              = this.height / 2;
    this.actors         = new XSet();
    this.squares        = new XSet();
    this.zones          = new XSet();
    this._grid          = new Grid(this);
    this.xMinIndex      = 0
    this.xMaxIndex      = this._grid.nx - 1,
    this.yMinIndex      = 0
    this.yMaxIndex      = this._grid.ny - 1,
    this._actorsAdded   = new XSet();
    this._zonesAdded    = new XSet();
    this._actorsRemoved = new XSet();
    this._zonesRemoved  = new XSet();
    this.interaction    = new Map();
    this._pause         = false;
    this._finished      = false;
    this._bounceLogged  = new XSet();
    if (Simulation.single) {
      Simulation._currentSimulation?.end?.();
      Simulation._currentSimulation = this;
    }
    else {
      Simulation._currentSimulation = null;
    }
    // also: this._vis, this._visUpdates and this._interaction set by this.vis
  }

  vis(obj = {}) {
    return setVisOptions(this, Simulation, obj);
  }

  _addAgent(agent) {
    this[agent.type + 's'].add(agent);
    if (agent.type !== 'square') {
      this[`_${agent.type}sAdded`].add(agent);
    }
    for (let [name, value] of agent._labels) {
      this._agentLabelNew(agent, name, value);
    }
  }

  _removeAgent(agent) {
    this[agent.type + 's'].delete(agent);
    this[`_${agent.type}sRemoved`].add(agent);
    for (let [name, value] of agent._labels) {
      const m = this._labels.get(name);
      m.get(value).delete(agent);
      this._pruneLabels(name, value);
    }
  }

  _agentLabelNew(agent, name, value) {
    if (this._labels.has(name)) {
      const m = this._labels.get(name);
      m.has(value)
        ? m.get(value).add(agent)
        : m.set(value, new XSet([agent]));
    }
    else {
      this._labels.set(name, new Map([[value, new XSet([agent])]]));
    }
  }

  _agentLabelChange(agent, name, oldValue, newValue) {
    const m = this._labels.get(name);
    m.get(oldValue).delete(agent);
    if (m.get(oldValue).size === 0) {
      m.delete(oldValue);
    }
    m.has(newValue)
      ? m.get(newValue).add(agent)
      : m.set(newValue, new XSet([agent]));
  }

  _agentLabelDelete(agent, name, oldValue) {
    this._labels.get(name).get(oldValue).delete(agent);
    this._pruneLabels(name, oldValue);
  }

  _pruneLabels(name, value) {
    const m = this._labels.get(name);
    if (m.get(value).size === 0) {
      m.delete(value);
      if (m.size === 0) {
        this._labels.delete(name);
      }
    }
  }

  pause(p = true) {
    this._pause = !!p;
    return this;
  }

  end() {
    this._finished = true;
    return this;
  }

  run() {
    while(!(this._finished || this._pause)) this.tick();
    return this;
  }

  tick() {

    // finished or paused?
    if (this._finished || this._pause) return this;

    // increment tickIndex
    this.tickIndex++;

    // clear lists of added and removed agents
    this._actorsAdded.clear();
    this._zonesAdded.clear();
    this._actorsRemoved.clear();
    this._zonesRemoved.clear();

    // clear bounce logs
    for (let agent of this._bounceLogged) {
      agent.bounceLog.clear();
      this._bounceLogged.delete(agent);
    }
    
    // update containers
    if (this.applyContainers) {
      for (let agent of this.withLabel('__container')) {
        agent._updateContainsCurrent();
        agent._xChange = 0;
        agent._yChange = 0;
      }
    }

    // call beforeTick
    this.beforeTick?.();

    // update masses and radii
    if (this.updateMassesAndRadii) {
      for (let agent of this.actors) {
        agent._updateRadiusAndMass();
      }
    }

    // update pointings
    if (this.updatePointings) {
      for (let agent of this.actors) {
        if (agent.updatePointing) {
          agent.pointing = normalizeAngle(agent.updatePointing(this)); 
        }
      }
    }

    // apply steering forces
    if (this.applySteeringForces) {
      for (let agent of this.actors) {
        if (agent.overlappingGrid && !agent.still) {
          agent._applySteeringForces();
        }
      }
    }

    // apply interaction forces
    if (this.applyInteractionForces) {
      for (let obj of this.interaction.values()) {
        if (!(typeof obj.disabled === 'function'
              ? obj.disabled(this)
              : obj.disabled)) {
          this[`_${obj.behavior}`]({...obj});  // shallow copy obj so can mutate it
        }
      }
    }

    // update velocities and positions
    if (this.applyInteractionForces || this.applySteeringForces) {
      for (let agent of this.actors) {
        if (agent.still) {
          agent.vel.set(0, 0);
        }
        else {
          agent._updateVelocityAndPosition();
        }
        agent._force.set(0, 0);
      }
    }

    // shift contents of containers
    if (this.applyContainers) {
      for (let container of this.withLabel('__container')) {
        for (let agent of container.containsCurrent || []) {
          if (!agent.still) {
            agent._updateXY(
              agent.x + container._xChange,
              agent.y + container._yChange
            );
          }
        }
      }
    }

    // update states
    if (this.updateActorStates) {
      for (let agent of this.actors)  agent.updateState?.(this);
    }
    if (this.updateSquareStates) {
      for (let agent of this.squares) agent.updateState?.(this);
    }
    if (this.updateZoneStates) {
      for (let agent of this.zones)   agent.updateState?.(this);
    }

    // call afterTick
    this.afterTick?.();

    // call stop
    if (this.stop?.()) this._finished = true;
        
    return this;

  }

  withLabel(name, value = true) {
    return this._labels.get(name)?.get(value) || new XSet();
  }

  filter(f, returnArray) {
    let r, methodName;
    if (returnArray) {
      r = [];
      methodName = 'push';
    }
    else {
      r = new XSet();
      methodName = 'add';
    }
    for (let a of this.actors)  if (f(a)) r[methodName](a);
    for (let a of this.squares) if (f(a)) r[methodName](a);
    for (let a of this.zones)   if (f(a)) r[methodName](a);
    return r;
  }
  
  squareAt(xIndex, yIndex) {
    return this._grid.squares[yIndex]?.[xIndex];
  }
  
  squareAtIndex(index) {
    const nx = this._grid.nx;
    return this._grid.squares[Math.floor(index / nx)]?.[index % nx];
  }
  
  squareOf(x, y) {
    return this._grid.squares[
      y === this.height ? this._grid.ny - 1 : Math.floor(y / this.gridStep)
    ]?.[
      x === this.width  ? this._grid.nx - 1 : Math.floor(x / this.gridStep)
    ];
  }

  squaresInRect(rect) {
    let [xiMin, xiMax, yiMin, yiMax] = getIndexLimits(rect);
    if (xiMin > xiMax || 
        yiMin > yiMax ||
        xiMin > this.xMaxIndex ||
        xiMax < 0 ||
        yiMin > this.yMaxIndex ||
        yiMax < 0
       ) return [];
    xiMin = Math.max(0, xiMin);
    xiMax = Math.min(this.xMaxIndex, xiMax);
    yiMin = Math.max(0, yiMin);
    yiMax = Math.min(this.yMaxIndex, yiMax);
    const s = [];
    const gridSquares = this._grid.squares;
    for (let yi = yiMin; yi <= yiMax; yi++) {
      for (let xi = xiMin; xi <= xiMax; xi++) {
        s.push(gridSquares[yi][xi]);
      }
    }
    return s;
  }

  squaresInCircle(circle, contain = 'within') {
    const ac = new Actor(circle).addTo(this);
    const methodName = contain === 'overlap'
      ? 'overlapping'
      : contain === 'centroid'
        ? 'enclosingCentroid'
        : 'enclosing';
    const squares = ac[methodName]('square') || [];
    ac.remove();
    return squares;
  }

  layer(level = -1) {
    assertInteger(level);
    if (level < 0) {
      return getLayer(this, level, {
        xiMin: this.xMinIndex,
        xiMax: this.xMaxIndex,
        yiMin: this.yMinIndex,
        yiMax: this.yMaxIndex
      });
    }
    else if (level === 0) {
      return [...this.squares];
    }
    return [];
  }

  randomX(padding) {
    return padding
      ? random.uniform_01() * (this.width - 2 * padding) + padding
      : random.uniform_01() * this.width;
  }

  randomY(padding) {
    return padding
      ? random.uniform_01() * (this.height - 2 * padding) + padding
      : random.uniform_01() * this.height;
  }

  fitGrid(options) {
    return gridInRect(this, options);
  }

  randomCircles(options) {
    return randomCircles(this, options);
  }

  _populate(area, options) {
    const addToSim = options.addToSim || options.addToSim === undefined;
    const methodName = options.random ? 'randomCircles' : 'fitGrid';
    return area[methodName](options).map((c, i) => {
      if (methodName === 'fitGrid') {  // copy vector c to object and add radius 
        c = {
          x: c.x,
          y: c.y, 
          radius: typeof options.radius === 'function'
            ? options.radius(c.x, c.y, i)
            : options.radius
        };
      }
      c.mass = typeof options.mass === 'function'
        ? options.mass(c.x, c.y, i)
        : options.mass; 
      const ac = new Actor(c);
      if (addToSim) ac.addTo(area.__simulation ? area : area._simulation);
      options.setup?.(ac, i);
      return ac;
    });
  }

  populate(options) {
    return this._populate(this, options);
  }

  frame(period, steps) {
    return frame(period, steps, this.tickIndex);
  }


  // Squares overlapped by the bbox of point p (with props x and y, possibly an
  // actor) with 'radius' d. If p is partly outside the grid, this is not
  // equivalent to using the bbox of the part of p that is inside the grid.
  _bBoxIndices(p, d) {
    const { step, nx, ny } = this._grid;
    let xiMax = (p.x + d) / step;
    xiMax = Math.min(
      Number.isInteger(xiMax) ? xiMax - 1 : Math.floor(xiMax), nx - 1); 
    let yiMax = (p.y + d) / step;
    yiMax = Math.min(
      Number.isInteger(yiMax) ? yiMax - 1 : Math.floor(yiMax), ny - 1); 
    return {
      xiMin: Math.max(Math.floor((p.x - d) / step), 0),
      xiMax,
      yiMin: Math.max(Math.floor((p.y - d) / step), 0),
      yiMax
    };
  }

  partition(options = {}) {
    const addToSim = options.addToSim || options.addToSim === undefined;
    return partitionRect(this, options).map((r, i) => {
      const zn = new Zone({indexLimits: r});
      if (addToSim) zn.addTo(this);
      options.setup?.(zn, i);
      return zn;
    });
  }

  regions(options) {
    return regions(this, options);
  }

  // ========== proximity methods ==========

  _insideNeighbors(maxDistance) {  // actor neighbors, no type parameter
    const {step: gridStep, squares: gridSquares, nx, ny} = this._grid;
    const depth = Math.ceil((maxDistance + 1e-12) / gridStep);
    let candidates;
    if (depth * 2 >= Math.min(nx, ny)) {
      candidates = this.actors;
    }
    else {
      candidates = new XSet();
      for (let i = 0; i < ny; i++) {
        if (i < depth || i >= ny - depth) {
          for (let sq of gridSquares[i]) {
            candidates.adds(sq.actors);
          }
        }
        else {
          for (let j = 0; j < depth; j++) {
            candidates.adds(gridSquares[i][j].actors);
          }
          for (let j = nx - 1; j >= nx - depth; j--) {
            candidates.adds(gridSquares[i][j].actors);
          }
        }
      }
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

  // actor neighbors of agent p; if p is an actor, it is not included in result
  _pointNeighbors(p, maxDistance) {

    if (p.type === 'actor' && !p.overlappingGrid) {
      return null;
    }
    
    // if maxDistance >= to furthest corner of grid, consider all actors
    const maxDistanceSqd = maxDistance ** 2;
    if (Math.max(p.x, (this.xMax - p.x)) ** 2 + 
        Math.max(p.y, (this.yMax - p.y)) ** 2
          >= maxDistanceSqd) {
      return this.actors.filter(a => {
        return a.overlappingGrid &&
               a !== p &&
               centroidDistanceSqd(a, p) < maxDistanceSqd
      }, 'array');
    }

    // use squares in radius of maxDistance from p
    const gridSquares = this._grid.squares;
    const {xiMin, xiMax, yiMin, yiMax} = this._bBoxIndices(p, maxDistance);
    const candidates = new XSet();
    for (let yi = yiMin; yi <= yiMax; yi++) {
      for (let xi = xiMin; xi <= xiMax; xi++) {
        candidates.adds(gridSquares[yi][xi].actors);
      }
    }
    candidates.delete(p);
    return candidates
      .filter(a => centroidDistanceSqd(a, p) < maxDistanceSqd, 'array');

  }

  _overlappingBoundaryCandidateSet() {  // actors only, no type parameter
    const {squares: gridSquares, nx, ny} = this._grid;
    if (nx === 1 || ny === 1) {
      return this.actors.filter(a => a.overlappingGrid);
    }
    const r = new XSet();
    for (let sq of gridSquares[0]) {
      r.adds(sq.actors);
    }
    for (let i = 1; i < ny - 1; i++) {
      r.adds(gridSquares[i][0].actors);
      r.adds(gridSquares[i][nx - 1].actors);
    }
    for (let sq of gridSquares[ny - 1]) {
      r.adds(sq.actors);
    }
    return r;
  }


  // ========== interaction forces ==========

  _getForcesGroups(obj) {
    let {group1: g1, group2: g2} = obj;
    g1 = typeof g1 === 'function' ? g1(this) : g1;
    g2 = g2
      ? (typeof g2 === 'function' ? g2(this) : g2)
      : g1;
    if (g2 !== this.actors) { 
      for (let a of g2) {
        if (!a.__agent || a.type !== 'actor') {
          throw Error('group2 must only contain actors');
        }
      }
    }
    if (g1 === g2) {
      if (!(g1 instanceof Set)) {
        g2 = g1 = new Set(g1);
      }
    }
    else {
      if (g1 !== this && !(g1 instanceof Set)) {
        g1 = new Set(g1);
      }
      if (!(g2 instanceof Set)) {
        g2 = new Set(g2);
      }
    }
    return [g1, g2];
  }

  _optionValue(obj, optionName, def) {
    const option = obj[optionName];
    return typeof option === 'function'
      ? option(this) ?? def
      : option ?? def;
  }

  _bounce(obj) {

    obj.speed = this._optionValue(obj, 'speed');
    let [g1, g2] = this._getForcesGroups(obj);

    // group1 is the grid
    if (g1 === this) {
      for (let cand of (this._overlappingBoundaryCandidateSet())) {
        if (g2.has(cand) && !cand.still) {
          const ba = this._bounceAcc(this, cand, obj);
          if (ba) {
            cand._force.add(ba.mult(cand.mass));
          }
        }
      }
    }

    else {
      const usingOverlap = obj.proximity === 'overlap';
      for (let a1 of g1) {
        const a1IsActor = a1.type === 'actor';
        const a1AddForce = g1 !== g2 && a1IsActor && !a1.still && !obj.inward;
        for (let cand of a1._overlappingBoundaryCandidateSet()) {
          if (g2.has(cand)) {
            const aCentroidEnclosed = usingOverlap
              ? null
              : a1.isEnclosingCentroid(cand) || cand.isEnclosingCentroid(a1);
            if (usingOverlap
                ? a1.isOverlapping(cand)
                : obj.inward
                  ? aCentroidEnclosed
                  : !aCentroidEnclosed && a1.isOverlapping(cand)
                ) {
              if (obj.log || obj.logOnly) {
                a1.bounceLog.add(cand);
                cand.bounceLog.add(a1);
                this._bounceLogged.add(cand);
                this._bounceLogged.add(a1);
              }
              if (!obj.logOnly) {
                if (!cand.still) {
                  const ba = this._bounceAcc(a1, cand, obj);
                  if (ba) {
                    cand._force.add(ba.mult(cand.mass));
                  }
                }
                if (a1AddForce) {
                  const ba = this._bounceAcc(cand, a1, obj);
                  if (ba) {
                    a1._force.add(ba.mult(a1.mass));
                  }
                }
              }
            }
          }
        }
      }
    }
    
  }

  _bounceAcc(region, actor, obj) {
    
    const { speed } = obj;    
    const inward = region === this ? 'true' : obj.inward;

    // region is grid, square or zone
    if (region._shape === 'rect') {

      const xOverlap = actor.x < region.x
        ? actor.x + actor.radius - region.xMin
        : region.xMax - (actor.x - actor.radius);
      const yOverlap = actor.y < region.y
        ? actor.y + actor.radius - region.yMin
        : region.yMax - (actor.y - actor.radius);
      if (xOverlap >= 2 * actor.radius && yOverlap >= 2 * actor.radius) {
        return;
      }

      // if outward, want to flip velocity on dim with least overlap; for
      // inward, want dim with greatest 'outerlap' (which is least overlap!)
      const dim = xOverlap >= yOverlap ? 'y' : 'x';

      // no new force if inward and bounce would decrease alignment of velocity
      // vector with actor->region vector; opposite for outward
      if (actor.vel[dim] * (region[dim] - actor[dim]) * (inward ? 1 : -1) > 0) {
        return;
      }

      const u = actor.vel.copy();
      u[dim] *= -1;
      return u.sub(actor.vel);

    }

    // region is actor; inward force
    else if (inward) {  // region is an actor - i.e. circular
      const d = region.centroidDistance(actor);
      if (d <= region.radius && d >= region.radius - actor.radius) {
        const velHeading = actor.vel.heading();
        const regionActorHeading = Math.atan2(actor.y - region.y, actor.x - region.x);
        const theta = velHeading - regionActorHeading;
        const diff = Math.abs(theta) % (2 * Math.PI);
        if (Math.min(diff, 2 * Math.PI - diff) >= Math.PI / 2) {
          return;
        }
        const u = actor.vel.copy().mult(-1);
        return u.setHeading(u.heading() - 2 * theta).sub(actor.vel);
      }
    }

    // region is actor; outward force
    else { 

      // unit normal (i.e. region -> actor)
      let un_x = actor.x - region.x,
          un_y = actor.y - region.y,
          unMag = Math.sqrt(un_x ** 2 + un_y ** 2);
      un_x /= unMag;
      un_y /= unMag;

      // actor 'normal speed' (velocity projection onto normal)
      // - region normal speed (rns) computed below if region not still
      const ans = un_x * actor.vel.x  + un_y * actor.vel.y;

      // actor 'tangent speed' (velocity projection onto tangent)      
      const ats = -un_y * actor.vel.x + un_x * actor.vel.y;

      // new actor normal speed
      let new_ans;
      if (region.still) {
        new_ans = -ans;
      }
      else {
        const rns = un_x * region.vel.x + un_y * region.vel.y;
        new_ans = (ans * (actor.mass - region.mass) + (2 * region.mass * rns)) / 
                    (region.mass + actor.mass);
      }

      // desired velocity
      const dv = new Vector(un_x, un_y).mult(new_ans);
      dv.x += -un_y * ats;
      dv.y +=  un_x * ats;
      if (typeof speed === 'number') dv.setMag(speed);

      // if overlap after move then 'amplify the bounce'
      const d = region.centroidDistance(actor);
      const dNext = Math.sqrt((region.x - (actor.x + dv.x)) ** 2 +
                              (region.y - (actor.y + dv.y)) ** 2);
      if (dNext < d) {
        const amp = d / dNext / 2;
        dv.x += un_x * amp;
        dv.y += un_y * amp;
      }

      // change in velocity - i.e. acceleration
      return dv.sub(actor.vel);
    }

  }

  _attract(obj) {
    this._attractRepelAvoid(obj);
  }

  _repel(obj) {
    this._attractRepelAvoid(obj);
  }

  _avoid(obj) {
    this._attractRepelAvoid(obj);
  }

  _attractRepelAvoid(obj) {

    obj.strength = this._optionValue(obj, 'strength', 1);
    obj.off = this._optionValue(obj, 'off', 30);
    obj.ease ??= 'easeLinear';
    let [g1, g2] = this._getForcesGroups(obj);
    const isAvoid = obj.behavior === 'avoid';
    if (isAvoid) {
      obj.inward = false;
      obj.proximity = 'overlap';
    }
    else {
      obj.decay ??= true;
    }

    // group1 is the grid
    if (g1 === this) {
      if (isAvoid) {
        throw Error('cannot use avoid force with the simulation grid');
      }
      for (let cand of this._insideNeighbors(obj.off)) {
        if (g2.has(cand) && !cand.still) {
          this._addAttractRepelForce(this, cand, obj);
        }
      }
    }
    
    else {
      const addForceFunc = isAvoid ? '_addAvoidForce' : '_addAttractRepelForce';
      const agentsDone = g1 === g2 && !obj.inward ? new Set() : null;
      for (let a1 of g1) {
        const a1AddForce = !obj.inward && a1.type === 'actor' && !a1.still;
        const a1Next = isAvoid && a1AddForce && !obj.recover
          ? a1._estimateNextPosition()
          : null;
        const candidates = obj.inward
          ? a1._insideNeighbors(obj.off)
          : (obj.proximity === 'centroid')
            ? this._pointNeighbors(a1, obj.off)
            : a1.neighbors(obj.off, 'actor');
        for (let cand of candidates || []) {
          if (g2.has(cand) &&
               (a1AddForce || !cand.still) &&
               (g1 !== g2 || !agentsDone?.has(cand))) {
            this[addForceFunc](a1, cand, obj, a1AddForce, a1Next);
          }
        }
        agentsDone?.add(a1);  
      }
    }

  }
  
  _addAttractRepelForce(a1, a2, obj, a1AddForce) {
    const isInward = a1 === this || obj.inward;
    const d = isInward
      ? insideDistance(a2, a1)
      : a1[obj.proximity === 'centroid' ? 'centroidDistance' : 'distance'](a2);
    let multiplier = d / obj.off;
    if (obj.decay) {
      multiplier = 1 - multiplier;
    }
    multiplier =
      d3[obj.ease](multiplier) * (a1.mass ?? a2.mass) * a2.mass * obj.strength;
    if (isInward) {
      multiplier *= -1;
    }
    if (obj.behavior === 'repel') {
      multiplier *= -1;
    }
    let u = new Vector(a1.x - a2.x, a1.y - a2.y);
    if (u.x === 0 && u.y === 0) {
      if (multiplier < 0) {
        u = Vector.randomAngle();
      }
    }
    else {
      u.normalize();
    }
    if (!a2.still) {
      a2._force.add((a1AddForce ? u.copy() : u).mult(multiplier));
    }
    if (a1AddForce) {
      a1._force.add(u.mult(-multiplier));
    }
  }

  _addAvoidForce(a1, a2, obj, a1AddForce, a1Next) {
    const d = a1.distance(a2);
    if (!obj.recover &&
        boundaryDistance(a1Next ?? a1, a2._estimateNextPosition()) > d) {
      return;
    }
    const multiplier = d3[obj.ease](1 - d / obj.off) * obj.strength *
      (a1.mass ?? a2.mass) * a2.mass;
    let u1, u2;
    let diffVec = new Vector(a1.x - a2.x, a1.y - a2.y);
    if (!a2.still) {
      if (diffVec.isZero()) {  // cannot project onto zero vector
        u2 = Vector.randomAngle();
      }
      else if (a2.vel.isZero()) {
        u2 = diffVec.getUnitNormal();
      }
      else {
        u2 = a2.vel.vecRejec(diffVec);
        if (u2.isZero()) {  // a2 velocity and diffVec aligned 
          u2 = diffVec.getUnitNormal();
        }
        else {
          u2.normalize();
        }
      }
      a2._force.add(u2.mult(multiplier));
    }
    if (a1AddForce) {
      diffVec.mult(-1);
      if (diffVec.isZero()) {  // cannot project onto zero vector
        u1 = Vector.randomAngle();
      }
      else if (a1.vel.isZero()) {
        u1 = diffVec.getUnitNormal();
      }
      else {
        u1 = a1.vel.vecRejec(diffVec);
        if (u1.isZero()) {  // a1 velocity and diffVec aligned 
          u1 = diffVec.getUnitNormal();
        }
        else {
          u1.normalize();
        }
      }
      if (u2) {  // flip u1 if angle between u1 and u2 is less then pi/2
        const uDiff = Math.abs(u1.heading() - u2.heading());
        if (uDiff < Math.PI / 2 || uDiff > 3 * Math.Pi / 2) {
          u1.mult(-1);
        }
      }
      a1._force.add(u1.mult(multiplier));
    }
  }

  _insideForce(obj) {
    
    let [g1, g2] = this._getForcesGroups(obj);
    const { proximity } = obj;
    let forceFunc;
    if (obj.behavior === 'drag') {
      const strength = this._optionValue(obj, 'strength', 1);
      forceFunc = (_, actor) => actor.vel.copy().mult(-strength * actor.mass);
    }
    else if (obj.behavior === 'custom') {
      forceFunc = typeof obj.force === 'function' ? obj.force : () => obj.force;
    }
    
    // group1 is the grid
    if (g1 === this) {
      for (let a2 of g2) {
        if (a2.overlappingGrid && !a2.still) {
          if (proximity === 'within') {
            if (!a2.isWithin(this)) continue;
          }
          else if (proximity !== 'overlap') {
            if (!a2.isCentroidWithin(this)) continue;  
          }
          a2._force.add(forceFunc(null, a2));
        }
      }
    }

    else {
      const methodName = proximity === 'overlap'
        ? 'overlapping'
        : (proximity === 'within' ? 'enclosing' : 'enclosingCentroid');
      for (let a1 of g1) {
        for (let cand of a1[methodName]('actor') || []) {
          if (!cand.still && g2.has(cand)) {
            cand._force.add(forceFunc(a1, cand));
          }
        }
      }
    }
  
  }

  _custom(obj) {
    this._insideForce(obj);
  }

  _drag(obj) {
    this._insideForce(obj);
  }

  _pointInGrid(p) {
    return p.x >= this.xMin &&
           p.x <= this.xMax &&
           p.y >= this.yMin &&
           p.y <= this.yMax;
  }


  // ========== process polylines ==========

  // get a function that takes a point (i.e. an object with x and y properties)
  // and returns information about the nearest point on the given polylines (an
  // object with the same structure as returned by polyline.pointNearest, but
  // with a line property added) or null if no polyline is close according to
  // off
  // - polylines argument can be a singe polyline or an iterable of polylines
  // - off is distance above which do not consider point to be close
  // - when using the returned function, the passed point must be in the grid
  //   (i.e. its x,y must be in the grid) or it must be an actor in the
  //   simulation that overlaps the grid
  registerPolylines(polylines, off = Infinity) {

    if (!isIterable(polylines)) polylines = [polylines];
    
    for (let line of polylines) {
      for (let pt of line.pts) {
        if (!this._pointInGrid(pt)) {
          throw Error('polylines must lie within the simulation grid');
        }
      }
    }

    // squareSegs is an array-of-arrays (same shape as grid): for each square,
    // squareSegs has an array of {line, segIndex, dist} objects (the segments
    // that may contain the closest point to some point in the square) - the
    // array is empty if no segments are close according to the value of off
    const halfDiag = Math.sqrt(2 * this.gridStep ** 2) / 2;
    const squareSegs = this._grid.squares.map(row => {
      return row.map(sq => {
        const candidateSegs = [];
        let minDist = Infinity;
        for (let line of polylines) {
          for (let segIndex of line.segs.keys()) {
            const dist = line._distanceFromSeg(sq, segIndex);
            // if the segment does not overlap the square, dist - halfDiag is a
            // lower bound on the min distance from any point in the square to
            // the segment
            if (dist - halfDiag <= off) {
              minDist = Math.min(dist, minDist);
              candidateSegs.push({line, segIndex, dist});
            }
          }
        }
        // minDist + halfDiag is an upper bound on the distance from any point
        // in the square to the segment corresponding to minDist
        return candidateSegs.filter(obj => obj.dist <= minDist + halfDiag);
      });
    });

    // return a function
    return p => {
      let sq;
      if (this._pointInGrid(p)) {
        sq = this.squareOf(p.x, p.y);
      }
      else if (this.actors.has(p) && p.overlappingGrid) {
        let minDistToSq = Infinity;
        for (let s of p.squares) {
          const dist = p.centroidDistance(s);
          if (dist < minDistToSq) {
            minDistToSq = dist;
            sq = s;
          }
        }
      }
      else {
        return null;
      }
      const candidateSegs = squareSegs[sq.yIndex][sq.xIndex];
      if (candidateSegs.length === 0) return null;
      let minDist = Infinity;
      let best;
      let bestLine;
      for (let {line, segIndex} of candidateSegs) { 
        const pn = line._pointNearestOnSeg(p, segIndex);
        if (pn.dist < minDist) {
          minDist = pn.dist;
          best = pn;
          bestLine = line;
        }
      }
      if (minDist > off) return null;
      best.line = bestLine;
      return best;
    };

  }

  
  // ========== shortest paths ==========

  // given square or zone, or iterable of squares/zones ... (nested to any
  // depth), return a unique set of the included squares
  _uniqueSquares(squares) {
    const updateUniqueSquares = (s, result) => {
      if (s.type === 'square') {
        result.add(s);
      }
      else if (s.type === 'zone') {
        if (!this.zones.has(s)) {
          throw Error('zone does not belong to this simulation');
        }
        for (let sq of s.squares) { 
          result.add(sq);
        }
      }
      else {
        for (let t of s) {
          updateUniqueSquares(t, result);
        }
      }
      return result;
    }; 
    return updateUniqueSquares(squares, new Set());
  }

  // partition an iterable of squares into an xset of xsets; each inner xset is
  // a rectangle of squares.
  _splitIntoRects(s) {

    // convert s to a new array of squares ordered by their index property
    s = [...s].sort((a, b) => a.index - b.index);

    // merge squares horizontally - each rect is 1 square high and is an object
    // with properties: xMinIndex, xMaxIndex, yMinIndex, yMaxIndex
    const rects = new Map();  // each key is the yMinIndex of rects in that row
    {
      let rect;
      const newRect = sq => {
        rect = { 
          xMinIndex: sq.xIndex,
          xMaxIndex: sq.xIndex,
          yMinIndex: sq.yIndex,
          yMaxIndex: sq.yIndex
        };
      };
      const addRect = () => rects.has(rect.yMinIndex)
        ? rects.get(rect.yMinIndex).add(rect)
        : rects.set(rect.yMinIndex, new Set([rect]));
      for (let sq of s) {
        if (rect) {
          if (sq.xIndex === rect.xMaxIndex + 1 && sq.yIndex === rect.yMinIndex) {
            rect.xMaxIndex++;
          }
          else {
            addRect();
            newRect(sq);
          }
        }
        else {
          newRect(sq);
        }
      }
      if (rect) {
        addRect();
      }
    }

    // merge rectangles vertically
    const ny = this._grid.ny;
    for (let i = 0; i < ny - 1; i++) {  // all but last row
      for (let top of rects.get(i) || []) {
        for (let btm of rects.get(i + 1) || []) {
          if (top.xMinIndex === btm.xMinIndex) {
            if (top.xMaxIndex === btm.xMaxIndex) {
              btm.yMinIndex = top.yMinIndex;
              rects.get(i).delete(top);
            }
            break;
          }
          else if (top.xMinIndex < btm.xMinIndex) {
            break;
          }
        }
      }
    }

    // set of squares for each rect
    const rectSquares = new XSet();
    for (let row of rects.values()) {
      for (let rect of row) {
        rectSquares.add(new XSet(this.squaresInRect([
          rect.xMinIndex,
          rect.xMaxIndex,
          rect.yMinIndex,
          rect.yMaxIndex
        ])));
      }
    }

    return rectSquares;

  }

  // returns a map with the same keys as destsArg; each value is a map:
  //   each key is a square; the value is the next point (vector) to steer to -
  //   or undefined for destination squares and squares which cannot reach
  //   destination squares.
  paths(destsArg, costsArg = [], taxicab) {
        
    // costs and cost sets
    const costs = new Map();
    for (let sq of this.squares) {
      costs.set(sq, 0);
    }
    const costSets = new Map();
    for (let [s, v] of costsArg) {
      const cs = this._uniqueSquares(s);
      for (let sq of cs) {
        costs.set(sq, costs.get(sq) + v);
      }
      if (!taxicab) {
        if (s.type === 'square' || s.type === 'zone') {
          costSets.set(cs, v);
        }
        else {
          for (let r of this._splitIntoRects(cs)) {
            costSets.set(r, v);
          }
        }
      }
    }
    
    // if not using taxicab:
    //  - check no square in more than one cost set
    //  - add rectangles to cover squares not in any cost set
    if (!taxicab) {
      const allCostSquares = new XSet();
      let sizeSum = 0;
      for (let cs of costSets.keys()) {
        allCostSquares.adds(cs);
        sizeSum += cs.size;
      }
      if (allCostSquares.size < sizeSum) {
        throw Error(
          'cost sets can only have common squares if using taxicab option');
      }
      if (allCostSquares.size < this.squares.size) {
        for (let r of
              this._splitIntoRects(this.squares.difference(allCostSquares))) {
          costSets.set(r, 0);
        }
      }
    }
    
    // Floyd-Warshall - setup
    const dists = new Map();
    const next = new Map();
    for (let sq1 of this.squares) {
      const distsRow = new Map();
      const nextRow = new Map();
      dists.set(sq1, distsRow);
      next.set(sq1, nextRow);
      for (let sq2 of this.squares) {
        if (sq1 === sq2) {
          distsRow.set(sq2, 0);
          nextRow.set(sq2, sq2);
        }
        else {
          distsRow.set(sq2, Infinity);
        }
      }
    }
    const { nx, ny, squares: gridSquares, step: gridStep } = this._grid;
    function useEdgeWeight(sq1, sq2) {
      dists.get(sq1).set(sq2, gridStep + costs.get(sq2));
      dists.get(sq2).set(sq1, gridStep + costs.get(sq1));
      next.get(sq1).set(sq2, sq2);
      next.get(sq2).set(sq1, sq1);
    }
    for (let i = 0; i < ny; i++) {
      for (let j = 0; j < nx; j++) {
        if (i < ny - 1) {
          useEdgeWeight(gridSquares[i][j], gridSquares[i + 1][j]);  // square below
        }
        if (j < nx - 1) {
          useEdgeWeight(gridSquares[i][j], gridSquares[i][j + 1]);  // square to right
        }
      }
    }

    // add diagonal edges
    // (do not add longer horizontal/vertical edges since leads to less natural
    // trajectories for long horiz/vert paths with turn at start/end)
    if (!taxicab) {
      for (let [cs, v] of costSets) {
        const csn = cs.size;
        if (csn === 1) {
          continue;
        }
        cs = [...cs];
        for (let i = 0; i < csn; i++) {
          const sq1 = cs[i];
          for (let j = i + 1; j < csn; j++) {
            const sq2 = cs[j];
            if (sq1.x !== sq2.x && sq1.y !== sq2.y) {
              const w = Math.sqrt((sq1.xIndex - sq2.xIndex) ** 2 +
                                  (sq1.yIndex - sq2.yIndex) ** 2)
                        * (gridStep + v);
              dists.get(sq1).set(sq2, w);
              dists.get(sq2).set(sq1, w);
              next.get(sq1).set(sq2, sq2);
              next.get(sq2).set(sq1, sq1);
            }
          }
        }
      }
    }
  
    // Floyd-Warshall - compute shortest paths
    const finiteCostSquares =
      this.squares.filter(sq => costs.get(sq) < Infinity, 'array');
    for (let sq3 of finiteCostSquares) {
      const distsRow_sq3 = dists.get(sq3);
      for (let sq1 of this.squares) {
        if (sq1 === sq3) {
          continue;
        }
        const distsRow_sq1 = dists.get(sq1);
        const nextRow_sq1 = next.get(sq1);
        for (let sq2 of finiteCostSquares) {
          if (sq1 === sq2 || sq2 === sq3) {
            continue;
          }
          const dNew = distsRow_sq1.get(sq3) + distsRow_sq3.get(sq2);
          if (dNew < distsRow_sq1.get(sq2)) {
            distsRow_sq1.set(sq2, dNew);
            nextRow_sq1.set(sq2, nextRow_sq1.get(sq3));
          }
        }
      }
    }

    // Floyd-Warshall - next points
    const results = new Map();
    for (const [destName, destCollection] of destsArg) {

      // destination squares
      const destSquares = this._uniqueSquares(destCollection);

      // next square of every square (except destination squares and squares
      // with no finite route to a destination square)
      const nextSquares = new Map();
      for (let sq of this.squares) {
        if (!destSquares.has(sq)) {
          let d = Infinity;
          let targetSq;
          for (let destSq of destSquares) {
            const dNew = dists.get(sq).get(destSq); 
            if (dNew < d) {
              d = dNew;
              targetSq = destSq;
            }
          }
          if (targetSq) {
            nextSquares.set(sq, next.get(sq).get(targetSq));
          }
        }
      }

      // next point (vector) to aim at for each square with a next square -
      // uses the next square's next square!
      const nextPoints = new Map();
      for (let [sq, nextSq] of nextSquares) {
        const nextNextSq = nextSquares.get(nextSq);
        nextPoints.set(sq,
          !nextNextSq
            ? Vector.fromObject(nextSq)
            : taxicab
              ? Vector.fromObject(nextSq).add(nextNextSq).div(2)
              : Vector.fromObject(nextNextSq).sub(nextSq)
                .setMag(gridStep / 2)
                .add(nextSq) 
        );
      }
      results.set(destName, nextPoints);

    }
    
    return results;
  
  }

}