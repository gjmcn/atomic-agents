////////////////////////////////////////////////////////////////////////////////
// Function that generates valid square tilings given permitted edge matches and
// prior probabilities of tiles. Based on ideas from Wave Function Collapse
// (https://github.com/mxgmn/WaveFunctionCollapse) and simpler alternatives
// (e.g. https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/).
//
// Returns a {assignments, complete, attempts} object. The attempts property
// indicates the number of attempts to find a solution. If no solution is found,
// complete is false and assignments is null; otherwise, complete is true and
// assignments is a map where each key is a square, and the value is a {name,
// rotationCode} object containing the name of the tile assigned to the square,
// and the tile's rotation: 0-none, 1-90° clockwise, 2-180°, 3-270°. Square-tile
// pairs are added to the assignments map in the order they are chosen.
////////////////////////////////////////////////////////////////////////////////


import { XSet } from "./x-set.js";
import { randomElement, moduloShift } from "./helpers.js";
import { random } from "./random.js";


// ========== local helpers ==========

const compassIndices = { north: 0, east: 1, south: 2, west: 3 };

function edgeAtDirection(tileEdges, rotationCode, direction) {
  return typeof tileEdges === 'string'
    ? tileEdges
    : tileEdges[moduloShift(direction - rotationCode, 4)];
}


// ========== autotile function ==========

