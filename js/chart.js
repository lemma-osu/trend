(function($) {
  // Attach a new object to the window
  var tooltip = window.tooltip = {};

  // Create a show member function for tooltip
  tooltip.show = function(pos, content, gravity, dist) {

    // Create a new div container
    var container = $('<div class="tooltip">');

    // Set the gravity and dist if not already set
    gravity = gravity || 's';
    dist = dist || 20;

    // Set the content for the container, position it offscreen, make it
    // transparent and append to the main body element
    container
      .html(content)
      .css({left: -1000, top: -1000, opacity: 0})
      .appendTo('body');

    // Get the height and width of the container
    var height = container.height() + parseInt(container.css('padding-top')) +
      parseInt(container.css('padding-bottom'));
    var width = container.width() + parseInt(container.css('padding-left')) +
      parseInt(container.css('padding-right'));

    // Get the height and width of the browser window
    var windowHeight = $(window).height();
    var windowWidth = $(window).width();

    // Get the current vertical position of the scroll bar
    var scrollTop = $('body').scrollTop();

    // Variables for top and left
    var top, left;

    // Based on the gravity setting, determine the position of the container 
    // on the page
    switch(gravity) {
      // East, west, and north are all treated the same
      case 'e':
      case 'w':
      case 'n':
        // Container is placed such that it is centered on pos[0] and top is
        // dist pixels below pos[1]
        left = pos[0] - (width / 2);
        top = pos[1] + dist;

        // Check for border conditions
        if (left < 0)
          left = 5;
        if (left + width > windowWidth)
          left = windowWidth - width - 5;
        if (scrollTop + windowHeight < top + height)
          top = pos[1] - height - dist; 
        break;

      // South positioning
      case 's':
        // Container is placed such that it is centered on pos[0] and bottom
        // is dist pixels above pos[1]
        left = pos[0] - (width / 2);
        top = pos[1] - height - dist;

        // Check for border conditions
        if (left < 0)
          left = 5;
        if (left + width > windowWidth)
          left = windowWidth - width - 5;
        if (scrollTop > top)
          top = pos[1] + dist;
        break;
    }

    // Set the final position of the container and show it
    container
      .css({
        left: left,
        top: top,
        opacity: 1.0
      });
  };

  // Create a cleanup member function for tooltip
  tooltip.cleanup = function() {
    // Find all elements with a class of tooltip
    var tooltips = $('.tooltip');

    // Remove right away, but delay the call with setTimeout
    tooltips.css({
      'transition-delay': '0 !important',
      '-moz-transition-delay': '0 !important',
      '-webkit-transition-delay': '0 !important'
    });
    tooltips.css('opacity', 0.0);

    setTimeout(function() {
      tooltips.remove();
    }, 500);
  };

})(jQuery);

var models = {};

