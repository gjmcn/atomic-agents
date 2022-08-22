#### 0.1.11 &mdash; August 22, 2022

* Add to `Simulation`: `nx`, `ny`, `randomSquare`, `randomXIndex`, `randomYIndex` and `autotile`.

* Add to `Square`: `width`, `height`, `randomX` and `randomY`.

* Add to `Zone`: `nx`, `ny`, `width`, `height`, `randomX`, `randomY`, `randomSquare`, `randomXIndex`, `randomYIndex` and `autotile`.

* Add to `Actor`: `autotile`.

* Add to `random`: `categorical`.

* Add helpers: `randomElement` and `autotile`.

#### 0.1.10 &mdash; July 24, 2022

* Add `isClosed` and `copy` to `Polyline`.

#### 0.1.9 &mdash; July 6, 2022

* Add `routes` method.

#### 0.1.8 &mdash; June 12, 2022

* Add `direction` property to `Square` and `Zone`.

* Add `z` property to `Agent`.

#### 0.1.7 &mdash; June 5, 2022

* Add polylines.

* Add `square.checker`.

#### 0.1.6 &mdash; May 22, 2022

* Add vis methods.

* Additional update properties: `updateActorStates`, `updateSquareStates` and `updateZoneStates`.

* All update properties `true` by default.

#### 0.1.5 &mdash; May 10, 2022

* Fix bounce bug [#6](https://github.com/gjmcn/atomic-agents/issues/6).

#### 0.1.4 &mdash; May 2, 2022

* Add `zIndex` property to agents.

#### 0.1.3 &mdash; April 25, 2022

* Fix `insideDistance` bug [#4](https://github.com/gjmcn/atomic-agents/issues/4).

* Add `insideDistance` method to `Actor`.

#### 0.1.2 &mdash; April 23, 2022

* Vector `add` and `sub` methods: argument can be a number or an object.

#### 0.1.1 &mdash; April 21, 2022

* Allow passing `updateMass`, `updateRadius` and `updatePointing` as options to the `Actor` constructor.

* Remove `null` defaults for user-defined methods since blocks prototype chain.

#### 0.1.0 &mdash; April 19, 2022

* Initial Release.