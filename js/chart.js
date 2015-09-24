var x, y, color, xAxis, yAxis, line, svg;
var width, height, margin;
var duration = 750;

var initChart = function() {
  margin = {top: 20, right: 150, bottom: 30, left: 90};
  width = parseInt(d3.select("#chart").style("width"), 10);
  width = width - margin.left - margin.right;
  height = 500 - margin.top - margin.bottom;

  // X and Y scale functions - domain set dynamically at a later point
  x = d3.scale.linear()
    .range([0, width]);

  y = d3.scale.linear()
    .range([height, 0]);

  // Categorical colors for the different series
  color = d3.scale.category20();

  // X and Y axes
  xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickFormat(d3.format("d"));

  yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

  // Series line function
  line = d3.svg.line()
    .x(function(d) { return x(d.year); })
    .y(function(d) { return y(d.value); });

  // Main SVG container
  svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.left + margin.right)
    .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
};

var prepareData = function(data) {
  // Get the unique series values
  var seriesVar = parameters.series;
  var series = _.uniq(_.map(data, function(d) { return d[seriesVar]; }));

  // Get the continuous variable to plot
  var contVar = parameters.variable;

  // Get the count variable
  var countVar = parameters.countVar;

  // Get the years to plot
  var yearVar = parameters.yearVariable;
  var minYear = parameters.years[0];
  var maxYear = parameters.years[1];

  // Colors
  color.domain(series);

  // Get the data for each series value.  This is a somewhat convoluted bit
  // of code, but it first maps a function over all unique series which
  // subsets the data down to just those records with that series value.
  // Then it finds the unique years for those records and sorts those to 
  // ensure that the series ordering is correct.  Finally, it returns an
  // object of the series value ('series') and an array of values that 
  // should be the same size as the unique number of years.  These values
  // are the area weighted average of continuous variable (contVar).  
  var seriesData = series.map(function(s) {
    // Filter for series
    var subset = _.filter(data, function(d) { return d[seriesVar] == s; });
    // Filter for years
    subset = _.filter(subset, function(d) { 
      return +d[yearVar] >= minYear && +d[yearVar] <= maxYear; 
    });
    var years = _.uniq(_.map(subset, function(d) { return +d[yearVar]; }));
    years = _.sortBy(years, function(y) { return +y; });
    
    if (contVar != countVar) {
      return {
        series: s,
        values: years.map(function(y) {
          var subsetYear = _.filter(subset, function(d) {
            return +d[yearVar] == y;
          });
          var w_s = _.reduce(subsetYear, function(memo, d) {
            return memo + (+d[countVar] * +d[contVar]);
          }, 0);
          var w = _.reduce(subsetYear, function(memo, d) {
            return memo + (+d[countVar]);
          }, 0);
          return {year: y, value: w_s / w};
        })
      };
    } else {
      return {
        series: s,
        values: years.map(function(y) {
          var subsetYear = _.filter(subset, function(d) {
            return +d[yearVar] == y;
          });
          var w = _.reduce(subsetYear, function(memo, d) {
            return memo + (+d[countVar]);
          }, 0);
          return {year: y, value: w};
        })
      };
    }
  });
  return seriesData;
};

var updateLine = function(l) {
  l.transition().duration(duration)
    .attr("class", "line")
    .attr("d", function(d) { return line(d.values); })
    .style("stroke", function(d) { return color(d.series); });
};

var updatePoint = function(p) {
  p.transition().duration(duration)
    .attr("class", "circle")
    .attr("cx", function(d) { return x(d.year); })
    .attr("cy", function(d) { return y(d.value); })
    .attr("r", 2);

  p.enter().append("circle")
      .attr("class", "circle")
      .attr("cx", function(d) { return x(d.year); })
      .attr("cy", function(d) { return y(d.value); })
      .attr("r", 2)
      .style("fill-opacity", 0.0)
    .transition().duration(duration)
      .style("fill-opacity", 1.0);

  p.exit().transition().duration(duration)
    .style("fill-opacity", 0.0)
    .remove();
};

var updatePointGroup = function(pg) {
  pg.attr("class", "points")
    .selectAll(".circle")
      .data(function(d) { return d.values; })
      .call(updatePoint);
};

var updateLabel = function(l) {
  l.attr("class", "label")
    .datum(function(d) {
      return {
        name: d.series,
        value: d.values[d.values.length - 1]
      };
    })
    .transition().duration(duration)
    .attr("transform", function(d) {
      return "translate(" + x(d.value.year) + "," + y(d.value.value) + ")";
    })
    .attr("x", 3)
    .attr("dy", ".35em")
    .text(function(d) { return d.name; });
};