// Legend elements
models.legendContainer = function() {
  // Set up the positioning and color of the legend.  Dispatch is a d3 way to
  // loosely couple separate components with a single event
  var margin = {top: 0, right: 0, bottom: 5, left: 10},
    width = 800,
    height = 20,
    color = d3.scale.category20().range(),
    dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout');

  // Constructor for this chanrt
  function chart(selection) {
    selection.each(function(data) {
      // Legend curently is setup to automaticaly expand vertically based
      // on a max width. Should implement legend where EITHER a maxWidth or
      // a maxHeight is defined, then the other dimension will automatically
      // expand to fit, and anything that exceeds that will automatically
      // be clipped.

      // Structure of legend is g.legendWrap -> g.legend -> g -> g.series

      // Set the data element of the g.legend container
      var wrap = d3.select(this).selectAll('g.legend').data([data]);
      var gEnter = wrap.enter().append('g')
        .attr('class', 'legend')
        .append('g');

      // Transform all g containers
      var g = wrap.select('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Set the individual series
      var series = g.selectAll('.series')
        .data(function(d) { return d; });

      // Update existing series
      series.select('circle')
        .style('fill', function(d, i) { return d.color || color[i % 20]; })
        .style('stroke', function(d, i) { return d.color || color[i % 20]; });
      series.select('text')
        .text(function(d) { return d.label; });

      // On enter, set the events to the dispatch events
      var seriesEnter = series.enter().append('g')
        .attr('class', 'series')
        .on('click', function(d, i) { dispatch.legendClick(d, i); })
        .on('mouseover', function(d, i) { dispatch.legendMouseover(d, i); })
        .on('mouseout', function(d, i) { dispatch.legendMouseout(d, i); });

      // Add the actual legend elements (circle and text)
      seriesEnter.append('circle')
        .style('fill', function(d, i) { return d.color || color[i % 20]; })
        .style('stroke', function(d, i) { return d.color || color[i % 20]; })
        .attr('r', 5);
      seriesEnter.append('text')
        .text(function(d) { return d.label; })
        .attr('text-anchor', 'start')
        .attr('dy', '.32em')
        .attr('dx', '10');

      // Set the disabled class state
      series.classed('disabled', function(d) { return d.disabled; });

      // Exit event
      series.exit().remove();

      // Run through the labels one time to calculate the max spacing needed
      // for all labels.  This will organize the labels into columns
      var maxLength = 0;
      series.each(function(d, i) {
        var node = d3.select(this).select('text').node();
        var length = node.getComputedTextLength() + 45; 
        maxLength = length > maxLength ? length : maxLength;
      });

      // Set the location of the legend series element, accounting for 
      // cases when there is not enough room for all series to fit on a 
      // single line
      var ypos = 0, newxpos = 0, maxWidth = 0, xpos;
      series
        .attr('transform', function(d, i) {
          xpos = newxpos;
          if (width < margin.left + margin.right + xpos + maxLength) {
            newxpos = xpos = 0;
            ypos += 25;
          }
          newxpos += maxLength;
          if (newxpos > maxWidth)
            maxWidth = newxpos;
          return 'translate (' + xpos + ',' + ypos + ')';
        });

      // Adjust the height
      height += margin.top + ypos;
    });
    return chart;
  };

  chart.dispatch = dispatch;

  // Getter/setters for various elements of this chart
  chart.margin = function(_) {
    if (!arguments.length)
      return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length)
      return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length)
      return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length)
      return color;
    color = _;
    return chart;
  };

  return chart;
};

