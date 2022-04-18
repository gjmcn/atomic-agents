import { circle, rect } from './test-helpers';
import { overlap } from '../src/overlap';

const c1 = circle(1, 2, 3);
const c2 = circle(5, 3, 2);
const c3 = circle(8, 0, 4);

const r1 = rect(1, 7, 4, 11);
const r2 = rect(6, 8, 5, 8);
const r3 = rect(9, 11, 6, 7);

test('c1, c2: overlap',    () => { expect(overlap(c1, c2)).toBe(true) });
test('c2, c3: overlap',    () => { expect(overlap(c2, c3)).toBe(true) });
test('c1, c3: no overlap', () => { expect(overlap(c1, c3)).toBe(false) });
test('r1, r2: overlap',    () => { expect(overlap(r1, r2)).toBe(true) });
test('r1, r3: no overlap', () => { expect(overlap(r1, r3)).toBe(false) });
test('r1, c1: overlap',    () => { expect(overlap(r1, c1)).toBe(true) });
test('c1, r1: overlap',    () => { expect(overlap(c1, r1)).toBe(true) });
test('r3, c3: no overlap', () => { expect(overlap(r3, c3)).toBe(false) });
test('c3, r3: no overlap', () => { expect(overlap(c3, r3)).toBe(false) });