////////////////////////////////////////////////////////////////////////////////
// Square class.
////////////////////////////////////////////////////////////////////////////////

import { XSet } from './x-set.js';
import {
  assertAgentType, assertInteger, getLayer, setVisOptions, setVis3dOptions
} from './helpers.js';
import { Agent } from "./agent.js";
import { insideDistance } from "./inside-distance.js";

export class Square extends Agent {

  static visOptions = new Set([...Agent.visOptions,
    'textPosition',
    'textPadding',
  ]);

  static updatableVisOptions = Agent.updatableVisOptions;

  static vis3dOptions = new Set([...Agent.vis3dOptions,
    'tileColor',
    'tileTexture',
    'padding',
    'useFaceColor',
    'topColor',
    'bottomColor',
    'rightColor',
    'frontColor',
    'leftColor',
    'backColor',
  ]);
  
  static updatableVis3dOptions = new Set([...Agent.updatableVis3dOptions,
    'tileColor',
    'tileTexture',
    'padding',
    'topColor',
    'bottomColor',
    'rightColor',
    'frontColor',
    'leftColor',
    'backColor',
  ]);

  constructor(options) {
    super(options);
    this.type      = 'square';
    this._shape    = 'rect';
    this.zIndex    = NaN;
    this.direction = 0;
    this.actors    = new XSet();
    this.zones     = new XSet();
  }

  get checker() {
    return this.xIndex % 2 ^ this.yIndex % 2;
  }

  vis(obj = {}) {
    return setVisOptions(this, Square, obj);
  }

  vis3d(obj = {}) {
    return setVis3dOptions(this, Square, obj);
  }
  
  remove() {
    throw Error('square agents cannot be removed from a simulation');
  }

  
  // ========== proximity methods ==========

  north()     { return this._simulation._grid.squares[this.yIndex - 1]?.[this.xIndex] }
  northeast() { return this._simulation._grid.squares[this.yIndex - 1]?.[this.xIndex + 1] }
  east()      { return this._simulation._grid.squares[this.yIndex]      [this.xIndex + 1] }
  southeast() { return this._simulation._grid.squares[this.yIndex + 1]?.[this.xIndex + 1] }
  south()     { return this._simulation._grid.squares[this.yIndex + 1]?.[this.xIndex] }
  southwest() { return this._simulation._grid.squares[this.yIndex + 1]?.[this.xIndex - 1] }
  west()      { return this._simulation._grid.squares[this.yIndex]      [this.xIndex - 1] }
  northwest() { return this._simulation._grid.squares[this.yIndex - 1]?.[this.xIndex - 1] }

  compass() { return {
    north:     this.north(),
    northeast: this.northeast(),
    east:      this.east(),
    southeast: this.southeast(),
    south:     this.south(),
    southwest: this.southwest(),
    west:      this.west(),
    northwest: this.northwest()
  }}

  compassMain() { return {
    north: this.north(),
    east:  this.east(),
    south: this.south(),
    west:  this.west()
  }}

  compassCorners() { return {
    northeast: this.northeast(),
    southeast: this.southeast(),
    southwest: this.southwest(),
    northwest: this.northwest()
  }}

  layer(level = 1) {
    assertInteger(level);
    if (level) {
      return getLayer(this._simulation, level, {
        xiMin: this.xIndex,
        xiMax: this.xIndex,
        yiMin: this.yIndex,
        yiMax: this.yIndex
      });
    }
    else {
      return [this];
    }
  }

  layerMain(level = 1) {
    assertInteger(level);
    if (level > 0) {
      const s = [];
      const gridSquares = this._simulation._grid.squares;
      const { xIndex, yIndex } = this;
      let sq;
      if (sq = gridSquares[yIndex - level]?.[xIndex]) s.push(sq);
      if (sq = gridSquares[yIndex][xIndex + level])   s.push(sq);
      if (sq = gridSquares[yIndex + level]?.[xIndex]) s.push(sq);
      if (sq = gridSquares[yIndex][xIndex - level])   s.push(sq);
      return s;
    }
    else if (level === 0 || level === -1) {
      return [this];
    }
    return [];
  }

  _insideNeighbors(maxDistance) {  // actor neighbors, no type parameter
    return this.actors.filter(a => {
      const d = insideDistance(a, this);
      return d >= -a.radius && d <= maxDistance;
    }, 'array');
  }

  _overlappingBoundaryCandidateSet() {  // actors only, no type parameter
    return new XSet(this.actors);
  }

  neighbors(maxDistance, type) {
    assertAgentType(type);
    if (!(maxDistance > 0)) {
      return [];
    }
    let r;
    const { gridStep } = this._simulation;
    if (type === 'square') {
      r = this.layer(1);
      let i = 1;
      while (maxDistance > gridStep * i) {
        const candidates = this.layer(i + 1);
        if (candidates.length === 0) break;
        if (maxDistance > Math.sqrt(2) * gridStep * i) {
          r.push(...candidates);
        }
        else {
          for (let c of candidates) {
            if (c.xIndex === this.xIndex ||
                c.yIndex === this.yIndex ||
                this.distance(c) < maxDistance) {
              r.push(c);
            }
          }
        }
        i++;
      }
    }
    else if (type === 'zone') {
      r = this.zones.copy();
      for (let sq of this.neighbors(maxDistance, 'square')) {
        r.adds(sq.zones);
      }
      r = [...r];
    }
    else {  // actor
      r = this.actors.copy();
      for (let sq of this.neighbors(maxDistance, 'square')) {
        r.adds(sq.actors);
      }
      for (let a of r) {
        if (this.distance(a) >= maxDistance) r.delete(a);
      }
      r = [...r];
    }
    return r;
  }
  
  overlapping(type) {
    assertAgentType(type);
    return type === 'square' ? [] : [...this[type + 's']]; 
  }

  _within(type, testName) {
    assertAgentType(type);
    if (type === 'zone') {
      return [...this.zones];
    }
    else if (type === 'actor') {
      return this.actors.filter(a => this[testName](a), 'array');
    }
    return [];
  }

  within(type) {
    return this._within(type, 'isWithin');
  }

  centroidWithin(type) {
    return this._within(type, 'isCentroidWithin');
  }

  enclosing(type) {
    assertAgentType(type);
    if (type === 'zone') {
      return this.zones.filter(z => z.squares.size === 1, 'array');
    }
    else if (type === 'actor') {
      return this.actors.filter(a => this.isEnclosing(a), 'array');
    }
    return [];
  }
  
  enclosingCentroid(type) {
    assertAgentType(type);
    return type === 'square'
      ? []
      : this[type + 's'].filter(a => this.isEnclosingCentroid(a), 'array');
  }

}