models.lineContainer = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = 960,
    height = 500,
    dotRadius = function() { return 2.5 },
    color = d3.scale.category20().range(),
    id = Math.floor(Math.random() * 10000),
    x = d3.scale.linear(),
    y = d3.scale.linear(),
    dispatch = d3.dispatch('pointMouseover', 'pointMouseout'),
    x0,
    y0;

  function chart(selection) {
    // Selection is one array with all series arrays within it
    selection.each(function(data) {
      var seriesData = data.map(function(d) { return d.data; });

      x0 = x0 || x;
      y0 = y0 || y;

      // Add the series as an attribute to each point
      data = data.map(function(series, i) {
        series.data = series.data.map(function(point) {
          point.series = i;
          return point;
        });
        return series;
      });

      // Set the domain and range of the x-axis
      x.domain(d3.extent(d3.merge(seriesData), function(d) { return d[0]; }))
        .range([0, width - margin.left - margin.right]);

      // Set the range for the y-axis, but don't set the domain as this can
      // change based on zooming 
      y.range([height - margin.top - margin.bottom, 0]);

      // Create a 2D array with x, y coordinates and line and point
      // indexes
      var vertices = d3.merge(data.map(function(line, lineIndex) {
        return line.data.map(function(point, pointIndex) {
          return [x(point[0]), y(point[1]), lineIndex, pointIndex];
        });
      }));

      // Set up the containers to hold the different series
      var wrap = d3.select(this).selectAll('g.d3line').data([data]);
      var gEnter = wrap.enter().append('g')
        .attr('class', 'd3line')
        .append('g');
      gEnter.append('g').attr('class', 'lines');
      gEnter.append('g').attr('class', 'point-clips');
      gEnter.append('g').attr('class', 'point-paths');

      // Translate the container
      var g = wrap.select('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      // Create a border for the series data
      gEnter.append('rect')
        .attr('id', 'chart-border')

      // Create a clip-path for the series data
      gEnter.append('clipPath')
          .attr('id', 'clip-border')
        .append('rect');

      var voronoiClip =  gEnter.append('g')
        .attr('class', 'voronoi-clip')
        .append('clipPath')
          .attr('id', 'voronoi-clip-path-' + id)
        .append('rect');

      wrap.select('#chart-border')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width - margin.left - margin.right)
        .attr('height', height - margin.top - margin.bottom);

      wrap.select('#clip-border rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width - margin.left - margin.right)
        .attr('height', height - margin.top - margin.bottom);
      
      wrap.select('.voronoi-clip rect')
        .attr('x', -10)
        .attr('y', -10)
        .attr('width', width - margin.left - margin.right + 20)
        .attr('height', height - margin.top - margin.bottom + 20);
      
      wrap.select('.point-paths')
        .attr('clip-path', 'url(#voronoi-clip-path-' + id + ')');

      // Set clipping paths for the data points
      var pointClips = wrap.select('.point-clips').selectAll('.clip-path')
        .data(vertices);
      pointClips.enter().append('clipPath')
        .attr('class', 'clip-path')
        .append('circle')
          .attr('r', 10);
      pointClips.exit().remove();
      pointClips
        .attr('id', function(d) {
          return 'clip-' + id + '-' + d[2] + '-' + d[3];
        })
        .attr('transform', function(d) {
          return 'translate(' + d[0] + ',' + d[1] + ')';
        });

      var voronoi = d3.geom.voronoi(vertices).map(function(d, i) {
        return {
          'data': d,
          'series': vertices[i][2],
          'point': vertices[i][3]
        }
      });

      var pointPaths = wrap.select('.point-paths').selectAll('path')
        .data(voronoi);
      pointPaths.enter().append('path')
        .attr('class', function(d,i) { return 'path-' + i; });
      pointPaths.exit().remove();
      pointPaths
        .attr('clip-path', function(d) {
          return 'url(#clip-' + id + '-' + d.series + '-' + d.point + ')';
        })
        .attr('d', function(d) { return 'M' + d.data.join(',') + 'Z'; })
        .on('mouseover', function(d) {
          dispatch.pointMouseover({
            point: data[d.series].data[d.point],
            series: data[d.series],
            pos: [
              x(data[d.series].data[d.point][0]) + margin.left,
              y(data[d.series].data[d.point][1]) + margin.top
            ],
            pointIndex: d.point,
            seriesIndex: d.series
          });
        })
        .on('mouseout', function(d) {
          dispatch.pointMouseout({
            point: d,
            series: data[d.series],
            pointIndex: d.point,
            seriesIndex: d.series
          });
        });

      dispatch.on('pointMouseover.point', function(d) { 
        wrap.select('.line-' + d.seriesIndex + ' .point-' + d.pointIndex)
          .classed('hover', true);
      });

      dispatch.on('pointMouseout.point', function(d) { 
        wrap.select('.line-' + d.seriesIndex + ' .point-' + d.pointIndex)
          .classed('hover', false);
      });

      // Bring in the line containers
      var lines = wrap.select('.lines').selectAll('.line')
        .data(function(d) { return d }, function(d) { return d.label });
      lines.enter().append('g')
        .attr('clip-path', 'url(#clip-border)')
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6);
      lines.exit().transition()
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6)
        .remove();
      lines.attr('class', function(d,i) { return 'line line-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i) { return d.color || color[i % 20] })
        .style('stroke', function(d,i) { return d.color || color[i % 20] })
      lines.transition()
        .style('stroke-opacity', 1)
        .style('fill-opacity', .5);

      // Insert the paths into the line containers
      var paths = lines.selectAll('path')
        .data(function(d) { return [d.data] });
      paths.enter().append('path')
        .attr('d', d3.svg.line()
          .x(function(d) { return x0(d[0]) })
          .y(function(d) { return y0(d[1]) })
        );
      paths.exit().remove();
      paths.transition()
        .attr('d', d3.svg.line()
          .x(function(d) { return x(d[0]) })
          .y(function(d) { return y(d[1]) })
        );

      // Add points to the line containers
      var points = lines.selectAll('circle.point')
        .data(function(d) { return d.data });
      points.enter().append('circle')
        .attr('cx', function(d) { return x0(d[0]) })
        .attr('cy', function(d) { return y0(d[1]) });
      points.exit().remove();
      points.attr('class', function(d,i) { return 'point point-' + i });
      points.transition()
        .attr('cx', function(d) { return x(d[0]) })
        .attr('cy', function(d) { return y(d[1]) })
        .attr('r', dotRadius());
    });
    x0 = x;
    y0 = y;
    return chart;
  };

  chart.dispatch = dispatch;

  // Getter/setters for various elements of this chart
  chart.margin = function(_) {
    if (!arguments.length)
      return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length)
      return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length)
      return height;
    height = _;
    return chart;
  };

  chart.x = function(_) {
    if (!arguments.length)
      return x;
    x = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length)
      return y;
    y = _;
    return chart;
  };

  chart.dotRadius = function(_) {
    if (!arguments.length)
      return dotRadius; 
    dotRadius = d3.functor(_);
    return chart;
  }

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  return chart;
};

