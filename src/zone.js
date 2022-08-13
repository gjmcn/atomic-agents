////////////////////////////////////////////////////////////////////////////////
// Zone class.
////////////////////////////////////////////////////////////////////////////////

import { XSet } from './x-set.js';
import { assertAgentType, assertInteger, getOverlapping, getIndexLimits,
  getLayer, partitionRect, setVisOptions } from './helpers.js';
import { Agent } from "./agent.js";
import { insideDistance } from "./inside-distance.js";
import { regions } from './regions.js';

export class Zone extends Agent {

  static visOptions = new Set([...Agent.visOptions,
    'tile',
    'textPosition',
    'textPadding',
  ]);

  static updatableVisOptions = Agent.updatableVisOptions;

  constructor(options = {}) {
    super(options);
    this.type      = 'zone';
    this._shape    = 'rect';
    this.zIndex    = options.zIndex    ?? -Infinity;
    this.direction = options.direction ?? 0;
    this.squares   = null;
    this.xMin      = null;
    this.xMax      = null;
    this.yMin      = null;
    this.width     = null;
    this.height    = null;
    [this.xMinIndex, this.xMaxIndex, this.yMinIndex, this.yMaxIndex] =
      getIndexLimits(options.indexLimits);
    this._resetOnRemove =
      ['xMin', 'xMax', 'yMin', 'yMax', 'width', 'height', 'squares'];
    for (let name of ['xMinIndex', 'xMaxIndex', 'yMinIndex', 'yMaxIndex']) {
      const value = this[name];
      if (!Number.isInteger(value) || value < 0) {
        throw Error(`invalid ${name}, non-negative integer expected`);
      }
    }
    if (this.xMinIndex > this.xMaxIndex) {
      throw Error('xMinIndex cannot be greater than xMaxIndex');
    }
    if (this.yMinIndex > this.yMaxIndex) {
      throw Error('yMinIndex cannot be greater than yMaxIndex');
    }
    this.nx = this.xMaxIndex - this.xMinIndex + 1;
    this.ny = this.yMaxIndex - this.yMinIndex + 1;
  }

  vis(obj = {}) {
    return setVisOptions(this, Zone, obj);
  }

  addTo(simulation) {
    this._validateSimulation(simulation);
    if (simulation.nx <= this.xMaxIndex ||
        simulation.ny <= this.yMaxIndex) {
      throw Error('zone is not inside the simulation grid');
    }
    this.squares = new XSet();
    for (let yi = this.yMinIndex; yi <= this.yMaxIndex; yi++) {
      for (let xi = this.xMinIndex; xi <= this.xMaxIndex; xi++) {
        const sq = simulation._grid.squares[yi][xi];
        this.squares.add(sq);
        sq.zones.add(this);
      }
    }
    const topLeftSquare =
      simulation._grid.squares[this.yMinIndex][this.xMinIndex];
    const bottomRightSquare =
      simulation._grid.squares[this.yMaxIndex][this.xMaxIndex]; 
    this.xMin = topLeftSquare.xMin;
    this.xMax = bottomRightSquare.xMax;
    this.yMin = topLeftSquare.yMin;
    this.yMax = bottomRightSquare.yMax;
    this.x = (this.xMin + this.xMax) / 2;
    this.y = (this.yMin + this.yMax) / 2;
    this.width  = simulation.gridStep * this.nx;
    this.height = simulation.gridStep * this.ny;
    this._addToSimulation(simulation);
    return this;
  }

  layer(level = 1) {
    this._assertSimulation();
    assertInteger(level);
    if (level) {
      return getLayer(this._simulation, level, {
        xiMin: this.xMinIndex,
        xiMax: this.xMaxIndex,
        yiMin: this.yMinIndex,
        yiMax: this.yMaxIndex
      });
    }
    else {
      return [...this.squares];
    }
  }

  partition(options = {}) {
    const addToSim = options.addToSim || options.addToSim === undefined;
    if (addToSim && !this._simulation) {
      throw Error(
        'cannot add zones to simulation - calling zone is not in a simulation'
      );
    }
    return partitionRect(this, options).map((r, i) => {
      const zn = new Zone({indexLimits: r});
      if (addToSim) zn.addTo(this._simulation);
      options.setup?.(zn, i);
      return zn;
    });
  }

  regions(options) {
    this._assertSimulation();
    return regions(this, options);
  }


  // ========== proximity methods ==========

