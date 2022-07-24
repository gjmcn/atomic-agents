////////////////////////////////////////////////////////////////////////////////
// Function that generates valid square tilings given rules and weights. Based
// on Wave Function Collapse (https://github.com/mxgmn/WaveFunctionCollapse) and
// simpler alternatives (e.g.
// https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/).
////////////////////////////////////////////////////////////////////////////////


export function autotile(options) {

  
  // ========== get options ==========

  // tiles: object, each key is a name; the value is an object with properties:
  //  - label: string
  //  - prior: number/function, prior probability of this tile; need not be in
  //           [0, 1] since priors are normalized
  //  - min: number, min number of this tile
  //  - max: number, max number of this tile
  //  - kind: string/4-array: string if same kind on all edges, otherwise
  //          4-array indicating kind on each side (up, right, down, left)
  const { tiles } = options;
  
  // kinds: each key is a kind; if model is 'normal' or 'direction', the
  // corresponding value is an array of kinds that can touch the key-kind. If
  // mode is 'direction', a value is a 4-array of arrays indicating which kind
  // the key-kind can touch in each direction (above, right, below, left)
  const { kinds } = options;

  // mode: string
  //  - 'normal': tiles cannot be rotated and edge-edge relationships are not
  //              not dependent on direction
  //  - 'direction': tiles cannot be rotated and edge-edge relationships between
  //                 kinds are specified per direction
  //  - 'rotate': tiles can be arbitrailty rotated with no preferred direction
  const { mode = 'normal' } = options;

  // other options
  const {
    retry = 100,  // max number of tries to find a valid solution
  } = options;


  // ========== check and process options ==========

  const allKinds = new Set(Object.keys(kinds));
  for (let tile of tiles) {
    for (let neighborKind of tile.kinds.flat(Infinity)) {
      if (!allKinds.has(neighborKind)) {
        throw Error(`no information for kind: '${neighborKind}'`);
      }
    }
  }

  const priors = {};
  {
    let total = 0;
    for (let kind of allKinds) {
      priors[kind] = kinds[kind].prior;
      total += p;
    }
    for (let kind of allKinds) {
      priors[kind] /= total;
    }
  }



// ========== local helpers ==========

// TO DO
// categorical - get from Zap