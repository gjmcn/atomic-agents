////////////////////////////////////////////////////////////////////////////////
// Function that generates valid square tilings given rules and prior
// probabilities of tiles. Based on ideas from Wave Function Collapse
// (https://github.com/mxgmn/WaveFunctionCollapse) and simpler alternatives
// (e.g. https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/).
////////////////////////////////////////////////////////////////////////////////

import { random } from "./random.js"; 
import { XSet } from "./x-set.js";

export function autotile(sim, options) {

  
  // ========== get options ==========

  // tiles: object. Each key is a name; the value is an object with properties:
  //  - label: string
  //  - kind: string/4-array: string if same kind on all edges, otherwise
  //      4-array indicating kind on each side (up, right, down, left)
  //  - prior = 1: number/function, prior probability of tile. Value need not be
  //      in [0, 1] since only relative values of of probabilities mattter. If
  //      prior is a function, it is passed the square the tile is being
  //      considered for and should return the probability
  //  - transform = false: boolean/array. A tile has 8 potential variants from
  //      rotation and reflection. Use false to allow only the original tile,
  //      true for all, or an array listing the permitted variants:
  //        0: no transformation
  //        1: 90° clockwise rotation
  //        2: 180°
  //        3: 270°
  //        4: flip horizontal
  //        5: flip vertical
  //        6: reflect in main diagonal
  //        7: reflect in reverse diagonal
  //  ---------- constraints ----------
  //  - min = 0: number, min number of this tile
  //  - max = Infinity: number, max number of this tile
  //  - boundaryWidth = 1: width of simulation 'boundary' (in squares) to use
  //      when for boundary constraint
  //  - boundary = null: true if tile only allowed on boundary square, false if
  //      tile not allowed on boundary square, null/undefined if no constraint
  const { tiles } = options;
  
  // kinds: object. Each key is a kind; if model is 'normal' or 'direction', the
  // corresponding value is an array of kinds that can touch the key-kind. If
  // mode is 'direction', a value is a 4-array of arrays indicating which kind
  // the key-kind can touch in each direction (above, right, below, left)
  const { kinds } = options;

  // other options
  const {
    retry = 100,  // max number of tries to find a valid solution
    startSquare = sim.randomSquare(),
  } = options;


  // ========== check and process options ==========

  const kindNames = new XSet(Object.keys(kinds));
  for (let tile of tiles) {
    for (let neighborKind of tile.kinds.flat(Infinity)) {
      if (!kindNames.has(neighborKind)) {
        throw Error(`no information for kind: '${neighborKind}'`);
      }
    }
  }


  // ========== initialise candidate tiles for each square ==========

  const candidates = new Map;
  for (let sq of sim.squares) {
    const c = new XSet;
    for (let [tileName, { boundaryWidth, boundary }] of tiles.entries()) {
      if (boundary === null || boundary === undefined) {
        candidates.add(tileName);
      }
      else {
        const isBoundarySq = sq.xIndex < boundaryWidth ||
                             sq.xIndex >= sim.xMaxIndex - boundaryWidth ||
                             sq.yIndex < boundaryWidth ||
                             sq.yIndex >= sim.yMaxIndex - boundaryWidth;
        if ((boundary && isBoundarySq) || (!boundary && !isBoundarySq)) {
          candidates.add(tileName); 
        }
      }
    }
    candidates.set(sq, c);
  }


  // ========== collapse (i.e. choose tile for a square) function ==========







// ========== local helpers ==========

// TO DO
// categorical - get from Zap