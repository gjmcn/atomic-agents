# Introduction

Atomic Agents is a JavaScript library for spatial (2D) agent-based modeling.

## Agents

A simulation is built from the following types of agent:

* <i>actors</i> are circular and can move.

* <i>squares</i> are grid squares that cover the rectangular world.

* <i>zones</i> are rectangular regions comprised of one or more contiguous squares.

Squares are created automatically; new squares cannot be added and existing squares cannot be removed. In contrast, actors and zones are added and removed as required.

## State and History

Each agent has a `state` property which can be anything (e.g. a string or a nested object) and can be assigned to or mutated at any time. That said, states are typically updated from inside the `agent.updateState` method. Similarly, the simulation object has a `state` property which is typically updated from the `sim.beforeTick` or `sim.afterTick` methods.

The simulation object and each agent also has a `history` property. This should be used to store any information about the agent/simulation that is not naturally kept in `state`, but is relevant to the future behavior of agents or the simulation, or to post-simulation analysis.

## Live Lists and Labels

A simulation maintains 'live lists' of agents of the same type, so we can get e.g. all actors (`sim.actors`) without any computation. <i>Labels</i> extend this idea to an arbitrary collection of agents. For example, a simulation may be comprised of a 'blue team' and 'red team', and the agents of each team may be spread across the simulation world and be of different types. To make it easy to select agents on the same team, we would give each agent a `team` label with the value `'red'` or `'blue'`.

Notes:

* Label names and values can be anything, but typically names are strings, and values are strings, integers or booleans.

* An agent can have any number of labels, and a label can take any number of values.

* For a 'present or absent' label, use the value `true` for present &mdash; since the `sim.withLabel` method uses `true` as the default label value.

* A label needn't be given to all agents &mdash; in the teams example above, there could be agents that are not on any team so are not given a `team` label.

* Labels can be added, removed and changed during the simulation.

## Movement and Forces

Actors can be moved directly or by <i>forces</i>. There are two types of force: <i>Interaction forces</i> specify how agents from different groups (or agents from the same group) interact with each other. Attraction and repulsion are examples of interaction forces. In contrast, <i>Steering forces</i> give an actor individual behavior, such as chasing another actor.

## Update Order

Each tick, the simulation follows these steps:

1. increment `sim.tickIndex`
1. update actors' `containsCurrent` properties
1. call `sim.beforeTick`
1. update actors' radii and masses
1. update actors' pointings
1. update actors' velocities and positions using forces
1. shift actors listed in `containsCurrent` properties
1. call `actor.updateState` for each actor
1. call `square.updateState` for each square
1. call `zone.updateState` for each zone
1. call `sim.afterTick`
1. call `sim.stop`

For agents of the same type, the `updateState` methods are called in the order that the agents were added to the simulation.

## Visualisation

