////////////////////////////////////////////////////////////////////////////////
// Grid class.
////////////////////////////////////////////////////////////////////////////////

import { Square } from './square.js';
import { assertPositiveInteger } from './helpers.js';

export class Grid {

  constructor(sim) {
        
    // validate gridStep, width and height
    assertPositiveInteger(sim.width, 'simulation width');
    assertPositiveInteger(sim.height, 'simulation height');
    assertPositiveInteger(sim.gridStep, 'simulation grid step');
    assertPositiveInteger(sim.width / sim.gridStep,
      'simulation width divided by the grid step');
    assertPositiveInteger(sim.height / sim.gridStep,
      'simulation height divided by the grid step');

    // local variables and private fields
    this.sim = sim;
    const step    = this.step    = sim.gridStep;
    const nx      = this.nx      = sim.width  / sim.gridStep;
    const ny      = this.ny      = sim.height / sim.gridStep;
    const squares = this.squares = [];

    // create square agents
    let i = 0;
    for (let yi = 0; yi < ny; yi++) {
      const row = [];
      squares.push(row);
      for (let xi = 0; xi < nx; xi++) {
        const sq = new Square({
          x: (xi + 0.5) * step,
          y: (yi + 0.5) * step
        });
        sq.xMin   = xi * step;
        sq.xMax   = (xi + 1) * step;
        sq.yMin   = yi * step;
        sq.yMax   = (yi + 1) * step;
        sq.index  = i++;
        sq.xIndex = xi;
        sq.yIndex = yi;
        row.push(sq);
        sq._addToSimulation(sim);
      }
    }
  }

}