export function autotile(sim, options) {

  
  // ========== get options ==========

  // tiles: object. Each key is a name; the value is an object with properties:
  //  - edges: string (the edge name) if same edge on all sides, else a 4-array
  //      of edge names: top, right, bottom, left
  //  - rotate = false: boolean, true if the tile can be rotated
  //  - prob = 1: number/function, prior probability of tile. Value should be 
  //      ≥ 0, but probs need not be normalised - only relative values matter.
  //      If prob is a function, it is passed the square the tile is being
  //      considered for and returns the probability
  const tiles = {};
  for (let [tileName, tileInfo] of Object.entries(options.tiles)) {
    tileInfo = {...tileInfo};
    tileInfo.prob ??= 1;
    tiles[tileName] = tileInfo;
  }

  // edges: object. Each key is an edge name; the value is the edge name or
  //  array of edge names that the key-edge can be matched with. If an edge
  //  name does not appear as a key, it is assumed that the edge can only match
  //  itself. Omit the edges option entirely if all edges only match themselves. 
  const edgeNames = new XSet;
  for (let { edges } of Object.values(tiles)) {
    edgeNames[typeof edges === 'string' ? 'add' : 'adds'](edges);
  }
  const edges = {};
  for (let edgeName of edgeNames) {
    const matchingEdges = options.edges?.[edgeName];
    if (matchingEdges) {
      edges[edgeName] = new Set(
        typeof matchingEdges === 'string' ? [matchingEdges] : matchingEdges
      );
    }
    else {
      edges[edgeName] = new Set([edgeName]);
    }
  }  

  // startTiles: if used, a map where each key is a square and the value is a
  //  { name, rotationCode = 0 } object - see the format of the map returned by
  //  autotile for details. The autotile algorithm finds tiles for all squares
  //  not included in startTiles.
  //  - the 'edge validity' of start tiles is not checked - i.e. adjacent start
  //    tiles need not obey the edge relationships in the edges option. 
  const startTiles = new Map;
  for (let [sq, tileInfo] of options.startTiles || []) {
    tileInfo = {...tileInfo};
    tileInfo.rotationCode ??= 0;
    startTiles.set(sq, tileInfo);
  }

  // retry: number, max total number of attempts to find a solution
  const retry = options.retry ?? 100;

  // backtrack: number, number of times attempt to find a solution by starting
  //  from 2/3 of the way through the previous attempt
  const backtrack = options.backtrack ?? 4;
  

  // ========== tile names and tiles map ==========

  const tileNames = [];
  const tilesMap = new Map;
  let useProbs = false;
  for (let [tileName, tileInfo] of Object.entries(tiles)) {
    tileNames.push(tileName);
    tilesMap.set(tileName, tileInfo);
    if (tileInfo.prob !== 1) useProbs = true;
  }
  for (let { name: tileName } of startTiles.values()) {
    if (!tilesMap.has(tileName)) {
      throw Error(
        `tile '${tileName}' in startTiles is not listed in the tiles option`);
    }
  }


  // ========== tile names, probabilities and entropy of candidates ==========

  function updateProbInfo(sq, candidates) {
    if (candidates.size === 0) {
      candidates.__probInfo = null;
      return;
    }
    if (useProbs) {
      const tileNames = [];
      const probs = [];
      let total = 0;
      for (let tileName of candidates.keys()) {
        let prob = tiles[tileName].prob;
        if (typeof prob === 'function') prob = prob(sq);
        if (!prob) {
          candidates.delete(tileName);
        }
        else {
          tileNames.push(tileName);
          probs.push(prob);
          total += prob;
        }
      }
      if (candidates.size === 0) {
        candidates.__probInfo = null;
        return;
      }
      let e = 0;
      for (let prob of probs) {
        prob /= total;
        e += prob * Math.log(prob);
      }
      candidates.__probInfo = { tileNames, probs, entropy: -e };
    }
    else {  // uniform probs
      candidates.__probInfo = {
        tileNames: [...candidates.keys()],
        entropy: -Math.log(1 / candidates.size),
      };
    }
  }
  
  
  // ========== valid matches ==========

  const validMatches = new Map;

  // for every edge-direction combination, find all tile-rotation pairs that
  // give a valid neighbor edge
  for (let edgeName of edgeNames) {
    const validNeighbors = edges[edgeName];
    const edgeMatches = [new Map, new Map, new Map, new Map];
    for (let [tileName, {edges: tileEdgeNames, rotate, prob}] of tilesMap) {
      if (!prob) continue;
      if (typeof tileEdgeNames === 'string') {
        if (validNeighbors.has(tileEdgeNames)) {
          const turns = new Set(rotate ? [0, 1, 2, 3] : [0]);
          edgeMatches[0].set(tileName, turns);
          edgeMatches[1].set(tileName, turns);
          edgeMatches[2].set(tileName, turns);
          edgeMatches[3].set(tileName, turns);
        }
      }
      else if (!rotate) {
        for (let direction = 0; direction < 4; direction++) {
          if (validNeighbors.has(tileEdgeNames[(direction + 2) % 4])) {
            edgeMatches[direction].set(tileName, new Set([0]));
          }
        }
      }
      else {  // rotate true: include all rotations that give valid neighbor
        const turns = [];
        for (let turn = 0; turn < 4; turn++) {
          if (validNeighbors.has(tileEdgeNames[moduloShift(2 - turn, 4)])) {
            turns.push(turn);
          }
          if (turns.length) {
            edgeMatches[0].set(tileName, new Set(turns));
            edgeMatches[1].set(tileName, new Set(turns.map(t => (t + 1) % 4)));
            edgeMatches[2].set(tileName, new Set(turns.map(t => (t + 2) % 4)));
            edgeMatches[3].set(tileName, new Set(turns.map(t => (t + 3) % 4)));
          }
        }
      }
    }
    validMatches.set(edgeName, edgeMatches);
  }


  // ========== compute/update candidates ==========

  // new candidates map (tile name => set of valid rotation codes) for square
  // that currently has no edge constraints from neighbors
  let initCandidates;
  {
    if (useProbs &&
         [...tilesMap.values()].some(({prob}) => typeof prob === 'function')) {
      initCandidates = function(sq) {
        const candidates = new Map;
        for (let [tileName, { rotate, prob }] of tilesMap) {
          if (typeof prob === 'function') prob = prob(sq);
          if (prob) {
            candidates.set(tileName, new Set(rotate ? [0, 1, 2, 3] : [0]));
          }
        }
        updateProbInfo(sq, candidates);
        return candidates;
      };
    }
    else {  // same for all squares
      const baseCandidates = new Map;
      for (let [tileName, { rotate, prob }] of tilesMap) {
        if (prob) {
          baseCandidates.set(tileName, new Set(rotate ? [0, 1, 2, 3] : [0]));
        }
      }
      updateProbInfo(null, baseCandidates);
      initCandidates = function() {
        const candidates = structuredClone(baseCandidates);
        candidates.__probInfo =  // clone of map does not include added properties
          baseCandidates.__probInfo;
        return candidates;
      };
    }
  }

  // Compute/update a square's tile candidates given a new edge constraint from
  // a neighbor
  // - sq: square, the square the tiles are candidates for
  // - neighborEdgeName: string, edge name of neighbor
  // - direction: 0, 1, 2 or 3; the square's edge that is being matched to
  //   neighborEdgeName, e.g. 1 means matching square's right side - so its
  //   neighbor on the right has edge neighborEdgeName on its left
  // - candidates: omit if no existing candidates; else a map (tile name => set
  //   of valid rotation codes); updateCandidates mutates this map
  function updateCandidates(sq, neighborEdgeName, direction, candidates) {
    
    // new candidate tiles, a map: tile name => set of valid turns
    const newCandidates =
      validMatches.get(neighborEdgeName)[(direction + 2) % 4];
    
    // no existing candidates
    if (!candidates) {
      candidates = structuredClone(newCandidates);
    }

    // there are existing candidates; eliminate those not in new list
    else {
      for (let [tileName, turns] of candidates) {
        if (!newCandidates.has(tileName)) {
          candidates.delete(tileName);
        }
        else {
          const newTurns = newCandidates.get(tileName);
          for (let t of turns) {
            if (!newTurns.has(t)) {
              turns.delete(t);
              if (turns.size === 0) {
                candidates.delete(tileName);
                break;
              }
            }
          }
        }
      }
    }

    updateProbInfo(sq, candidates);
    return candidates;

  }


  // ========== assign tile to square ==========

  function chooseTile(candidates) {
    const { tileNames, probs } = candidates.__probInfo;
    const chosenTileName = tileNames.length === 1
      ? tileNames[0]
      : useProbs
        ? tileNames[random.categorical(probs)()]
        : tileNames[random.int(tileNames.length)()];
    const turns = [...candidates.get(chosenTileName)];
    return {
      name: chosenTileName,
      rotationCode: turns.length === 1 ? turns[0] : randomElement(turns),
    };
  }


  // ========== try loop ==========

  let assignments;
  let backtrackCounter = -1;
  let attempts = 0;
  attemptsLoop: while (attempts < retry) {

    attempts++;

    // initial assignments
    backtrackCounter = backtrackCounter === backtrack
      ? 0
      : backtrackCounter + 1;
    if (backtrackCounter &&
        assignments.size / (sim.squares.size - startTiles.size) < 0.1) {
      backtrackCounter = 0;
    }
    if (backtrackCounter) {
      assignments = new Map(
        [...assignments].slice(0, Math.round(assignments.size * 2 / 3))
      );
    }
    else {
      assignments = new Map(startTiles);
    }

    // candidates and free squares
    const allCandidates = new Map;
    const freeSquares = new XSet(sim.squares);
    freeSquares.deletes(assignments.keys());

    // given an assigned-to square, update candidates of neighboring squares
    function updateCandidatesOfNeighbors(sq, tileName, rotationCode) {
      for (let [compassDirection, neighborSq]
          of Object.entries(sq.compassMain())) {
        if (neighborSq && freeSquares.has(neighborSq)) {
          const direction = compassIndices[compassDirection];
          const filteredCandidates = updateCandidates(
            neighborSq,
            edgeAtDirection(tiles[tileName].edges, rotationCode, direction),
            (direction + 2) % 4,
            allCandidates.get(neighborSq)
          );
          if (!filteredCandidates.__probInfo) return false;
          allCandidates.set(neighborSq, filteredCandidates);
        }
      }
      return true;
    }

    // if not using probs and no start tiles, assign to a random square - or
    // there will be no assignments or candidates to kick off assignment loop
    if (!useProbs && !assignments.size) {
      const sq = randomElement([...sim.squares]);
      const tileName = randomElement(tileNames);
      assignments.set(sq, {
        name: tileName,
        rotationCode: tiles[tileName].rotate ? random.int(4)() : 0,
      });
      freeSquares.delete(sq);
    }

    // compute/update candidates for neighbors of start tiles
    for (let [sq, {name, rotationCode}] of assignments) {
      const success = updateCandidatesOfNeighbors(sq, name, rotationCode);
      if (!success) break attemptsLoop;
    }

    // if using probs, compute initial candidates for squares that are neither
    // start squares nor their neighbors - since these squares may still have
    // the lowest entropy
    if (useProbs) {
      for (let sq of sim.squares) {
        if (!assignments.has(sq) && !allCandidates.has(sq)) {
          const candidates = initCandidates(sq);
          if (!candidates.__probInfo) break attemptsLoop;
          allCandidates.set(sq, candidates);
        }
      }
    }

    // assign to free squares until none left or fail to find solution
    while (freeSquares.size) {
      
      // choose next square and assign to it
      let minEntropy = Infinity;
      let possNextSquares = [];
      for (let [sq, { __probInfo }] of allCandidates) {
        const { entropy } = __probInfo;
        if (entropy < minEntropy) {
          minEntropy = entropy;
          possNextSquares = [sq];
        }
        else if (entropy === minEntropy) {
          possNextSquares.push(sq);
        }
      }
      const chosenSq = possNextSquares.length > 1
        ? randomElement(possNextSquares)
        : possNextSquares[0];
      const chosenTile = chooseTile(allCandidates.get(chosenSq));
      assignments.set(chosenSq, chosenTile);
      allCandidates.delete(chosenSq);
      freeSquares.delete(chosenSq);

      // update candidates of neighbors of chosen square
      const success = updateCandidatesOfNeighbors(
        chosenSq, chosenTile.name, chosenTile.rotationCode);
      if (!success) continue attemptsLoop;
    
    }

    break attemptsLoop;

  }

  return {
    assignments,
    complete: assignments.size === sim.squares.size,
    attempts
  };

}