Atomic Agents has its own visualisation module: [Atomic Agents Vis](https://gjmcn.github.io/atomic-agents-vis/). However, this is not the only option; the information required to visualise a simulation is easily accessible so other visualisation libraries can be used.

## User Interaction

Methods such as `sim.afterTick` and `agent.updateState` can access DOM elements or non-simulation variables and act accordingly. For example, a range input may indicate the rate at which a given kind of actor should be added to the simulation; `sim.afterTick` could be used to create the new actors in line with the input's current value.

When using [Atomic Agents Vis](https://gjmcn.github.io/atomic-agents-vis/), event listeners can be added to agents and the background.

## Install

Atomic Agents runs in any modern JavaScript environment.

To install with npm:

```
npm install @gjmcn/atomic-agents
```

Alternatively, import directly from the Skypack CDN (browser only):

```js
// import everything as AA
import * as AA from 'https://cdn.skypack.dev/@gjmcn/atomic-agents';
```

```js
// or use named imports
import { Simulation, Actor, Zone, /* others */ } from
  'https://cdn.skypack.dev/@gjmcn/atomic-agents';
```

?> Note: append `?min` to the Skypack URL for minified code.

## Quick Start Example

Bouncing circles:

```js
import * as AA from 'https://cdn.skypack.dev/@gjmcn/atomic-agents';
import * as AV from 'https://cdn.skypack.dev/@gjmcn/atomic-agents-vis';

// simulation
const sim = new AA.Simulation({
  width: 600,
  height: 400,
  gridStep: 25
});

// circles
sim.populate({
  n: 200,
  radius: 4,
  setup: ac => ac.vel = AA.Vector.randomAngle(2)
});

// circles bounce off each other
sim.interaction.set('circle-bounce', {
  group1: sim.actors,
  behavior: 'bounce',
  speed: 2  // fixed speed circles
});

// circles bounce off the simulation boundary
sim.interaction.set('boundary-bounce', {
  group1: sim,
  group2: sim.actors,
  behavior: 'bounce'
});

// run and visualise 
AV.vis(sim);
```

## Performance

The simulation grid is used as a simple <i>spatial index</i>: we track which squares each agent overlaps, so can find e.g. the neighbors of an agent without a naive search. With this in mind, here are some performance notes and tips:

* Standard <i>proximity methods</i> such as `agent.neighbors` use the spatial index, whereas `From` proximity methods such as `agent.neighborsFrom` are passed a list of candidates to iterate over. Typically, the standard methods are faster, but the `From` methods are faster when there are few candidates and/or the standard method would need to look far from the calling agent (i.e. over many grid squares). For example, consider a simulation of 3 'predators' and 1000 'prey', where each predator locates the nearest prey at each timestep and vice versa. In this case, we should use the `predator.nearest` method to find the prey, but `prey.nearestFrom` to find the predator.

* For simulations that contain actors (and to a lesser extent, zones), the size of grid squares affects performance: if squares are too large relative to actors, proximity methods will need to consider lots of candidates. If squares are too small relative to actors, proximity methods will need to search over lots of squares. In many cases, squares are part of the simulation (rather than just being elements of the spatial index), so simulation design (rather then performance) will dictate square size.

* Most forces use proximity methods internally, so the size of grid squares affects the performance of forces. Also, many forces have an `off` option &mdash; the the distance above which the force is not applied. `off` has a big impact on performance, with larger `off` being more expensive.

* Use labels to track arbitrary dynamic collections of agents that need to be 'selected' one or more times.

* Register [polylines](#polyline) with the simulation using `sim.registerPolylines` and use the returned function to find nearest points &mdash; rather than using the `pointNearest` polyline method.

# API

## Summary

Atomic Agents exports the following:

* [`Simulation`](#simulation): simulation class.
* [`Actor`](#actor), [`Square`](#square), [`Zone`](#zone): agent classes.
* [`XSet`](#xset): subclass of JavaScript's `Set` with extra methods.
* [`Vector`](#vector): 2D vector class.
* [`Polyline`](#polyline): 2D polyline class.
* [`random`](#random): functions for generating random numbers.
* [Helper functions](#helpers).

These are described in detail in the following sections.

Notes:

* Properties labelled __"read only"__ are actually writable &mdash; __do not change them!__

* When a __"user-defined"__ method is passed as on option to a constructor, the method is set on the instance. For example, `let a = new Actor({updateState: f})` is equivalent to `let a = new Actor(); a.updateState = f`. 

## `Simulation`

__Constructor:__ `new Simulation(options = {})`, where `options` can be used to initialise the following properties and methods:

&emsp;&emsp;`width`<br>
&emsp;&emsp;`height`<br>
&emsp;&emsp;`gridStep`<br>
&emsp;&emsp;`state`<br>
&emsp;&emsp;`history`<br>
&emsp;&emsp;`updateMassesAndRadii`<br>
&emsp;&emsp;`updatePointings`<br>
&emsp;&emsp;`updateActorStates`<br>
&emsp;&emsp;`updateSquareStates`<br>
&emsp;&emsp;`updateZoneStates`<br>
&emsp;&emsp;`applyInteractionForces`<br>
&emsp;&emsp;`applySteeringForces`<br>
&emsp;&emsp;`applyContainers`<br>
&emsp;&emsp;`beforeTick`<br>
&emsp;&emsp;`afterTick`<br>
&emsp;&emsp;`stop`<br>

### Properties <small>&ndash; read only</small>

| Property | Type | Default | Description |
|:---|:---|:---|:---|
| `width` | number | `300` | Simulation width. |
| `height` | number | `300` | Simulation height. |
| `gridStep` | number | `20` | Width of simulation squares &mdash; must be a factor of `width` and `height`. |
| `tickIndex` | number | | Current simulation tick. `tickIndex` starts at `-1` and is incremented at the start of each tick &mdash; see [Update Order](#update-order). |
| `actors` | [xset](#xset) |  | Actors in simulation in order that added. |
| `squares` | [xset](#xset) |  | Squares in simulation; ordered top-left to bottom-right, top row first, then second row, and so on. |
| `zones` | [xset](#xset) | | Zones in simulation in order that added. |
| `x` | number |  | `width / 2` |
| `y` | number |  |`height / 2` |
| `xMin` | number |  | `0` |
| `xMax` | number |  | `width` |
| `yMin` | number |  | `0` |
| `yMax` | number |  |`height` |
| `xMinIndex` | number |  | `0` (x-grid-index of squares in first column). |
| `xMaxIndex` | number |  | `width / gridStep - 1` (x-grid-index of squares in last column). |
| `yMinIndex` | number |  | `0`  (y-grid-index of squares in first row). |
| `yMaxIndex` | number |  | `height / gridStep - 1` (y-grid-index of squares in last row). |
| `applyContainers` | boolean | `true` | Apply [containers](#containers). |

### Properties <small>&ndash; read/write/mutate</small>

These properties can be set when creating a simulation, and set/mutated when it is running.

| Property | Type | Default | Description |
|:---|:---|:---|:---|
| `state` | any | `{}` |  See [State and History](#state-and-history). |
| `history` | any | `{}` | See [State and History](#state-and-history). |
| `interaction` | map | `new Map()` | [Interaction forces](#interaction-forces); use map methods to add/delete forces. |
| `updateMassesAndRadii` | boolean | `true` | Update actors' masses and radii each tick. |
| `updatePointings` | boolean | `true` | Update actors' pointings each tick. |
| `updateActorStates` | boolean | `true` | Update actors' states each tick. |
| `updateSquareStates` | boolean | `true` | Update squares' states each tick. |
| `updateZoneStates` | boolean | `true` | Update zones' states each tick. |
| `applyInteractionForces` | boolean | `true` | Apply [interaction forces](#interaction-forces) each tick.  |
| `applySteeringForces` | boolean | `true` | Apply [steering forces](#steering-forces) each tick. |

?> Note: the `update...` and `apply...` properties can be used to suspend all updates/forces of a given type, or to avoid unnecessary computation when the relevant updates/forces are not used at all in the simulation. 

?> Note: if both `applyInteractionForces` and `applySteeringForces` are `false`, actors will not undergo any velocity-based movement, even if their current speed is nonzero.

### Properties <small>&ndash; static, read/write</small>

Static properties are accessed via the `Simulation` class itself. E.g. `Simulation.single = true`.

| Property | Type | Default | Description |
|:---|:---|:---|:---|
| `single` | boolean | `false` | If `true`, `Simulation` keeps a reference to the most recently created simulation and calls its `end` method when a new simulation is created. |

### Methods <small>&ndash; basic</small>

| Method | Description | Return |
|:---|:---|:---|
| `tick()` | Run the simulation for 1 tick. If the simulation is paused or has ended, calling `tick` does nothing. | simulation |
| `run()` | Run the simulation until it ends or is paused. If the simulation is paused or has ended, calling `run` does nothing. | simulation |
| `pause(p = true)` | Pause or unpause the simulation. If the simulation is paused during a tick, the current tick completes. Unpausing the simulation allows it to resume, but `tick` or `run` must be called to actually resume the simulation.<br><br>__Note:__ do not make changes to the simulation while it is paused, except for possibly calling `end` to end the simulation. | simulation | 
| `end()` | End the simulation. If `end` is called during a tick, the current tick completes. Once the simulation has ended, calling the `tick` or `run` methods does nothing. | `simulation` |
| `vis(options = {})` | Set visualisation options used by [Atomic Agents Vis](https://gjmcn.github.io/atomic-agents-vis/). This method can only be called once. | simulation |
| `withLabel(name, value = true)` | All agents with label `name` equal to `value`. |  [xset](#xset) which should not be mutated. |
| `filter(f, returnArray)` | Each agent in the simulation is passed to the function `f`; if `f` returns a truthy value, the agent is included in the result. Returned agents are ordered: actors, squares, zones; within a given type, agents are in the order they were added to the simulation. | [xset](#xset) or array (if `returnArray` is truthy). |
| `squareAt(xIndex, yIndex)` | Square at given grid indices (which are zero-based). | [square](#square) or `undefined` |
| `squareAtIndex(index)` | Square at given linear-grid-index (which is zero-based and runs top-left to bottom-right, top row first, then second row, and so on). | [square](#square) or `undefined` |
| `squareOf(x, y)` | Square that the point `x`,`y` is in. If the point lies on a square boundary, the square to the right/below is used (unless the point is on the right/bottom edge of the simulation). | [square](#square) or `undefined` |
| `squaresInRect(rect)` | `rect` describes a rectangle by its grid indices. `rect` can be an iterable with elements `xMinIndex`, `xMaxIndex`, `yMinIndex`, `yMaxIndex`, or an object with these properties (such as a simulation object or a zone). The rectangle may be partially (or completely) outside the simulation grid. Returns the squares of the rectangle ordered top-left to bottom-right, top row first, then second row, and so on. | array |
| `squaresInCircle(circle,`<br>&emsp;`contain = 'within')` | Get squares in `circle` &mdash; an object with `x`, `y` and `radius` properties. `contain` specifies when a square is 'in' the circle; `contain` can be `'within'`, `'centroid'` or `'overlap'`  The circle may be partially (or completely) outside the simulation grid.<br><br>__Note:__ The current implementation of `squaresInCircle` creates a temporary actor, and adds and removes it from the simulation. | array |
| `randomX(padding)` | Random value between 0 (inclusive) and `sim.width` (exclusive). If `padding` is used, the returned value is at least `padding` from 0 and `sim.width`. | number |
| `randomY(padding)` | Random value between 0 (inclusive) and `sim.height` (exclusive). If `padding` is used, the returned value is at least `padding` from 0 and `sim.height`. | number |
| `frame(period, steps)` | `sim.frame(period, steps)` is equivalent to `frame(period, steps, sim.tickIndex)`. See [`frame`](#helpers) for details. | number |
| `registerPolylines(`<br>&emsp;` polylines, off = Infinity)` | `polylines` should be a single [polyline](#polyline) or an iterable of polylines; `off` is the distance above which points are not considered close to polylines. Returns a function that takes a 'point' (an object with `x` and `y` properties) and returns an object with information about the nearest point on any of the polylines: a `line` property containing the polyline of the nearest point, and all the properties returned by the [`pointNearest`](#methods-ndash-instance-2) polyline method.<br><br>__Note:__ the returned function returns `null` when passed a point that is outside the simulation grid (or for an actor, does not overlap the grid) or if the point is greater than `off` distance from the polylines. | function |
| `paths(destinations,`<br>&emsp;` costs = [], taxicab)` | Computes shortest paths &mdash; see [Go Behavior](#go-behavior). | map |
| `fitGrid(options = {})` | Generate grid points in simulation grid. `sim.fitGrid(options)` is equivalent to `gridInRect(sim, options)` &mdash; see [`gridInRect`](#helpers). | array |
| `randomCircles(options = {})` | Generate random circles (i.e. objects wth properties `x`, `y` and `radius`) that fit within the simulation grid. `options` is an object; valid properties and their defaults are:<ul style="margin:0"><li>`n = 1`: number of circles; not used if both `nMax` and `nMin` are used.</li><li>`nMax = n`: max number of circles; use `Infinity` to get as many as possible &mdash; but ensure `nMin` is not `Infinity`.</li><li>`nMin = n`: min number of circles.</li><li>`aimForMax = true`: aim for `nMax` circles? If `false`, aims for random integer between `nMin` and `nMax` &mdash; always aims for `nMax` if it is `Infinity`.</li><li>`radius = 5`: radius of circles; can be a function that returns a radius (passed the circle's center as separate x and y arguments).</li><li>`exclude = null`: iterable of agents that circles cannot overlap.</li><li>`gap = 0`: min distance between circles (if overlap falsy) and between circles and excluded agents.</li><li>`padding = 0`: min distance between circles and edge of simulation grid.</li><li>`overlap = false`: if `true`, circles can overlap.</li><li>`retry = 5000`: max total retries after generate invalid circle. `randomCircles` throws an error if `nMin` valid circles are not found within the permitted retries.</li></ul><br>__Note:__ when `overlap` is `false`, `randomCircles` may fail to find a solution &mdash; even when one exists. The current implementation simply generates a random circle, checks if it is valid, generates another circle, and so on. | array |
| `populate(options)` | Create new actors in simulation grid. `options` is passed to the `fitGrid` or `randomCircles` method. Extra options (and their defaults) used by `populate` are:<ul style="margin:0"><li>`addToSim = true`: add new actors to simulation?</li><li>`random = false`: if `true` use `randomCircles`; otherwise use `fitGrid`.</li><li>`radius = 5`: radius of actors; can be a function that returns a radius (passed the actor's initial `x` and `y`, and its index within the new actors).</li><li>`mass = 1`: mass of actors; can be a function &mdash; see `radius`.</li><li>`setup`: function to call on each new actor; passed the actor and its index (within the new actors). If `addToSim` is `true`, `setup` is called after the actor is added to the simulation.</li></ul><br>__Note:__ when `random` is `true`, `padding` refers to the distance between the simulation boundary and an actor's boundary &mdash; this is how `randomCircles` works. When `random` is `false`, `padding` refers to the distance from the simulation boundary to an actor's centroid &mdash; this is how `fitGrid` works.  | array |
| `partition(options = {})` | Recursively partition the simulation grid into zones. Uses (and passes `options` to) [`partitionRect`](#helpers). There are two additional options:<ul style="margin:0"><li>`addToSim = true`: specifies whether the returned zones are added to the simulation.</li><li>`setup`: function to call on each new zone; passed the zone and its index (within the partition). If `addToSim` is `true`, `setup` is called after the zone is added to the simulation.</li></ul> | array |
| `regions(options = {})` | Generate connected regions; each region is an [xset](#xset) of squares. See below for valid options. | array |

The valid options for `regions` are:

| Name | Type | Default | Description |
|:---|:---|:---|:---|
| `maxRegions` | number | `1` | Max number of regions; use `Infinity` to get as many as possible &mdash; but ensure `minRegions` is not `Infinity`. |
| `minRegions` | number | `maxRegions` | Min number of regions. |
| `aimForMaxRegions` | boolean | `true` | Aim for `maxRegions`? If `false`, aims for randomly chosen number between `minRegions` and `maxRegions`. Always aims for `maxRegions` if it is `Infinity`. |
| `maxSquares` | number | `2` | Max squares in region. |
| `minSquares` | number | `maxSquares` | Min squares in region. |
| `aimForMaxSquares` | boolean | `true` | Aim for `maxSquares`? If `false`, aims for randomly chosen number between `minSquares` and `maxSquares`. |
| `shape` | string | `'smooth'` | `'smooth'`, `'smoothish'`, `'any'`, `'roughish'` or `'rough'`. 'Smoothness' is how much an evolving region prefers to choose a next square that has horizontal and vertical neighbors already in the region. |
| `exclude` | iterable | `null` | Iterable of agents whose squares cannot appear in regions. |
| `gap` | number | `1` | Min distance (in squares) between regions, and also between regions and excluded agents. |
| `padding` | number | `0` | Min distance (in squares) between regions and edge of simulation grid. |
| `retry` | number | `100` | Max total retries after generating a region with fewer than `minSquares`. `regions` throws an error if `minRegions` regions are not found within the permitted retries. |
| `setup` | function | `null` | Function to call on each square of each region; passed the square, region (xset), square index (within the region) and region index. |
| `grow` | number | `null` | If truthy, should be `1`, `2`, `3` or `4`: indicates that a region only grows from the last added square, and the value of `grow` specifies the max number of directions the region can grow in. |

Notes on `regions`:

* The default values `shape: 'smooth', grow: null` produce the smoothest regions.

* When `shape` is `'smooth'`, regions will not have holes regardless of the value of `grow` (except that when `grow` is `null` or `4` and other options permit, a region could potentially enclose exluded squares or another region). When `shape` is not `'smooth'`, and `grow` is `null` or `4`, regions of more than 6 squares may contain holes.

### Methods <small>&ndash; proximity</small>
| Method | Description | Return |
|:---|:---|:---|
| `layer(level = -1)` | <ul style="margin:0"><li>`level` > 0: empty array.</li><li>`level` = `0`: all squares of the simulation grid.</li><li>`level` < 0: if `level` is `-1`, get the boundary squares of the simulation grid; if `level` is `-2`, get squares that are one away from the boundary; and so on.</li></ul>The returned squares are ordered clockwise from the top-left, unless `level` is `0`, in which case squares are ordered top-left to bottom-right, top row first, then second row, and so on. | array |

### Methods <small>&ndash; user-defined</small>

| Method | Description |
|:---|:---|
| `beforeTick()` | Called each tick before agents are updated. |
| `afterTick()`  | Called each tick after agents are updated. |
| `stop()`       | Called after each tick. If a truthy value is returned, the simulation ends: calling the `tick` or `run` methods does nothing. |

## `Agent`

Abstract agent class. `Agent` is not used directly (it is not exported), but is important since [`Actor`](#actor), [`Square`](#square) and [`Zone`](#zone) extend `Agent`.

__Constructor:__ `new Agent(options = {})`, where `options` can be used to initialise the following properties and methods:

&emsp;&emsp;`x`<br>
&emsp;&emsp;`y`<br>
&emsp;&emsp;`state`<br>
&emsp;&emsp;`history`<br>
&emsp;&emsp;`updateState`<br>

### Properties <small>&ndash; read only</small>

| Property | Type | Description |
|:---|:---|:---|
| `x` | number | x coordinate of centroid. |
| `y` | number | y coordinate of centroid.  |
| `bounceLog` | [xset](#xset) | Agents that bounced against the calling agent this tick &mdash; as detected by bounce [interaction forces](#interaction-forces) that are logging. <br><br>__Note__: `bounceLog` is useful for handling collisions. It is typically used from the agent's `updateState` method or the `sim.afterTick` method &mdash; bounce logs are empty when `sim.beforeTick` is called. |

### Properties <small>&ndash; read/write/mutate</small>

| Property | Type | Default | Description |
|:---|:---|:---|:---|
| `state` | any | `{}` |  See [State and History](#state-and-history). |
| `history` | any | `{}` | See [State and History](#state-and-history). |

### Methods <small>&ndash; basic</small>

| Method | Description | Return |
|:---|:---|:---|
| `addTo(sim)` | Add agent to simulation. | agent |
| `remove()` | Remove agent from simulation. | agent |
| `label(name, value)` | Set the agent's `name` label to `value`. Pass `null` as the value to remove the label from the agent. Omit `value` to get the current label value &mdash; `undefined` if the agent does not have the label.<br><br>__Note:__ a label value cannot be set to `undefined`. `agent.label(name, undefined)` is equivalent to `agent.label(name)` which gets the current label value. | agent or label value |
| `fitGrid(options = {})` | Generate grid points in agent. `agent.fitGrid(options)` is equivalent to `gridInRect(agent, options)` (or `gridInHex(agent, options)` if the agent is an actor). See [`gridInRect`](#helpers) and [`gridInHex`](#helpers) for details. | array |
| `randomCircles(options = {})` | Generate random circles (i.e. objects wth properties `x`, `y` and `radius`) that fit within the agent &mdash; see [`sim.randomCircles`](#methods-ndash-basic) for details. | array |
| `populate(options = {})` | Create new actors in agent &mdash; see [`sim.populate`](#methods-ndash-basic) for details. | array |

### Methods <small>&ndash; proximity</small>

| Method | Description | Return |
|:---|:---|:---|
| `distance(otherAgent)` | Shortest distance between agents: boundary to boundary, or zero if the agents overlap. | number |
| `centroidDistance(otherAgent)` | Distance between agents' centroids. | number |
| `isOverlapping(otherAgent)` | Is the calling agent overlapping `otherAgent`? | boolean |
| `isWithin(otherAgent)` | Is the calling agent fully within `otherAgent`? | boolean |
| `isCentroidWithin(otherAgent)` | Is the calling agent's centroid within `otherAgent`? | boolean |
| `isEnclosing(otherAgent)` | Is `otherAgent` fully within the calling agent? | boolean |
| `isEnclosingCentroid(otherAgent)` | Is centroid of `otherAgent` within the calling agent? | boolean |
| `neighbors(maxDistance, type)` | Agents of the given `type` ( `'actor'`, `'square'` or `'zone'`) that have shortest distance to the calling agent less than `maxDistance`. | array |
| `overlapping(type)` | Agents of the given `type` ( `'actor'`, `'square'` or `'zone'`) that overlap the calling agent. | array |
| `within(type)` | Agents of the given `type` ( `'actor'`, `'square'` or `'zone'`) that the calling agent is fully within. | array |
| `centroidWithin(type)` | Agents of the given `type` ( `'actor'`, `'square'` or `'zone'`) that the calling agent's centroid is within. | array |
| `enclosing(type)` | Agents of the given `type` ( `'actor'`, `'square'` or `'zone'`) that are fully within the calling agent. | array |
| `enclosingCentroid(type)` | Agents of the given `type` ( `'actor'`, `'square'` or `'zone'`) whose centroids are within the calling agent. | array |
|`neighborsFrom`<br>`overlappingFrom`<br>`withinFrom`<br>`centroidWithinFrom`<br>`enclosingFrom`<br>`enclosingCentroidFrom` | Same as the above methods, but instead of passing a string for `type`, pass an iterable of candidate agents that the returned agents are selected from. | array |
| `layer(level = 1)` | <ul style="margin:0"><li>`level` > 0: if `level` is `1`, get squares immediately outside the agent; if `level` is `2`, get squares exactly one square away from the boundary; and so on.</li><li>`level` = `0`: all squares inside the agent.</li><li>`level` < 0: if `level` is `-1`, get the agent's boundary squares; if `level` is `-2`, get squares (inside the agent) that are one away from the boundary; and so on.</li></ul>The returned squares are ordered clockwise from the top-left, unless `level` is `0`, in which case squares are ordered top-left to bottom-right, top row first, then second row, and so on.<br><br>__Note:__ when the calling agent is an actor, `layer` is based on the squares in (or which overlap) the actor's bounding box. If the actor is partly outside the simulation grid, the bounding box of the actor is still used &mdash; <i>not</i> the bounding box of the part of the actor inside the grid. | array |

Notes:

* `neighbors`, `overlapping`, `within`, `centroidWithin`, `enclosing` and `enclosingCentroid` return `null` when called from an actor that does not overlap the simulation grid. Furthermore, these methods only return actors that overlap the grid, and even then may fail to return actors that are partially outside the grid &mdash; this happens when the feature of interest (e.g. the overlap between actors) is outside the grid. The `From` versions of these methods do not use the grid, so are not affected by these issues.

* `layer` returns `null` when called from an actor that does not overlap the simulation grid.

* Agents only overlap if they have an 'actual overlap' &mdash; a shared boundary or corner is not enough. For example, neighboring squares/zones <i>do not</i> overlap.

* An agent can be within an another agent without there being any 'padding'. For example, a 1-square zone is within the square &mdash; and the square is within the zone.

* An agent's centroid has zero area, so e.g. an actor's centroid <i>can be</i> within multiple squares (this happens when the centroid is on a boundary between squares). In contrast, agents themselves have nonzero area, so e.g. an actor <i>cannot</i> be within two separate squares.

* Many of the above methods are actually implemented by the [`Actor`](#actor), [`Square`](#square) and [`Zone`](#zone) subclasses, but are covered here since conceptually, the behavior of these methods is the same for all agents.

### Methods <small>&ndash; user-defined</small>

| Method | Description |
|:---|:---|
| `updateState(sim)` | Called each tick; typically updates the agent's `state` and/or `history`. |

## `Actor`

A round agent that can move.

__Extends:__ [`Agent`](#agent).

__Constructor:__ `new Actor(options = {})`, where `options` is passed to the [Agent](#agent) constructor as well as used to initialise the following properties and methods:

&emsp;&emsp;`zIndex`<br>
&emsp;&emsp;`radius`<br>
&emsp;&emsp;`mass`<br>
&emsp;&emsp;`vel`<br>
&emsp;&emsp;`pointing`<br>
&emsp;&emsp;`maxSpeed`<br>
&emsp;&emsp;`maxForce`<br>
&emsp;&emsp;`steerMaxForce`<br>
&emsp;&emsp;`still`<br>
&emsp;&emsp;`wrap`<br>
&emsp;&emsp;`wrapX`<br>
&emsp;&emsp;`wrapY`<br>
&emsp;&emsp;`contains`<br>
&emsp;&emsp;`updateRadius`<br>
&emsp;&emsp;`updateMass`<br>
&emsp;&emsp;`updatePointing`<br>

### Properties <small>&ndash; read only</small>

| Property | Type | Default | Description |
|:---|:---|:---|:---|
| `radius` | number | `5` | Radius. |
| `mass` | number | `1` | Mass. When creating the actor, pass `'area'` to use the actor's area. |
| `squares` | [xset](#xset) |  | Squares the actor currently overlaps (in no specific order). This property is `null` if the actor is not in a simulation. |
| `overlappingGrid` | boolean |  | Is the actor overlapping the simulation grid? |
| `type` | string |  | Value: `'actor'`. |
| `containsCurrent` | `null` or iterable |  | Currently contained actors &mdash; see [Containers](#containers). |

?> Note: `radius` and `mass` can be changed via the `updateRadius` and `updateMass` methods. 

### Properties <small>&ndash; read/write/mutate</small>

| Property | Type | Default | Description |
|:---|:---|:---|:---|
| `zIndex` | number | `-Infinity` | Used by visualisation libraries &mdash; see [Atomic Agents Vis - Drawing Order](https://gjmcn.github.io/atomic-agents-vis/#/?id=drawing-order). |
| `vel` | [vector](#vector) | `new Vector()` | Velocity. Can be set or mutated directly, but is more often modified via [forces](#forces) |
| `pointing` | number | `null` | Pointing. Can be set directly, but is more often modified via an [`updatePointing`](#methods-ndash-user-defined-2) method.<br><br>__Note:__ use `actor.heading()` (i.e. angle of velocity) to get an actor's direction. `pointing` is typically only used for actors that are stationary, or moving in one direction but pointing in another. |
| `maxSpeed` | number | `4` | Max speed. |
| `maxForce` | number | `Infinity` | Max magnitude of force. |
| `steerMaxForce` | number | `Infinity` | Max magnitude of [steering force](#steering-forces). |
| `steer` | map | `new Map()` | Each element specifies a [steering force](#steering-forces). |
| `still` | boolean | `false` | If `true`, the actor does not move &mdash; unless moved directly with `setXY` or `useXY`. (Using `still` to prevent movement is more efficient than setting `maxSpeed` or `maxForce` to zero.) |
| `contains` | any | `null` | Contained actors &mdash; see [Containers](#containers). |
| `wrap`<br>`wrapX`<br>`wrapY` | boolean | `false` | If `wrap` or `wrapX` is `true`, the computed value of the actor's `x` property is shifted by a multiple of `sim.width` so that it lies between `0` (inclusive) and `sim.width` (exclusive). Similarly, if `wrap` or `wrapY` is `true`, the actor's `y` property is wrapped. |

!> Aside from the `wrap` properties, a simulation has no understanding of wrapping. For example, [forces](#forces) and proximity methods do not consider wrapping.  

### Methods <small>&ndash; basic</small>

| Method | Description | Return |
|:---|:---|:---|
| `setXY(x, y)` | Set the `x` and `y` properties of the actor. | actor |
| `useXY(v)` | As `setXY`, except that `v` is an object with numeric `x` and `y` properties &mdash; so can be an agent, simulation or [vector](#vector). | actor |
| `heading()` | Angle of velocity from the positive x-axis (radians, -π to π). | number |
| `vis(options = {})` | Set visualisation options used by [Atomic Agents Vis](https://gjmcn.github.io/atomic-agents-vis/). This method can only be called once. | actor |
| `regions(options = {})` | Generate connected regions within actor; each region is an [xset](#xset) of squares. See the [`sim.regions`](#methods-ndash-basic) method for details. | array |

### Methods <small>&ndash; proximity</small>

| Method | Description | Return |
|:---|:---|:---|
| `squareOfCentroid()` | Get the square that the centroid of the calling actor is in. `actor.squareOfCentroid()` is equivalent to `sim.squareOf(actor.x, actor.y)`. | [square](#square) or `undefined` |
| `insideDistance(otherAgent)` | If the calling actor is fully within `otherAgent`, returns the smallest distance between the agents' boundaries. Otherwise, the 'distance' is negative, and is measured from the boundary of `otherAgent` to the furthest point on the boundary of the calling actor which lies outside `otherAgent`. | number |
| `nearest(k, filterFunction, type)` | For agents of the given `type` ( `'actor'`, `'square'` or `'zone'`) and that satisfy the `filterFunction`, get the `k` agents which are the shortest distance from the calling actor. `filterFunction` is passed a candidate agent and the calling actor; if the function returns a truthy value, the candidate may be included in the result. Use a falsy value for `filterFunction` if no filtering is required. Depending on `filterFunction` and `type`, and on the number of agents in the simulation, `nearest` may return fewer than `k` agents. | array |
| `nearestFrom(k, candidates)` | As `nearest`, but `filterFunction` and `type` are replaced by `candidates`: an iterable of agents that the returned agents are selected from. | array |

Notes:

* `nearest` returns `null` when the calling actor does not overlap the simulation grid. When getting actors, `nearest` only considers actors that overlap the grid.

* Agents returned by `nearestFrom` are in ascending order of distance from the calling actor. This is also true for `nearest` when getting squares or zones, but may not be true when getting actors &mdash; since actors that are partly outside the grid may not be 'found', or may be further down the ordering than expected.

### Methods <small>&ndash; user-defined</small>

| Method | Description |
|:---|:---|
| `updateRadius(sim)` | Returns the new radius. |
| `updateMass(sim)` | Returns the new mass. If `updateMass` is the string `'area'` rather than a function, the actor's mass is adjusted automatically when the radius changes so that the mass always equals the actor's area. (Remember to also set `mass` to `'area'` when creating the actor). |
| `updatePointing(sim)` | Returns the new pointing; automatically normalized to lie between 0 (inclusive) and 2π (exclusive). |

### Forces

There are two types of <i>forces</i> that can be used to move actors:

* __Interaction Forces__ specify how agents from different groups interact with each other (e.g. balls bounce off buildings), or how actors in the same group interact with each other (e.g. ants avoid bumping into each other).

* __Steering Forces__ are set at the agent level to give an actor individual behavior, such as chasing another actor.

Notes:

* Forces can be changed, added or removed at any point in the simulation.

* Set an actor's `maxForce` property to limit the total force that can be applied to it. Set `actor.steerMaxForce` to limit the total steering force.

* Set an actor's `maxSpeed` property to set its maximum speed. Each steering force can have its own `maxSpeed`.

* Forces are only applied to agents that overlap the simulation grid. An agent that does not overlap the grid continues along its current velocity, but does not contribute to forces applied to other agents.

* Interaction and steering forces offer a high-level way to implement various [steering behaviors](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.86.636&rep=rep1&type=pdf).

#### Interaction Forces

An interaction force specifies how agents from two different groups interact, or how agents within a group interact. Note that squares and zones can be subject to interaction forces &mdash; these agents cannot move, but we can still specify that e.g. actors bounce off zones.

Custom interaction forces can be used as required &mdash; and like other forces, these can be applied to the entire grid or within specified agents. Custom forces can be used for 'environment forces' such as wind and gravity rather than true 'interaction forces'.

Set and delete forces from the `sim.interaction` map as required. Each key-value pair of the map represents a force: its name (typically a string, but can be anything) and an object describing it. The object's properties are:

| Name | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `disabled` | function/boolean | `false` | Disable force. If `disabled` is a function, it is passed the simulation object and the returned value is treated as a boolean. |
| `group1` |  |  | Can be the simulation object (indicates the area covered by the simulation), an iterable of agents, or a function that is passed the simulation object and returns an iterable of agents. Duplicate agents are ignored. When `group1` is the simulation object:<ul style="margin:0"><li>the force is inward (the `inward` and `proximity` options are ignored)</li><li>avoid behavior cannot be used</li><li>if `behavior` uses a custom force function, `null` is passed as the first argument</li></ul>
| `group2` |  |  | As `group1`, except that `group2` can only contain actors. Omit `group2` (or use a falsy value) if it is the same as `group1` &mdash; i.e. when setting a 'within group' force; otherwise, ensure that the two groups do not share any elements. |
| `behavior` | string |  |  Specifies how a pair of agents from group 1 and group 2 interact. Valid values are <ul style="margin:0"><li>`'bounce'`</li><li>`'attract'`</li><li>`'repel'`</li><li>`'avoid'`: agents avoid colliding with each other by moving sideways</li><li>`'drag'`: an accelaration in the opposite direction to the current velocity (applied to group 2 agents that are inside group 1 agents)</li><li>`'custom'`: custom force (applied to group 2 agents that are inside group 1 agents)</li></ul> |
| `inward` | boolean | `false` | Used by bounce, attract and repel behaviors; indicates if group 1 agents apply the force inwardly rather than outwardly. |
| `proximity` |  |  | Specifies when/how a force is applied to a pair of agents. Depends on `behavior`:<ul style="margin:0"><li> `'bounce'` (default: `'centroid'`): bouncing always applies to boundaries, but `proximity` can help avoid [tunneling](https://nphysics.org/continuous_collision_detection/#the-tunneling-effect). Use `'overlap'` when group 2 agents should never enter (if `inward` is `false`) or exit (if `inward` is `true`) group 1 agents. Otherwise, use `'centroid'`.</li><li>`'attract'`, `'repel'` (default: `'overlap'`): for outward forces, use `'centroid'` to use centroid distance and `'overlap'` to use shortest distance. For inward attract and repel forces, the 'inside' shortest distance is always used. (An outward force that uses shortest distance is only applied if the group 2 agent's centroid is outside the group 1 agent; for an inner force, the group 2 agent's centroid must be within the group 1 agent.)</li><li>`'avoid'`: avoid behavior is based on shortest distance; the `proximity` option is not used.</li><li>`'drag'`, `'custom'` (default: `'centroid'`): specifies the extent that a group 2 agent must be overlapping a group 1 agent for the force to apply to the group 2 agent. Valid values are: `'overlap'`, `'centroid'` and `'within'`.</li></ul> |
|  `strength` | number/function | `1` | The computed force is scaled by this value. If `strength` is a function, it is passed the simulation object and the returned value is used. For drag behavior, `strength` specifies the drag's magnitude relative to the current velocity (so `strength` is typically close to `0`; the default value of `1` is not appropriate). `strength` does not affect bounce or custom forces. |
| `off` | number/function | `30` | Distance between agents above which attract, repel or avoid behavior is not applied. If `off` is a function, it is passed the simulation object and the returned value is used. `off` has a big impact on both performance (large `off` is more expensive) and the computed force (which is based on the current distance between agents divided by `off`). |
| `speed` | number/function |  | This optional property can only be used with an outward bounce behavior between actors. When used, the velocities produced by the force are scaled to `speed`. These uniform speeds give a smoother, but less physically accurate overall effect (very similar to [this Simulitis example](https://observablehq.com/@ambassadors/simulitis)). If `speed` is a function, it is passed the simulation object and the returned value is used. |
| `decay` | boolean | `true` | Specifies if an attract or repel behavior becomes weaker with distance (`true`) or stronger (`false`). |
| `ease` | string | `'easeLinear'` | Name of easing function for attract, repel or avoid behavior. This can be the name of any [D3 easing function](https://github.com/d3/d3-ease), but those with constant or increasing gradients give best results &mdash; e.g. `'easeLinear'`, `'easeQuadIn'`, `'easeCubicIn'`, `'easeSinIn'`, `'easeExpIn'`, `'easeCircleIn'.` |
| `recover` | boolean | `false` | Only used with avoid behavior. If `recover` is `false`, the force is only applied between objects that are heading towards each other. If  `recover` is `true`, the force is always used (assuming the agents are within `off` of each other). In the absence of other forces, `recover` will return an actor to roughly its original direction after avoiding an agent. If e.g. a seek force is also being used, `recover` will return an actor to its original heading before seeking the target. |
| `force` | [vector](#vector)/function |  | Only used with custom behavior. If `force` is a function, it is passed a group 1 agent and a group 2 agent, and should return a vector. |
| `log` | boolean | `false` | If `true`, each agent's `bounceLog` property includes the agents that bounced against it this tick. (Logging does not cover bounces against the simulation boundary.)|
| `logOnly` | boolean | `false` | As `log`, but the bounce force does not actually apply any force &mdash; it is just used to log collisions |<br><br>

Inward repel behavior acts from the boundary of a group 1 agent towards its centroid. This is similar to attract behavior that uses centroid distance, but the inner repel behavior only applies to group 2 agents with centroids inside the group 1 agent. Also, the `off` distance is measured inwards from the group 1 agent's boundary for an inwards repulsion, but outwards from the centroid for a centroid attraction. Similarly, an inward attract behavior (i.e. a group 1 agent pulls group 2 agents inside it towards the boundary) is comparable to an outward repel behavior that uses centroid distance.

The movement of an agent is not affected by its inward forces. For example, if an 'outer actor' contains an 'inner actor', and the inner actor bounces against the left side of the outer actor, it <i>does not</i> push the outer actor to the left.

Use avoid behavior when actors are likely to encounter each other while travelling in different directions, or when the group 1 agents are squares, zones or still actors. Use repel behavior to keep actors from colliding more generally. For example, if a group of ants is 'seeking' the ant-house, and a group of beetles is seeking the beetle-house, we might use a repel behavior to stop ants colliding with each other, another repel behavior to stop beetles colliding with each other, and an avoid behavior between ants and beetles. In other cases, forces may have to be more complex. For example, we may also require a repel force between ants and beetles, and possibly need to use callback functions for the `strength` or `disabled` options of the different forces so that they depend on the current circumstances.

?> Note: a high `strength` and/or `off` may be required for actors to avoid still agents. Try adding a weak repel behavior if the results are still unsatisfactory.

Some examples of interaction forces:

```js
// all actors collide with boundary of simulation grid
sim.interaction.set('edge-collide', {
  group1: sim,
  group2: sim.actors,
  behavior: 'bounce'
});

// remove force between actors and boundary
sim.interact.delete('edge-collide');

// wind and gravity
sim.interaction.set('wind-and-gravity', {
  group1: sim,
  group2: sim.actors,
  behavior: 'custom',
  force: (a1, a2) => new Vector(20, a2.mass)
});
```

If an interaction group is `sim.actors`, `sim.squares` or `sim.zones`, the group automatically updates as agents are added or removed. In all other cases where the group changes over time, use a function &mdash; even if the group is a [live list of labels](#live-lists-and-labels) (since the list may not currently exist or will be replaced if it ever becomes empty and is then needed again). An example:

```js
// agents with label 'ball' bounce off agents with label 'building'
sim.interaction.set('building-ball-bounce', {
  group1: () => sim.withLabel('building'),
  group2: () => sim.withLabel('ball'),
  behavior: 'bounce'
});
```

#### Steering Forces

Set and delete steering forces from the `actor.steer` map as required. Each key-value pair is the name of the force (typically a string, but can be anything) and an object describing it. The object's properties are:

| Name | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `disabled` | boolean/function | `false` | Disable the force. If `disabled` is a function, it is passed the simulation object (and inside the function, `this` is the actor) and the returned value is treated as a boolean. |
| `maxSpeed` | number/function | `actor.maxSpeed` | Max speed. If `maxSpeed` is a function, it is passed the simulation object (and inside the function, `this` is the actor) and the returned value is used. |
| `behavior` | string |  | <ul style="margin:0"><li>`'seek'`: steer directly towards target</li><li>`'flee'`: steer directly away from target</li><li>`'go'`: steer to 'nearest' (accounting for squares' <i>costs</i>) destination square &mdash; see [`'go'` behavior](#go-behavior)</li><li>`'wander'`: wander</li></ul> |
| `target` | agent/[vector](#vector)/function |  | Used by `'seek'` and `'flee'` behaviors. If `target` is a function, it is passed the simulation object (and inside the function, `this` is the actor) and should return an agent or a vector. If the target is falsy, no force is applied. |
| `off` | number/function | | <ul style="margin:0"><li>`'seek'` behavior (default: `0`): distance from the target <i>below</i> which the steering force is not applied.</li><li>`'flee'` behavior (default `Infinity`): distance from the target <i>above</i> which the steering force is not applied.</li></ul> If `off` is a function, it is passed the simulation object (and inside the function, `this` is the actor) and the returned value is used. |
| `slow` | number/function | |  <ul style="margin:0"><li>`'seek'` behavior (default: `0`): distance from the target <i>below</i> which the velocity starts to decrease linearly. When used, ensure `slow` > `off`</li><li>`'flee'` behavior (default `Infinity`): distance from the target <i>above</i> which the velocity starts to decrease linearly.  When used, ensure `slow` < `off`.</li></ul> If `slow` is a function, it is passed the simulation object (and inside the function, `this` is the actor) and the returned value is used. |
| `proximity` | boolean | `'overlap'` | Specifies how to measure distances between agents for `'seek'` and `'flee'` behaviors: `'overlap'` for shortest distance, `'centroid'` for centroid distance. Centroid distance is always used if the target is a vector. |
| `paths` | object |  | Shortest paths object &mdash; see [`'go'` behavior](#go-behavior). |
| `wanderStrength` | number/function | `0.1` | Max wandering turning angle (radians). If `wanderStrength` is a function, it is passed the simulation object (and inside the function, `this` is the actor) and the returned value is used. |
| `wanderRate` | number/function | `0.02` | Max change in wandering turning angle (radians per tick). If `wanderRate` is a function, it is passed the simulation object (and inside the function, `this` is the actor) and the returned value is used. |

?> Note: if an actor arrives at a small static target (`'seek'` behavior), the actor will go backwards and forwards over the target unless `slow` is used. Similarly, use `slow` to prevent a fleeing actor continuing at its current velocity when it reaches `off` distance from the target.

Some examples of steering forces (assuming that `cat` and `dog` are agents):

```js
// cat wanders 
cat.steer.set('cat-wander', {behavior: 'wander'});

// dog chases cat
dog.steer.set('dog-seek-cat', {behavior: 'seek', target: cat});

// cat runs from dog - keep existing behavior: wander + flee = 'evade'
cat.steer.set('cat-flee-dog', {behavior: 'flee', target: dog});

// remove steering forces from cat and dog
cat.steer.clear();                 // remove all with clear
dog.steer.delete('dog-seek-cat');  // remove by name with delete

// cat chases nearest mouse - target is evaluated every tick
cat.steer.set('cat-seek-mouse', {
  behavior: 'seek',
  target: () => this.nearest(1, a => a.label('species') === 'mouse', 'actor')[0]
});
```

Set `actor.steerMaxForce` (default: `Infinity`) to set a maximum steering force.

##### Steering and Polylines

We can use steering forces with [polylines](#polyline) to have actors e.g. seek the nearest point on a polyline (or set of polylines), or to steer along a polyline. For example:

```js
// create a polyline and register it with the simulation
const line = new AA.Polyline([[50, 50], [250, 250], [150, 50]]);
const nearest = sim.registerPolylines(line);

// actor moves to nearest point on polyline
const a1 = new AA.Actor({x: 270, y: 100, maxSpeed: 1}).addTo(sim);
a1.steer.set('to-line', {
  behavior: 'seek',
  target: nearest(a1).point
});

// actor heads for polyline then travels along it
const a2 = new AA.Actor({x: 100, y: 230, maxSpeed: 1}).addTo(sim);
a2.steer.set('along-line', {
  behavior: 'seek',
  target: () => line.pointAt(nearest(a2).param + 10)
});

// non-force approach: move actor along line explicitly
const a3 = new AA.Actor({x: 50, y: 50, state: {param: 0}}).addTo(sim);
a3.updateState = function() {
  this.useXY(line.pointAt(this.state.param++));
};
```

##### Go Behavior

`'go'` behavior steers an actor towards the 'nearest destination square', where 'nearest' is based on distance plus any additional costs associated with the squares that the actor will travel through. Use `sim.paths(destinations, costs, taxicab)` to get a shortest paths object for `'go'` behavior:

| Parameter | Type | Default | Description |
|:-----|:-----|:--------|:------------|
| `destinations` | map or array-of-arrays | | Each key is the name (typically a string, but can be anything) of a group of destination squares; the corresponding value is the group: a square or zone, or an iterable of squares/zones, ... any depth of nesting is allowed since the group is flattened into a set of unique squares. |
| `costs` | map or array-of-arrays | `[]` | Each key should be a square or zone, or an iterable of squares/zones, ... any depth of nesting is allowed since the key is flattened into a set of unique squares. The corresponding value is a nonnegative 'cost' (or 'extra distance') that is incurred when travelling through each of the squares. When the `taxicab` option is used, a square can appear in multiple keys; the total cost for a square is the sum of its individual costs.|
| `taxicab` | boolean | `false` | If `true`, paths are comprised purely of horizontal and vertical sections &mdash; though actors follow a slightly smoothed version of such paths. |

`sim.paths` returns a map with the same keys as `destinations`. Each value is a map: each key is a square; the value is the next point ([vector](#vector)) to steer to from the square (or `undefined` for destination squares and squares which cannot reach destination squares). This structure enables `'go'` behavior to always take the shortest path from an actor's current square. For example, if a 'wind' force pushes the actor off course, the shortest path based on the new location is used.

?> Note: when `taxicab` is `false`, there <i>should</i> be no restrictions on path angles. However, the current path algotithm is rather basic: squares in the same element of `costs` are partitioned into rectangles and optimal path angles within each rectangle are computed. This approach can produce suboptimal paths when an actor has to cross multiple rectangles. To minimise this problem, specify large rectangles of open space individually in `costs`.

?> Note: destination squares can have costs, but only costs for distination squares that border non-destination squares will affect `'go'` behavior &mdash; since the force is not applied to actors already in destination squares. To include 'door squares', use a cost of `Infinity` for all destination squares except the doors.

When adding `'go'` behavior, use the `paths` option to include the computed paths. To avoid unnecessary calls to `sim.paths`, save the result to a variable where appropriate:

```js 
const paths = sim.paths(
  [ // destinations
    ['den', sim.withLabel('den')],
    ['water', sim.withLabel('water')],
  ],
  [ // costs
    [sim.withLabel('mud'), 100]          // discourage travel through mud
    [sim.withLabel('swamp'), Infinity],  // do not travel through swamp
  ]
);

// send cubs to the den and all other wolves to drink
for (let wolf of sim.withLabel('wolf')) {
  wolf.label('cub')
    ? wolf.steer.set('den',   { behavior: 'go', paths: paths.get('den')   }
    : wolf.steer.set('water', { behavior: 'go', paths: paths.get('water') };
}
```

Computing shortest paths is relatively expensive: we use the Floyd-Warshall algorithm, which is <i>O(n<sup>3</sup>)</i> in the number of finite-cost squares. Here are some performance tips:

* Where possible, make all calls to `sim.paths` before starting the simulation. (When this is not possible, handle the delay while computing new paths appropriately &mdash; e.g. show a message or create a realistic scenario for a pause in the simulation.)

* For a given set of costs, call `sim.paths` once with multiple groups of destinations (rather than calling `sim.paths` multiple times with a single group of destinations each time).

* Assign a cost of `Infinity` to as many squares as possible &mdash; to squares that should not appear in paths, but also where e.g. a large section of the grid will clearly not influence the paths of interest.

### Containers

Atomic Agents does not have a container hierarchy, but an actor's `contains` property can be used to specify which other actors should be moved with it. Note that 'contained' actors may have their own movement &mdash; e.g. they may be bouncing around inside the moving 'container' actor.

The `contains` property should be one of:

| Value | Contained Actors |
|:--------------------|:-----------------|
| `'within'` | Actors fully withing the calling actor. |
| `'centroid'` | Actors whose centroids are within the calling actor. |
| `'overlap'` | Actors that overlap the calling actor. |
| iterable | The contained actors. |
| function | Passed the simulation object (and inside the function, `this` is the calling actor) and should return an iterable of actors &mdash; or an empty iterable or a falsy value if there are none. |  
| falsy | None. |

At the start of each tick (prior to `beforeTick` being called), each actor's `containsCurrent` property is updated. After that, agents' masses, radii and positions (based on forces) are updated as normal, then each actor in a `containsCurrent` property is shifted according to the movement of its container.

Notes:

* The shift applied to a contained actor is identical to the change in the container's positon &mdash; the shift is not affected by the `maxForce` and `maxSpeed` properties of the contained actor.

* Contained actors with a truthy `still` property are not shifted.

* Contained actors need not be physically inside their container. The `contains` property simply says "when this actor moves, these actors move with it".

* Be careful when moving actors directly with `actor.setXY` or `actor.useXY`. For example, direct moves applied to containers from `sim.beforeTick` will affect contained actors, but direct moves applied from `actor.updateState` or `sim.afterTick` will not &mdash; since these methods are called after position updates and shifts.

* Be careful when using nested moving containers: in the current version of Atomic Agents, the `contains` property must be set on outer containers before inner containers to get the correct behavior. 

## `Square`

A square of the simulation grid.

__Extends:__ [`Agent`](#agent).

!> Squares are added to a simulation automatically &mdash; squares cannot be removed and new squares should not be added. The `Square` class is only exported to allow methods and properties to be added. For example, we might choose to attach the same `updateState` method to all squares: `Square.prototype.updateState = ...`

The width and height of grid squares is `sim.gridStep`.

### Properties <small>&ndash; read only</small>

| Property | Type | Description |
|:---|:---|:---|
| `type` | string | Value: `'square'`. |
| `xMin` | number | x value at left of square. |  
| `xMax` | number | x value at right of square. |
| `yMin` | number | y value at top of square. | 
| `yMax` | number | y value at bottom of square. | 
| `xIndex` | number | Zero-based x-grid-index of the square. |  
| `yIndex` | number | Zero-based y-grid-index of the square. |
| `index` | number | Zero-based linear-grid-index of the square (top-left to bottom-right, top row first, then second row, and so on). |
| `checker` | number | `0` if `xIndex` and `yIndex` are both even, or both odd; otherwise `1`.  |
| `actors` | [xset](#xset) | Actors that currently overlap the square (in no specific order).|
| `zones` | [xset](#xset) | Zones that currently overlap the square (in the order the zones were added to the simulation).

### Properties <small>&ndash; read/write/mutate</small>

| Property | Type | Default | Description |
|:---|:---|:---|:---|
| `zIndex` | number | `NaN` | Used by visualisation libraries &mdash; see [Atomic Agents Vis - Drawing Order](https://gjmcn.github.io/atomic-agents-vis/#/?id=drawing-order). |

### Methods <small>&ndash; basic</small>

| Method | Description | Return |
|:---|:---|:---|
| `vis(options = {})` | Set visualisation options used by [Atomic Agents Vis](https://gjmcn.github.io/atomic-agents-vis/). This method can only be called once. | square |

### Methods <small>&ndash; proximity</small>

| Method | Description | Return |
|:---|:---|:---|
| `north()`<br>`northeast()`<br>`east()`<br>&ensp;...<br>`northwest()` | Neighboring square in the given direction | square or<br>`undefined` |
| `compass()` | Neighboring squares in an object with properties `'north'`, `'northeast'`, `'east'`, ... , `'northwest'`. A property has the value `undefined` if the corresponding square does not exist. | object |
| `compassMain()` | As `compass`, but only gets north, east, south and west neighbors. | object |
| `compassCorners()` | As `compass`, but only gets northeast, southeast, southwest and northwest neighbors. | object |
| `layerMain(level = 1)` | As [`layer`](#methods-ndash-proximity-1), but only gets neighbors that are directly above, below or to the sides of the calling square | array |

## `Zone`

A rectangular region comprised of one or more contiguous squares.

__Extends:__ [`Agent`](#agent).

__Constructor:__ `new Zone(options)`, where the `options` object is passed to the [Agent](#agent) constructor. `options` should also contain an `indexLimits` property of grid indices that specify the zone's boundary; this can an iterable with elements `xMinIndex`, `xMaxIndex`, `yMinIndex`, `yMaxIndex`, or an object with these properties (simulation objects and zones have such properties). An initial `zIndex` value can also be passed in `options`. 

### Properties <small>&ndash; read only</small>

| Property | Type | Description |
|:---|:---|:---|
| `type` | string | Value: `'zone'`. |
| `xMin` | number | x value at left of zone. |  
| `xMax` | number | x value at right of zone. |
| `yMin` | number | y value at top of zone. | 
| `yMax` | number | y value at bottom of zone. | 
| `xMinIndex` | number | Zero-based x-grid-index of the leftmost squares of the zone. |  
| `xMaxIndex` | number | Zero-based x-grid-index of the rightmost squares of the zone. |  
| `yMinIndex` | number | Zero-based y-grid-index of the top squares of the zone. |
| `yMaxIndex` | number | Zero-based y-grid-index of the bottom squares of the zone. |
| `squares` | [xset](#xset) | Squares in the zone (top-left to bottom-right, top row first, then second row, and so on). |

?> Note: if the zone is not in a simulation, `xMin`, `xMax`, `yMin`, `yMax` and `squares` are `null`, and `x` and `y` are meaningless.

### Properties <small>&ndash; read/write/mutate</small>

| Property | Type | Default | Description |
|:---|:---|:---|:---|
| `zIndex` | number | `-Infinity` | Used by visualisation libraries &mdash; see [Atomic Agents Vis - Drawing Order](https://gjmcn.github.io/atomic-agents-vis/#/?id=drawing-order). |

### Methods <small>&ndash; basic</small>

| Method | Description | Return |
|:---|:---|:---|
| `vis(options = {})` | Set visualisation options used by [Atomic Agents Vis](https://gjmcn.github.io/atomic-agents-vis/). This method can only be called once. | zone |
| `partition(options = {})` | Recursively partition zone into smaller zones. See the [sim.partition](#methods-ndash-basic) method for details. | array |
| `regions(options = {})` | Generate connected regions within zone; each region is an [xset](#xset) of squares. See the [`sim.regions`](#methods-ndash-basic) method for details. | array |

## `XSet`

An extended set class: adds extra methods to JavaScript's built-in [`Set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set), but does not change existing methods.

__Extends:__ `Set`.

__Constructor__: `new XSet()` or `new XSet(iterable)`.

### Methods <small>&ndash; instance</small>

| Method | Description | Return |
|:---|:---|:---|
| `copy()` | Shallow copy. `xs.copy()` is equivalent to `new XSet(xs)`. | xset |
| `adds(iterable)` | Add each element of `iterable` to the xset. | xset |
| `deletes(iterable)` | Delete each element of `iterable` from the xset. | xset |
| `filter(f, returnArray)` | Each element is passed to the function `f`; if it returns a truthy value, the element is included in the result. If `returnArray` is truthy, `filter` returns a new array, otherwise returns a new xset. | xset or<br>array |
| `find(f)` | Each element is passed to the function `f`; the first time `f` returns a truthy value, the corresponding element is returned. `find` returns `undefined` if no element produces a truthy value. | any |
| `every(f)` | Each element is passed to the function `f`; if `f` returns a truthy value every time, `every` returns `true` &mdash; and returns `false` otherwise. | boolean |
| `some(f)` | Each element is passed to the function `f`; the first time `f` returns a truthy value, `some` returns `true`. If `f` returns a falsy value every time, `some` returns `false`. | boolean |
| `first()` | First element of the set, or `undefined` if the set is empty. | any |
| `difference(iterable1, iterable2, ...)` | Returns a new xset containing every element in the calling xset that is not in any of the passed iterables. | xset |
| `intersection(iterable1, iterable2, ...)` | Returns a new xset containing every element that appears in the calling xset <i>and all</i> of the passed iterables. The order of elements in the returned xset matches their order in the calling xset. | xset |
| `union(iterable1, iterable2, ...)` | Returns a new xset containing every element that appears in the calling xset or any of the passed iterables. The order of elements in the returned xset is based on their first occurrence in the calling xset and iterables. | xset |

## `Vector`

2D vector class.

__Constructor:__ `new Vector(x = 0, y = 0)`.

### Methods <small>&ndash; static</small>

| Method | Description | Return |
|:---|:---|:---|
| `fromObject(obj)` | Vector from an object with `x` and `y` properties. | vector |
| `fromArray(arr)` | Vector from an array: `[x, y]`. | vector |
| `fromPolar(magnitude, angle)` | Vector with given `magnitude` and `angle` (radians). | vector |
| `randomAngle(magnitude = 1)` | Vector with random angle and given magnitude.| vector |
| `randomPoint(xMin, xMax, yMin, yMax)` | Random 'point' (vector) within the given limits &mdash;inclusive lower limits; exclusive upper limits. | vector |

### Methods <small>&ndash; instance</small>

?> Where a method takes a vector argument, the 'vector' can actually be any object with `x` and `y` properties.

| Method | Description | Return |
|:---|:---|:---|
| `copy()` | Copy vector. | vector |
| `set(x, y)` | Set x and y values of calling vector. Mutates calling vector. | vector |
| `add(u)` | Addition: add `u` to calling vector. Scalar addition if `u` is a number; vector addition otherwise. Mutates calling vector. | vector |
| `sub(u)` | Subtraction: subtract `u` from calling vector. Scalar subtraction if `u` is a number; vector subtraction otherwise. Mutates calling vector. | vector |
| `mult(s)` | Scalar multiplication: multiply x and y values of calling vector by `s`. Mutates calling vector. | vector |
| `div(s)` | Scalar division: divide x and y values of calling vector by `s`. Mutates calling vector. | vector |
| `dot(v)` | Dot product of the calling vector and `v` | number |
| `mag()` | Magnitude of calling vector. | number |
| `setMag(magnitude)` | Set magnitude of calling vector. Mutates calling vector. | vector |
| `normalize()` | Set magnitude of calling vector to 1. Mutates calling vector. | vector |
| `limit(maxMagnitude)` | If magnitude of calling vector is greater than `maxMagnitude`, set it to `maxMagnitude`. Mutates calling vector. | vector |
| `distance(v)` | Euclidean distance between the calling vector and `v` | number |
| `heading()` | Heading of calling vector, i.e. angle in radians. `0` for the zero vector. | number |
| `setHeading(angle)` | Set heading of calling vector to `angle` (radians). Mutates calling vector. | vector |
| `turn(angle)` | Turn calling vector by `angle` (radians). Mutates calling vector. | vector |
| `direction()` | Direction the calling vector's heading is closest to: `'right'`, `'down'`, `'left'` or `'up'`.  `right` for the zero vector.| string |
| `directionIndex()` | As `direction`, but returns `0`, `1`, `2` or `3`.  `0` for the zero vector. | number |
| `getUnit()` | Unit vector with same heading as calling vector. | vector |
| `getUnitNormal()` | Unit normal vector to calling vector. | vector |
| `lerp(v, s)` | Linear interpolate between calling vector and `v`. If `s` is `0`, the returned vector is the same as the calling vector; if `s` is `1`, the returned vector is the same as `v`. | vector |
| `isZero()` | `true` if the the calling vector is the zero vector. | boolean |
| `vecProject(v)` | Vector projection of calling vector on `v`. | vector |
| `scaProject(v)` | Scalar projection of calling vector on `v`. | number |
| `vecRejec(v)` | Vector rejection of calling vector on `v`. | vector |
| `scaRejec(v)` | Scalar rejection of calling vector on `v`. | number |

## `Polyline`

2D polyline class.

__Constructor:__ `new Polyline(points)`, where `points` is an array, and each element of `points` is either an array (`[x, y]`) or an object with `x` and `y` properties.

Polylines are often used with [forces](#forces), which typically involves finding the nearest point on a polyline to an actor. Rather than using the `pointNearest` polyline method for this (which is slow), register the polyline(s) with the simulation using [`sim.registerPolylines`](#methods-ndash-basic), then use the returned function to look up the nearest point.

The polyline constructor and methods that create new polylines are not particularly fast, nor is registering polylines. Where possible, create and register polylines before the simulation or during a pause in the simulation. The functions most commonly used during the simulation are the `pointAt` polyline method and functions returned by `sim.registerPolylines`; these are reasonably fast.

?> Note: pass multiple polylines to `sim.registerPolylines` to get a function that finds the nearest point on any of the polylines. Use separate calls to `sim.registerPolylines` to get a separate function for each polyline.

### Properties <small>&ndash; read only</small>

| Property | Type | Description |
|:---|:---|:---|
| `xMin` | number | min x value. |  
| `xMax` | number | max x value. |
| `yMin` | number | min y value. | 
| `yMax` | number | max y value. | 
| `x` | number | x value of the centroid of the polyline's bounding box. | 
| `y` | number | y value of the centroid of the polyline's bounding box. | 
| `pts` | array | Points of the polyline &mdash;an array of [vectors](#vector). |
| `segs` | array | Segments of the polyline &mdash; an array of [vectors](#vector). Segment <i>i</i> is <i><b>p</b><sub>i+1</sub> - <b>p</b><sub>i</sub></i>.|
| `segLengths` | array | Length of each segment. |
| `segLengthsCumu` | array | Cumulative segment lengths. The first element of the array is `0` so `segLengthsCumu` has one more element than `segLengths`. |
| `lineLength` | number | Length of the polyline; equal to the last entry of `segLengthsCumu`. |

### Methods <small>&ndash; instance</small>

| Method | Description | Return |
|:---|:---|:---|
| `simplify(tolerance = 1,`<br>&emsp;` highQuality)` | Simplify polyline &mdash; returns a new polyline with fewer points. Increase `tolerance` for greater simplification. If `higherQuality` is `true`, the simplification is of higher quality, but takes longer to compute. See [simplify-js](http://mourner.github.io/simplify-js/) for more details. | polyline |
| `transform(options)` | Transform polyline &mdash; returns a new polyline. The polyline is scaled and rotated about its first point, then translated. `options` is an object; valid properties and their defaults are:<ul style="margin:0"><li><code>scale = 1</code></li><li><code>rotate = 0</code> (radians)</li><li><code>translate = [0, 0]</code></li></ul> | polyline |
| `pointAt(t, wrap)` | Point on polyline at curve parameter `t` (which runs from 0 to the length of the polyline). If `wrap` is `true`, a `t` value of less than 0 or greater than the polyline's length is 'wrapped' &mdash; this option is typically used when the first and last points of the polyline are the same or very close together. If `wrap` is `false`, `pointAt` returns the start of the polyline when `t` is negative, and the end of the polyline when `t` is greater than the polyline's length. | [vector](#vector) |
| `pointAtFrac(t, wrap)` | As `pointAt`, but for a parameter that runs from 0 to 1. | [vector](#vector) |
| `walk(n)` | A new polyline of `n` points formed from equally spaced intervals along the calling polyline. The new polyline has the same start and end points as the calling polyline. | polyline |
| `pointNearest(p, segIndices)` | Returns information about the nearest point on the polyline to point `p` &mdash; an object with `x` and `y` properties. To only look for the nearest point on a subset of segments, pass an array of segment indices as `segIndices`. The returned object has properties:<ul style="margin:0"><li>`point`: vector, nearest point on polyline (or on specified segments).</li><li>`param`: number, value of curve parameter corresponding to nearest point.</li><li>`segIndex`: number, index of segment of nearest point.</li><li>`scaProjec`: number, scalar projection of `p` onto segment of nearest point.</li><li>`dist`: number, distance from `p` to nearest point.</li></ul> | object |

## Helpers

Atomic Agents exports the following helper functions:

| Function | Description | Return |
|:---|:---|:---|
| `shuffle(arr)` | Shuffle array in place. | array |
| `loop(n, f)` | Loop `n` times; pass function `f` the loop index each step. | `undefined`|
| `frame(period, steps, time)`| Value at time `time` of a repeating sequence with period `period` and steps 0, 1, ..., steps - 1. For example, `frame(18, 6, i)` will return `0`, `1` or `2`; it will return `0` if `i` is in the interval [0, 5] or [18, 23] or [36, 41] and so on. If `time` is negative, it is rounded up to zero. `period` should be divisible by `steps`.<br><br>__Also see:__ [`sim.frame`](#methods-ndash-basic). | number |
| `gridInRect(rect, options = {})` | Grid points in rectangle &mdash; `rect` can be any object with properties `xMin`, `xMax`, `yMin`, `yMax` (squares, zones and simulation objects satisfy this requirement). The properties of `options` and their defaults are:<ul style="margin:0"><li>`n`: min number of points to generate &mdash; see `crop` option.</li><li>`pairs = true`: `true` to return an array of points ([vectors](#vector)); `false` to return an array where the first element is an array of x values and the second is an array of y values.</li><li>`padding = 0`: distance between rectangle boundary and closest grid point.</li><li>`descX`:  `true` for descending x values; ascending by default.</li><li> `descY`:  `true` for descending y values; ascending by default.</li></ul>The following options are ignored if `pairs` is `false`:<ul style="margin:0"></li><li>`columnsFirst`: `true` to fill columns first; rows first by default.</li><li>`crop = true`: `false` to return all grid points (so possibly more than `n`); `true` to return only `n` points.</li></ul><br>__Also see:__ [`sim.fitGrid`](#methods-ndash-basic), [`sim.populate`](#methods-ndash-basic), [`agent.fitGrid`](#methods-ndash-basic-1), [`agent.populate`](#methods-ndash-basic-1). | array |
| `gridInHex(hex, options = {})` | Grid points ([vectors](#vector)) in hexagon &mdash; `hex` can be any object with properties `x`, `y`, `radius` (actors satisfy this requirement). The properties of `options` and their defaults are:<ul style="margin:0"><li>`n`: min number of points to generate &mdash; see `crop` option.<li>`padding = 0`: distance between hexagon boundary and closest grid point.</li><li>`clockwise = true`: `true` for clockwise points in each hexagonal layer, `false` for counterclockwise.</li><li>`start = 'top'`: `'top'`, `'right'`, `'bottom'` or `'left'`; position of first point in each hexagonal layer.</li><li>`crop = true`: `false` to return all grid points (so possibly more than `n`); `true` to return only `n` points.</li></ul><br>__Also see:__ [`sim.fitGrid`](#methods-ndash-basic), [`sim.populate`](#methods-ndash-basic), [`agent.fitGrid`](#methods-ndash-basic-1), [`agent.populate`](#methods-ndash-basic-1). | array |
| `partitionRect(`<br>&emsp;`indexLimits, options = {})` | Recursively partition a rectangle (at integer indices) into smaller rectangles. `indexLimits` describes the rectangle: an iterable with elements `xMinIndex`, `xMaxIndex`, `yMinIndex`, `yMaxIndex`, or an object with these properties (such as a simulation object or zone). Each returned rectangle is an array of index limits. The properties of `options` and their defaults are:<ul style="margin:0"><li>`n = 2`: number of rectangles in partition.</li><li>`minWidth = 1`:  min width of rectangles in the partition.</li><li> `minHeight = 1`: min height of rectangles in the partition.</li><li> `gap = 0`: space between rectangles in the partition.</li><li> `padding = 0`: space between boundary of original rectangle and rectangles in the partition.</li><li> `randomSplit = true`: choose next rectangle to split: `false` &mdash; split largest rectangle with a valid split; `true` &mdash; random choice with probability proportional to area.</li><li>`dim = 'xy'`: split on either dimension (`'xy'`) or only `'x'` or only `'y'`.</li><li> `randomDim = true` (only used when `dim` is `'xy'`): `false` &mdash; split rectangle on longest side (if can); `true` &mdash; random choice with probability proportional to side length.</li><li>`randomSite = true`: where to split the side: `false` &mdash; half way (rounded up); `true` &mdash; random.</li></ul><br>__Note:__ `partitionRect` can create a single rectangle the size of the outer rectangle using `{n: 1}`, or with padding e.g. `{n: 1, padding: 2}`.<br><br>__Note:__ if `randomSplit`, `randomDim` and `randomSite` are `false`, `partitionRect` can partition a rectangle into a 1D or 2D grid &mdash; or a regular 'city block' layout if `gap` > 0. Furthermore, the partition rectangles will be in a predictable order since the first largest rectangle in the partition is split when there are ties, and x-splits take priority when splitting squares.<br><br>__Also see:__ [`sim.partition`](#methods-ndash-basic), [`zone.partition`](#methods-ndash-basic-4). | array |

## `random`

`random` provides methods for generating random numbers from a variety of distributions. Most `random` methods return a function, which returns a random number. For example:

```js
// sample a number from a normal distribution: mean 2, std dev 3
random.normal(2, 3)();  

// reuse a generating function
const normal = random.normal(2, 3);
normal();
normal();
```

The methods which use the above pattern are:

`uniform`, `int`, `normal`, `logNormal`, `bates`, `irwinHall`, `exponential`, `pareto`, `bernoulli`, `geometric`, `binomial`, `gamma`, `beta`, `weibull`, `cauchy`, `logistic`, `poisson`.

For details of these methods, see [`d3-random`](https://github.com/d3/d3-random). `random` methods are identical to their D3 counterparts, except that `random` methods automatically use the current seed (see below).

The other `random` methods are:

* `uniform_01()`: generate a number from a uniform distribution over `0` (inclusive) to `1` (exclusive). Unlike the above methods, `uniform_01` generates a number directly, i.e. it returns a number, not a function. Use `random.uniform_01()` instead of `Math.random()`.

* `seed(s)`: if `s` is omitted (or is `undefined` or `null`), `Math.random` is used as the source of all random numbers. Alternatively, pass a seed `s` (a real number in the interval [0,1)) to use a linear congruential generator with the given seed &mdash; see [`d3.randomLcg`](https://github.com/d3/d3-random#randomLcg).

!> Many Atomic Agents methods use `random` internally. When using a seed, set it before any other simulation code runs to avoid confusion.