var updateGroup = function(g) {
  g.attr("class", "line-group");
  g.select(".line").call(updateLine);
  g.select(".points").call(updatePointGroup);
  g.select(".label").call(updateLabel);
};

var enterLine = function(l) {
  l.attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      .style("stroke", function(d) { return color(d.series); })
      .style("stroke-opacity", 0.0)
    .transition().duration(duration)
      .style("stroke-opacity", 1.0);
};

var enterPoint = function(p) {
  p.enter().append("circle")
      .attr("class", "circle")
      .attr("cx", function(d) { return x(d.year); })
      .attr("cy", function(d) { return y(d.value); })
      .attr("r", 2)
      .style("fill-opacity", 0.0)
    .transition().duration(duration)
      .style("fill-opacity", 1.0);
};

var enterPointGroup = function(pg) {
  pg.attr("class", "points");
  pg.selectAll(".circle")
      .data(function(d) { return d.values; })
    .call(enterPoint);
};

var enterLabel = function(l) {
  l.attr("class", "label")
      .datum(function(d) {
        return {
          name: d.series,
          value: d.values[d.values.length - 1]
        };
      })
      .attr("transform", function(d) {
        return "translate(" + x(d.value.year) + "," + y(d.value.value) + ")";
      })
      .attr("x", 3)
      .attr("dy", ".35em")
      .text(function(d) { return d.name; })
      .style("fill-opacity", 0.0)
    .transition().duration(duration)
      .style("fill-opacity", 1.0);
};

var enterGroup = function(g) {
  g.attr("class", "line-group");
  g.select(".line").call(enterLine);
  g.select(".points").call(enterPointGroup);
  g.select(".label").call(enterLabel);
};

var exitLine = function(l) {
  l.transition().duration(duration)
    .style("stroke-opacity", 0.0)
    .remove();
};

var exitPoint = function(p) {
  p.transition().duration(duration)
    .style("fill-opacity", 0.0)
    .remove();
};

var exitPointGroup = function(pg) {
  pg.selectAll(".circle")
    .call(exitPoint);
};

var exitLabel = function(l) {
  l.transition().duration(duration)
    .style("fill-opacity", 0.0)
    .remove();
};

var exitGroup = function(g) {
  g.select(".line").call(exitLine);
  g.select(".points").call(exitPointGroup);
  g.select(".label").call(exitLabel);
};

var drawAxes = function() {
  // Graph the X and Y axes
  if (svg.selectAll(".x.axis")[0].length < 1) {
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
  } else {
    svg.select(".x.axis")
      .transition()
      .duration(duration)
      .call(xAxis);
  }
 
  if (svg.selectAll(".y.axis")[0].length < 1) {
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("class", "text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(parameters.variable);
  } else {
    svg.select(".y.axis")
      .transition()
      .duration(duration)
      .call(yAxis)
      .selectAll(".text")
        .text(parameters.variable);
  }
};

var drawChart = function(seriesData) {
  // Set the X and Y domains based on the values in seriesData
  x.domain([
    d3.min(seriesData, function(c) {
      return d3.min(c.values, function(v) { return v.year; });
    }),
    d3.max(seriesData, function(c) {
      return d3.max(c.values, function(v) { return v.year; });
    }) 
  ]);

  // Calculate the y domain such that the lowest value is at 5% and the 
  // highest value is at 95%
  var yMin = d3.min(seriesData, function(c) {
    return d3.min(c.values, function(v) { return v.value; });
  });
  var yMax = d3.max(seriesData, function(c) {
    return d3.max(c.values, function(v) { return v.value; });
  });
  var m = (yMax - yMin) / 90.0;
  var domainMin = yMax - m * 95.0;
  var domainMax = m * 100.0 + domainMin;
  y.domain([domainMin, domainMax]);

  // Draw the axes
  drawAxes();

  // Data join
  var lineGroup = svg.selectAll(".line-group")
    .data(seriesData);

  // Update existing elements 
  lineGroup.call(updateGroup);

  // Append new elements
  var g = lineGroup.enter().append("g")
    .attr("class", "line-group");
  g.append("path").attr("class", "line")
  g.append("text").attr("class", "label");
  g.append("g").attr("class", "points");
  g.call(enterGroup);

  // Remove elements
  lineGroup.exit().call(exitGroup).transition().duration(duration).remove();
};

var resizeChart = function(data) {
  width = parseInt(d3.select("#chart").style("width"), 10);
  width = width - margin.left - margin.right;
  d3.select("#chart svg").attr("width", width + margin.left + margin.right);
  x.range([0, width]);
  drawAxes();
  svg.selectAll(".line-group").call(updateGroup);
};

var updateChart = function(data) {
  var seriesData = prepareData(data);
  drawChart(seriesData);
};
