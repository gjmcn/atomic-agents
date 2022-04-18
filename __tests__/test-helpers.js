export function circle(x, y, radius) {
  return {
    _shape: 'circle',
    x,
    y,
    radius
  };
}

export function rect(xMin, xMax, yMin, yMax) {
  return {
    _shape: 'rect',
    xMin,
    xMax,
    yMin,
    yMax,
    x: (xMin + xMax) / 2,
    y: (yMin + yMax) / 2
  };
}