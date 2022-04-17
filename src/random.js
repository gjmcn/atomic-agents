import * as d3 from 'd3-random';

export const random = {};

random.seed = function(s) {
  const source = s === null || s === undefined
    ? Math.random
    : d3.randomLcg(s);
  for (let d of [
      'uniform', 'int', 'normal', 'logNormal', 'bates', 'irwinHall',
      'exponential', 'pareto', 'bernoulli', 'geometric', 'binomial', 'gamma', 
      'beta', 'weibull', 'cauchy', 'logistic', 'poisson'
    ]) {
    const d3Name = `random${d[0].toUpperCase()}${d.slice(1)}`;
    random[d] = d3[d3Name].source(source);
  }
  random.uniform_01 = source;
};

random.seed();