  _insideNeighbors(maxDistance) {  // actor neighbors, no type parameter
    this._assertSimulation();
    const {step: gridStep, squares: gridSquares} = this._simulation._grid;
    const depth = Math.ceil((maxDistance + 1e-12) / gridStep);
    let candidates;
    if (depth * 2 >=
          Math.min(this.xMaxIndex - this.xMinIndex,
                   this.yMaxIndex - this.yMinIndex) + 1) {
      candidates = this.overlapping('actor');
    }
    else {
      candidates = new XSet();
      for (let i = this.yMinIndex; i <= this.yMaxIndex; i++) {
        if (i < this.yMinIndex + depth || i > this.yMaxIndex - depth) {
          for (let j = this.xMinIndex; j <= this.xMaxIndex; j++) {
            candidates.adds(gridSquares[i][j].actors);
          }
        }
        else {
          for (let j = this.xMinIndex; j < this.xMinIndex + depth; j++) {
            candidates.adds(gridSquares[i][j].actors);
          }
          for (let j = this.xMaxIndex; j > this.xMaxIndex - depth; j--) {
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

  _overlappingBoundaryCandidateSet() {  // actors only, no type parameter
    this._assertSimulation();
    if (this.xMinIndex === this.xMaxIndex ||
        this.yMinIndex === this.yMaxIndex) {
      return getOverlapping(this.squares, 'actor');
    }
    const gridSquares = this._simulation._grid.squares;
    const r = new XSet();
    for (let i = this.xMinIndex; i <= this.xMaxIndex; i++) {
      r.adds(gridSquares[this.yMinIndex][i].actors);
      r.adds(gridSquares[this.yMaxIndex][i].actors);
    }
    for (let i = this.yMinIndex + 1; i < this.yMaxIndex; i++) {
      r.adds(gridSquares[i][this.xMinIndex].actors);
      r.adds(gridSquares[i][this.xMaxIndex].actors);
    }
    return r;
  }

  neighbors(maxDistance, type) {
    this._assertSimulation();
    assertAgentType(type);
    if (!(maxDistance > 0)) {
      return [];
    }
    let r;
    const { gridStep } = this._simulation;
    if (type === 'square') {
      r = [...this.squares, ...this.layer(1)];
      let i = 1;
      while (maxDistance > gridStep * i) {
        const candidates = this.layer(i + 1);
        if (candidates.length === 0) break;
        if (maxDistance > Math.sqrt(2) * gridStep * i) {
          r.push(...candidates);
        }
        else {
          for (let c of candidates) {
            if (this.distance(c) < maxDistance) r.push(c);
          }
        }
        i++;
      }
    }
    else if (type === 'zone') {
      r = new Set();
      for (let sq of this.neighbors(maxDistance, 'square')) {
        for (let z of sq.zones) {
          r.add(z);
        }
      }
      r.delete(this);
      r = [...r];
    }
    else {  // actor
      r = new Set();
      for (let sq of this.neighbors(maxDistance, 'square')) {
        for (let a of sq.actors) {
          r.add(a);
        }
      }
      for (let a of r) {
        if (this.distance(a) >= maxDistance) r.delete(a);
      }
      r = [...r];
    }
    return r;
  }

  overlapping(type) {
    this._assertSimulation();
    assertAgentType(type);
    return type === 'square'
      ? [...this.squares]
      : [...getOverlapping(this.squares, type, this)];
  }

  within(type) {
    this._assertSimulation();
    assertAgentType(type);
    if (type === 'square') {
      return this.squares.size === 1 ? [...this.squares] : [];
    }
    else if (type === 'zone') {
      let [firstSq, ...otherSquares] = this.squares;
      const firstSqZones = firstSq.zones.copy();
      firstSqZones.delete(this);
      return [
        ...firstSqZones.intersection(...otherSquares.map(sq => sq.zones))
      ];
    }
    else {  // actor
      const [firstSq, ...otherSquares] = this.squares;
      return firstSq.actors.intersection(...otherSquares.map(sq => sq.actors))
        .filter(a => this.isWithin(a), 'array');
    }
  }

  centroidWithin(type) {
    this._assertSimulation();
    assertAgentType(type);
    if (type === 'square') {
      const xIndexMean = (this.xMaxIndex + this.xMinIndex) / 2;
      const xInds = Number.isInteger(xIndexMean)
        ? [xIndexMean]
        : [Math.floor(xIndexMean), Math.ceil(xIndexMean)];
      const yIndexMean = (this.yMaxIndex + this.yMinIndex) / 2;
      const yInds = Number.isInteger(yIndexMean)
        ? [yIndexMean]
        : [Math.floor(yIndexMean), Math.ceil(yIndexMean)];
      const r = [];
      for (let yi of yInds) {
        for (let xi of xInds) {
          r.push(this._simulation.squareAt(xi, yi));
        }
      }
      return r;
    }
    else {
      return getOverlapping(this.squares, type, this).filter(
        a => this.isCentroidWithin(a), 'array');
    }
  }

  _enclosing(type, testName) {
    this._assertSimulation();
    assertAgentType(type);
    return type === 'square'
      ? [...this.squares]
      : getOverlapping(this.squares, type, this).filter(
          a => this[testName](a), 'array');
  }

  enclosing(type) {
    return this._enclosing(type, 'isEnclosing');
  }

  enclosingCentroid(type) {
    return this._enclosing(type, 'isEnclosingCentroid');
  }

}