models.compositeContainer = function() {
  var margin = {top: 0, right: 20, bottom: 50, left: 40},
    width = 960,
    height = 500,
    dotRadius = function() { return 2.5 },
    yDomain = 'init',
    xAxisLabelText = false,
    yAxisLabelText = false,
    color = d3.scale.category20().range();
    dispatch = d3.dispatch('showTooltip', 'hideTooltip', 'zoomView');

  var x = d3.scale.linear(),
    y = d3.scale.linear(),
    xAxis = d3.svg.axis().scale(x).orient('bottom').tickFormat(d3.format('d')),
    yAxis = d3.svg.axis().scale(y).orient('left');
    legend = models.legendContainer().color(color),
    lines = models.lineContainer();

  // This gets called with the single svg element, so the data size of
  // selection is only 1 at this point, even though it contains the data for
  // all arrays
  function chart(selection) {
    selection.each(function(data) {
      yAxisLabelText = config.selected.variable.alias + ' (' + 
        config.selected.variable.units + ')';

      var series = data
        .filter(function(d) { return !d.disabled; })
        .map(function(d) { return d.data; });

      // wrap points to svg -> g.wrap 
      var wrap = d3.select(this).selectAll('g.wrap').data([data]);

      // gEnter points to svg -> g.wrap.d3lineWithLegend -> g
      var gEnter = wrap.enter().append('g')
        .attr('class', 'wrap d3lineWithLegend').append('g');

      // Event code
      legend.dispatch.on('legendClick', function(d, i) { 
        d.disabled = !d.disabled;
        if (!data.filter(function(d) { return !d.disabled }).length) {
          data.forEach(function(d) {
            d.disabled = false;
          });
        }
        // Reset the zoom
        yDomain = 'init';
        selection.call(chart);
      });

      legend.dispatch.on('legendMouseover', function(d, i) {
        d.hover = true;
        selection.call(chart);
      });

      legend.dispatch.on('legendMouseout', function(d, i) {
        d.hover = false;
        selection.call(chart);
      });

      lines.dispatch.on('pointMouseover.tooltip', function(e) {
        dispatch.showTooltip({
          point: e.point,
          series: e.series,
          pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
          seriesIndex: e.seriesIndex,
          pointIndex: e.pointIndex
        });
      });

      lines.dispatch.on('pointMouseout.tooltip', function(e) {
        dispatch.hideTooltip(e);
      });

      dispatch.on('zoomView', function(e) {
        g.select('.x.axis').call(xAxis);
        g.select('.y.axis').call(yAxis);
        selection.call(chart);
      });

      dispatch.on('showTooltip', function(e) {
        var offset = $('#chart').offset(),
          left = e.pos[0] + offset.left,
          top = e.pos[1] + offset.top,
          formatter = d3.format(".04f");

        var content =
          '<p>' 
            + e.series.label + ', ' 
            + e.point[0] + ', '
            + formatter(e.point[1])
            + '</p>';
        tooltip.show([left, top], content);
      });

      dispatch.on('hideTooltip', function(e) {
        tooltip.cleanup();
      });

      // Set the x range and extent from all data
      x.domain(d3.extent(d3.merge(series), function(d) { return d[0]; }))
        .range([0, width - margin.left - margin.right]);

      // If the y domain has not already been set, set it from the y-range
      // of all data.  After that, we respond to zoom events 
      y.range([height - margin.top - margin.bottom, 0]);
      if (yDomain == 'init') {
        yDomain = 'set';
        var extent = d3.extent(d3.merge(series), function(d) { return d[1]; }) 
        var m = (extent[1] - extent[0]) / 90.0;
        var dMin = extent[1] - m * 95.0;
        var dMax = m * 100.0 + extent[0]
        y.domain([dMin, dMax]);
      }

      // Add containers for axes, legend and lines
      gEnter.append('rect').attr('class', 'pane');
      gEnter.append('g').attr('class', 'legendWrap');
      gEnter.append('g').attr('class', 'x axis');
      gEnter.append('g').attr('class', 'y axis');
      gEnter.append('g').attr('class', 'linesWrap');

      // Set attributes for legend container - this needs to be done first
      // as there could be more than one row of legend items.  All other
      // sizes are set after the legend is set
      legend
        .width(width - margin.right)
        .height(30);

      // Fill the legend
      wrap.select('.legendWrap')
        .datum(data)
        .call(legend);

      // Figure out the size of the y axis labels and potentially adjust the
      // chart size to accomodate large numbers.

      // Set the format of the y ticks
      if (y.domain()[1] > 1000.0) {
        yAxis.tickFormat(d3.format('.2e'));
      } else {
        yAxis.tickFormat(d3.format('g'));
      }

      // Get the maximum size of the labels
      var yTexts = wrap.select('g').select('.y.axis')
        .call(yAxis)
        .selectAll('.tick text');

      var yLabelLength = d3.max(yTexts[0], function(d) {
        return d.getComputedTextLength();
      });

      // Adjust the left margin accordingly
      var left = margin.left + yLabelLength;

      // Reset the location and the height of this container based on
      // the placement of the legend.  The 7 pixels here is the difference
      // between the vertical center and the top of the first legend line, ie.
      // we need to increase the margin slightly so as to make sure the 
      // legend shows up within the svg container.  We want to maintain a
      // consistent height of the chart itself, so adjust the svg container
      // to accomodate large legends
      var current = height - margin.top;
      margin.top = legend.height() + 7;
      height = current + margin.top;
      d3.select(this).attr('height', height);
      var g = wrap.select('g')
        .attr('transform', 'translate(' + left + ',' + margin.top + ')');
      wrap.select('.legendWrap')
        .attr('transform', 'translate(0,' + (-legend.height()) + ')')

      // Set the zoom behavior
      var zoom = d3.behavior.zoom()
        .y(y)
        .on('zoom', dispatch.zoomView);
   
      // Add a pane to capture zoom events
      wrap.select('.pane')
        .attr('width', width - left - margin.right)
        .attr('height', height - margin.top - margin.bottom)
        .call(zoom);

      // Sets the width, height, colors of the lines chart element
      lines
        .width(width - left - margin.right)
        .height(height - margin.top - margin.bottom)
        .x(x)
        .y(y)
        .color(
          data
            // map color by index if not present
            .map(function(d, i) { return d.color || color[i % 20]; })
            // filter out disabled data
            .filter(function(d, i) { return !data[i].disabled })
        );

      // Sets the number of axis ticks and their size
      xAxis
        .ticks(width / 100)
        .tickSize(-(height - margin.top - margin.bottom), 0);
      yAxis
        .ticks(height / 36)
        .tickSize(-(width - left - margin.right), 0);

      // Join data for the lines container
      var linesWrap = wrap.select('.linesWrap')
        .datum(data.filter(function(d) { return !d.disabled; }));
      linesWrap.call(lines);

      // Set the x axis label and provide enter and exit methods
      var xAxisLabel = g.select('.x.axis').selectAll('text.axislabel')
        .data([xAxisLabelText || null]);
      xAxisLabel.enter().append('text')
        .attr('class', 'axislabel')
        .attr('text-anchor', 'middle');
      xAxisLabel.exit().remove();
      xAxisLabel
        .attr('x', x.range()[1] / 2)
        .attr('y', margin.bottom - 15)
        .text(function(d) { return d; });

      // Set the x axis ticks 
      g.select('.x.axis')
        .attr('transform', 'translate(0,' + y.range()[0] + ')')
        .call(xAxis)
        .selectAll('line.tick')
        .filter(function(d) { return !d; })
        .classed('zero', true);

      // Set the y axis label and provide enter and exit methods
      var yAxisLabel = g.select('.y.axis').selectAll('text.axislabel')
        .data([yAxisLabelText || null]);
      yAxisLabel.enter().append('text')
        .attr('class', 'axislabel')
        .attr('transform', 'rotate(-90)')
        .attr('text-anchor', 'middle');
      yAxisLabel.exit().remove();
      yAxisLabel
        .attr('x', -y.range()[0] / 2)
        .attr('y', -yLabelLength - 20)
        .text(function(d) { return d; });

      // Set the x axis ticks 
      g.select('.y.axis')
        .call(yAxis)
        .selectAll('line.tick')
        .filter(function(d) { return !d; })
        .classed('zero', true);
    });
    return chart;
  };

  chart.dispatch = dispatch;

  // Setters/getters for the chart
  chart.margin = function(_) {
    if (!arguments.length)
      return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length)
      return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length)
      return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length)
      return color;
    color = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length)
      return yDomain;
    yDomain = _;
    return chart;
  };

  chart.dotRadius = function(_) {
    if (!arguments.length)
      return dotRadius;
    dotRadius = d3.functor(_);
    lines.dotRadius = d3.functor(_);
    return chart;
  };

  // Rebind copies the tickFormat method from xAxis to chart.xAxis
  chart.xAxis = {};
  d3.rebind(chart.xAxis, xAxis, 'tickFormat');

  chart.xAxis.label = function(_) {
    if (!arguments.length)
      return xAxisLabelText;
    xAxisLabelText = _;
    return chart;
  };

  chart.yAxis = {};
  d3.rebind(chart.yAxis, yAxis, 'tickFormat');

  chart.yAxis.label = function(_) {
    if (!arguments.length)
      return yAxisLabelText;
    yAxisLabelText = _;
    return chart;
  };

  return chart;
};

var updateChart = function(filteredData) {
  // Fill with new data
  var svg = d3.select('#chart svg')
    .datum(filteredData);

  // Reset the zoom
  compositeContainer.yDomain('init');

  // Redraw the chart
  svg.call(compositeContainer);
};

var resizeChart = function(filteredData) {
  // Get the new size of the window and redraw
  var width = parseInt(d3.select("#chart").style("width"), 10);
  compositeContainer.width(width);
  d3.select('#chart svg').attr('width', width);
  updateChart(filteredData);
};
