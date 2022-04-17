////////////////////////////////////////////////////////////////////////////////
// 'From' proximity functions.
////////////////////////////////////////////////////////////////////////////////

import { overlap } from './overlap.js';
import { boundaryDistance } from './boundary-distance.js';
import { within } from './within.js';
import { centroidWithin } from './centroid-within.js';

export function neighborsFrom(target, maxDistance, candidates) {
  const r = [];
  for (let c of candidates) {
    if (boundaryDistance(target, c) < maxDistance) r.push(c);
  }
  return r;
}

export function nearestFrom(target, k, candidates) {
  const objects = [];
  for (let c of candidates) {
    objects.push({
      candidate: c,
      distance: boundaryDistance(target, c)
    });
  }
  objects.sort((a, b) => a.distance - b.distance);
  const n = Math.min(k, objects.length);
  const r = new Array(n);
  for (let j = 0; j < n; j++) {
    r[j] = objects[j].candidate;
  }
  return r;
}

export function overlappingFrom(target, candidates) {
  const r = [];
  for (let c of candidates) {
    if (overlap(target, c)) r.push(c);
  }
  return r;
}

export function withinFrom(target, candidates) {
  const r = [];
  for (let c of candidates) {
    if (within(target, c)) r.push(c);
  }
  return r;
}

export function centroidWithinFrom(target, candidates) {
  const r = [];
  for (let c of candidates) {
    if (centroidWithin(target, c)) r.push(c);
  }
  return r;
}

export function enclosingFrom(target, candidates) {
  const r = [];
  for (let c of candidates) {
    if (within(c, target)) r.push(c);
  }
  return r;
}

export function enclosingCentroidFrom(target, candidates) {
  const r = [];
  for (let c of candidates) {
    if (centroidWithin(c, target)) r.push(c);
  }
  return r;
}