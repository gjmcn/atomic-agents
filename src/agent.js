////////////////////////////////////////////////////////////////////////////////
// Agent class.
////////////////////////////////////////////////////////////////////////////////

import { XSet } from './x-set.js';
import { overlap } from './overlap.js';
import { boundaryDistance } from './boundary-distance.js';
import { centroidDistance } from './centroid-distance.js'; 
import { within } from './within.js';
import { centroidWithin } from './centroid-within.js';
import * as fromFunctions from './from-functions.js';
import { gridInRect, gridInHex } from './helpers.js';
import { randomCircles } from './random-circles.js';

export class Agent {

  static visOptions = new Set([
    'tint',
    'alpha',
    'image',
    'text',
    'textAlign',
    'textTint',
    'textAlpha',
    'fontName',
    'fontSize',
    'advanced',
    'lineColor',
    'lineAlpha',
    'lineWidth',
    'lineAlign',
    'fillColor',
    'fillAlpha',
  ]);

  static updatableVisOptions = new Set([
    'tint',
    'alpha',
    'image',
    'text',
    'textTint',
    'textAlpha',
    'fontName',
    'fontSize',
  ]);

  
  static vis3dOptions = new Set([
    'color'
  ]);
  static updatableVis3dOptions = new Set([
    'color'
  ]);
  
  constructor(options = {}) {
    this.x           = options.x       ?? 0;
    this.y           = options.y       ?? 0;
    this.state       = options.state   ?? {};
    this.history     = options.history ?? {};
    if (options.updateState) this.updateState = options.updateState;
    this.bounceLog      = new XSet();
    this._simulation    = null;
    this._labels        = new Map();
    this._resetOnRemove = null; 
    this.__agent        = true;
    // also: this._vis, this._visUpdates and this._interaction set by vis method
    //       of agent subtypes
  }

  _validateSimulation(simulation) {
    if (!simulation.__simulation) {
      throw Error('simulation object expected');
    }
    if (this._simulation) {
      throw Error('agent is already in a simulation');
    }
  }

  _addToSimulation(simulation) {
    simulation._addAgent(this);
    this._simulation = simulation;
  }

  addTo(simulation) {
    this._validateSimulation(simulation);
    this._addToSimulation(simulation);
    return this;
  }

  remove() {
    if (!this._simulation) {
      throw Error('agent is not in a simulation');
    }
    const squaresProp = this.type + 's';
    for (let sq of this.squares) {
      sq[squaresProp].delete(this);
    }
    this._simulation._removeAgent(this);
    this._simulation = null;
    this.bounceLog.clear();
    for (let name of this._resetOnRemove) {
      this[name] = null;
    }
    return this;
  }

  label(name, value) {
    const oldValue = this._labels.get(name);
    if (value === undefined) {
      return oldValue;
    }
    else {
      if (value === null) {
        if (oldValue !== undefined) {
          this._simulation?._agentLabelDelete?.(this, name, oldValue);
          this._labels.delete(name);
        } 
      }
      else if (oldValue === undefined) {
        this._simulation?._agentLabelNew?.(this, name, value)
        this._labels.set(name, value);
      }
      else if (value !== oldValue) {
        this._simulation?._agentLabelChange?.(this, name, oldValue, value);
        this._labels.set(name, value);
      }
      return this;
    }
  }

  _assertSimulation() {
    if (!this._simulation) {
      throw Error(
        'this method can only be used when the calling agent is in a simulation'
      );
    }
  }

  fitGrid(options) {
    this._assertSimulation();
    return (this.type === 'actor' ? gridInHex : gridInRect)(this, options);
  }

  randomCircles(options) {
    this._assertSimulation();
    return randomCircles(this, options);
  }

  populate(options) {
    this._assertSimulation();
    return this._simulation._populate(this, options);
  }


  // ========== proximity methods ==========

  isOverlapping(otherAgent) {
    return overlap(this, otherAgent);
  }

  isWithin(otherAgent) {
    return within(this, otherAgent);
  }

  isCentroidWithin(otherAgent) {
    return centroidWithin(this, otherAgent); 
  }

  isEnclosing(otherAgent) {
    return within(otherAgent, this);
  }

  isEnclosingCentroid(otherAgent) {
    return centroidWithin(otherAgent, this);
  }

  distance(otherAgent) {
    return boundaryDistance(this, otherAgent);
  }

  centroidDistance(otherAgent) {
    return centroidDistance(this, otherAgent);
  }

  neighborsFrom(maxDistance, candidates) {
    return fromFunctions.neighborsFrom(this, maxDistance, candidates);
  }
  
  overlappingFrom(candidates) {
    return fromFunctions.overlappingFrom(this, candidates);
  }

  withinFrom(candidates) {
    return fromFunctions.withinFrom(this, candidates);
  }

  centroidWithinFrom(candidates) {
    return fromFunctions.centroidWithinFrom(this, candidates);
  }

  enclosingFrom(candidates) {
    return fromFunctions.enclosingFrom(this, candidates);
  }

  enclosingCentroidFrom(candidates) {
    return fromFunctions.enclosingCentroidFrom(this, candidates);
  }

}