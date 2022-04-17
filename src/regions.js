////////////////////////////////////////////////////////////////////////////////
// Generate connected regions. area is a simulation, zone or actor; returns
// an array of regions - each region is an xset of squares. Pass options in
// second argument.
////////////////////////////////////////////////////////////////////////////////

import { XSet } from './x-set.js';
import { random } from './random.js';
import {
  assertNonnegativeInteger, assertPositiveInteger, randomElement, shuffle
} from './helpers.js';

export function regions(area, {
    maxRegions = 1,           // max number of regions; use Infinity to get as 
                              // many as possible - but ensure minRegions is not
                              // Infinity
    minRegions = maxRegions,  // min number of regions
    aimForMaxRegions = true,  // aim for maxRegions? If false, aims for randomly
                              // chosen number between minRegions and
                              // maxRegions. Always aims for maxRegions if it is
                              // Infinity
    maxSquares = 2,           // max squares in region
    minSquares = maxSquares,  // min squares in region
    aimForMaxSquares = true,  // aim for maxSquares? If false, aims for randomly
                              // chosen number between minSquares and maxSquares
    shape = 'smooth',         // 'smooth', 'smoothish', 'any', 'roughish' or
                              // 'rough'   
    exclude = null,           // iterable of agents that cannot appear in a 
                              // region
    gap = 1,                  // min distance (in squares) between regions, and
                              // also between regions and excluded agents
    padding = 0,              // min distance (in squares) between regions and
                              // edge of area
    retry = 100,              // max total retries after generating a region
                              // with fewer than minSquares
    setup = null,             // function to call on each square of each region;
                              // passed the square, region (xset), square index
                              // (within the region) and region index
    grow = null               // if truthy, should be 1, 2, 3 or 4: indicates
                              // that a region only grows from the last added
                              // square, and the value of grow specifies the
                              // max number of directions the region can grow in
  } = {}) {

  // process and check args
  assertNonnegativeInteger(padding, 'padding');
  assertNonnegativeInteger(gap, 'gap');
  assertNonnegativeInteger(minRegions, 'minRegions');
  if (maxRegions !== Infinity) {
    assertPositiveInteger(maxRegions, 'maxRegions');
    if (minRegions > maxRegions) {
      throw Error('minRegions is greater than maxRegions');
    }
  }
  assertPositiveInteger(maxSquares, 'maxSquares');
  assertPositiveInteger(minSquares, 'minSquares');
  if (minSquares > maxSquares) {
    throw Error('minSquares is greater than maxSquares');
  }
  assertNonnegativeInteger(retry, 'retry');
  if (grow) assertPositiveInteger(grow, 'grow');

  // useful constants
  const sim = area.__simulation ? area : area._simulation;
  const isAreaActor = area.type === 'actor';
  const squaresWithinArea = isAreaActor 
    ? new XSet(area.enclosing('square'))
    : area.squares;

  // initialize excluded squares
  const excludeSquares = new XSet();

  // exclude padding
  if (padding) {
    if (isAreaActor) {
      const tempRadius = area.radius - sim.gridStep * padding;
      if (tempRadius > 0) {
        excludeSquares.adds(squaresWithinArea.difference(sim.squaresInCircle({
          x: area.x,
          y: area.y,
          radius: tempRadius
        }, 'within')));
      }
      else {
        excludeSquares.adds(squaresWithinArea);
      }
    }
    else {  // area is a simulation or zone
      for (let level = -1; level >= -padding; level--) {
        excludeSquares.adds(area.layer(level));
      }
    }
  }

  // exclude squares in excluded agents - and gap around them
  for (let ex of exclude || []) {
    if (ex.type === 'actor') {
      if (gap) {
        excludeSquares.adds(sim.squaresInCircle({
          x: ex.x,
          y: ex.y,
          radius: ex.radius + sim.gridStep * gap
        }, 'overlap'));
      }
      else {
        excludeSquares.adds(ex.squares);
      }
    }
    else {
      for (let level = 1; level <= gap; level++) {
        excludeSquares.adds(ex.layer(level));
      }
      ex.type === 'zone'
        ? excludeSquares.adds(ex.squares)
        : excludeSquares.add(ex);
    }
  }

  // initialize free squares
  const freeSquares = squaresWithinArea.difference(excludeSquares);

  // initialize candidates for next square
  const candidates = new Map();

  // directions - only used when grow is truthy
  const allDirections = ['north', 'east', 'south' ,'west'];
  let regDirections;
  function sampleDirections() {
    if (grow) {
      regDirections = grow > 3
        ? allDirections
        : shuffle(allDirections).slice(0, grow);
    }
  }

  // add square to region
  function addSquareToRegion(sq, reg) {
    reg.add(sq);
    excludeSquares.add(sq);
    freeSquares.delete(sq);
    if (grow) {
      candidates.clear();
      for (let direction of regDirections) {
        const neighbor = sq[direction]();
        if (neighbor && freeSquares.has(neighbor)) {
          candidates.set(
            neighbor, reg.intersection(neighbor.layerMain(1)).size);
        }
      }
    }
    else {
      candidates.delete(sq);
      for (let neighbor of sq.layerMain(1)) {
        if (freeSquares.has(neighbor)) {
          candidates.set(neighbor, (candidates.get(neighbor) || 0) + 1);
        }
      }
    }
  }

  // choose next square from candidates
  function chooseCandidate() {
    const candidatesArray = [...candidates];
    if (candidatesArray.length === 1) {
      return candidatesArray[0][0];
    }
    if (shape === 'any') {
      return randomElement(candidatesArray)[0];
    }
    const isRough = shape.includes('rough');
    if (shape === 'smoothish' || shape === 'roughish') {
      let cumulativeSum = 0;
      const cumulativeProbs = [];  // cumulative probs are not normalized
      if (isRough) {
        var maxNebsPlusOne = !grow || grow > 3
          ? 5
          : (grow === 3 ? 3 : 2)
      }
      for (let [sq, nNebs] of candidatesArray) {
        cumulativeSum += isRough ? maxNebsPlusOne - nNebs : nNebs;
        cumulativeProbs.push(cumulativeSum);
      }
      const v = random.uniform_01() * cumulativeSum;
      for (var i = 0; i < cumulativeProbs.length - 1; i++) {
        if (v < cumulativeProbs[i]) return candidatesArray[i][0];
      }
      return candidatesArray[i][0];
    }
    let best = -Infinity;
    for (let nNebs of candidates.values()) {
      if (isRough) nNebs *= -1;
      if (nNebs > best) best = nNebs;
    }
    if (isRough) best *= -1;
    return randomElement(
      candidatesArray.filter(([sq, nNebs]) => nNebs === best)
    )[0];
  }

  // generate regions - each region is an xset of squares
  const targetRegions =
    maxRegions === Infinity || aimForMaxRegions || minRegions === maxRegions
      ? maxRegions
      : random.int(minRegions, maxRegions + 1)();
  const regs = [];
  while (regs.length < targetRegions) {

    // target number of squares
    const targetSquares = aimForMaxSquares || minSquares === maxSquares
      ? maxSquares
      : random.int(minSquares, maxSquares + 1)();

    // sample new directions for this region (if grow truthy)
    sampleDirections();

    // create region and randomly choose first square
    const reg = new XSet();
    candidates.clear();
    if (freeSquares.size === 0) {
      break;
    }
    addSquareToRegion(randomElement([...freeSquares]), reg);

    // add squares to region
    while (reg.size < targetSquares && candidates.size) {
      addSquareToRegion(chooseCandidate(), reg);
    }
    if (reg.size < minSquares) {
      if (retry--) {
        for (let sq of reg) {
          excludeSquares.delete(sq);
          freeSquares.add(sq);
        }
        continue;
      }
      break;
    }

    // exclude gap squares around region
    for (let sq of reg) {
      for (let level = 1; level <= gap; level++) {
        const layer = sq.layer(level);
        excludeSquares.adds(layer);
        freeSquares.deletes(layer);
      }
    }

    regs.push(reg);

  }

  // check number of regions and call setup for each square of each region
  if (regs.length < minRegions) {
    throw Error('number of generated regions is less than minRegions');
  }
  if (typeof setup === 'function') {
    for (let [iReg, reg] of regs.entries()) {
      let iSq = 0;
      for (let sq of reg) {
        setup(sq, reg, iSq++, iReg);
      }
    }
  }

  return regs;
 
}