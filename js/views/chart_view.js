(function (window) {
    'use strict';

    function ChartView() {
        // this._margin = {top: 0, right: 20, bottom: 50, left: 40};
        // this._width = 960;
        // this._height = 500;
        // this._dotRadius = function () { return 2.5; };
        // this._yDomain = 'init';
        // this._xAxisLabelText = false;
        // this._yAxisLabelText = false;
        // this._color = d3.scale.category20().range();
        // this._dispatch = d3.dispatch('showTooltip', 'hideTooltip', 'zoomView');
        // this._x = d3.scale.linear();
        // this._y = d3.scale.linear();
        // this._xAxis = d3.svg.axis().scale(x).orient('bottom').tickFormat(d3.format('d'));
        // this._yAxis = d3.svg.axis().scale(y).orient('left');
    }

//     ChartView.prototype.render = function(viewCmd, parameter) {
//         var self = this;
//         var viewCommands = {
//             initializeChart: function() {
//                 parameter.each(function(data) {
//                     self.foo(parameter, data);
//                 });
//             }
//         };
//         viewCommands[viewCmd]();
//     };
// 
//     ChartView.prototype.foo = function(parameter, data) {
//         this._yAxisLabelText = parameter.variable.alias + ' (' +
//             parameter.variable.units + ')';
// 
//         var series = data
//             .filter(function(d) { return !d.disabled; })
//             .map(function(d) { return d.data; });
// 
//         // wrap points to svg -> g.wrap
//         var wrap = d3.select(this).selectAll('g.wrap').data([data]);
// 
//         // gEnter points to svg -> g.wrap.d3lineWithLegend -> g
//         var gEnter = wrap.enter().append('g')
//             .attr('class', 'wrap d3lineWithLegend').append('g');
// 
//         // Set the x range and extent from all data
//         this._x.domain(d3.extent(d3.merge(series), function(d) { return d[0]; }))
//             .range([0, width - this._margin.left - this._margin.right]);
// 
//         // If the y domain has not already been set, set it from the y-range
//         // of all data.  After that, we respond to zoom events
//         this._y.range([height - this._margin.top - this._margin.bottom, 0]);
//         if (this._yDomain == 'init') {
//             this._yDomain = 'set';
//             var extent = d3.extent(d3.merge(series), function(d) { return d[1]; });
//             var m = (extent[1] - extent[0]) / 90.0;
//             var dMin, dMax, PRECISION=0.00001;
//             if (Math.abs(m) > PRECISION) {
//                 dMin = extent[1] - m * 95.0;
//                 dMax = m * 100.0 + extent[0];
//             } else {
//                 dMin = extent[0] * 0.95;
//                 dMax = extent[0] * 1.05;
//             }
//             this._y.domain([dMin, dMax]);
//         }
// 
//         // Add containers for axes, legend and lines
//         gEnter.append('rect').attr('class', 'pane');
//         gEnter.append('g').attr('class', 'legendWrap');
//         gEnter.append('g').attr('class', 'x axis');
//         gEnter.append('g').attr('class', 'y axis');
//         gEnter.append('g').attr('class', 'linesWrap');
// 
//         // Set the format of the y ticks
//         if (this._y.domain()[1] > 1000.0) {
//             this._yAxis.tickFormat(d3.format('.2e'));
//         } else {
//             this._yAxis.tickFormat(d3.format('.4f'));
//         }
// 
//         // Get the maximum size of the labels
//         var yTexts = wrap.select('g').select('.y.axis')
//             .call(this._yAxis)
//             .selectAll('.tick text');
// 
//         var yLabelLength = d3.max(yTexts[0], function(d) {
//             return d.getComputedTextLength();
//         });
// 
//         // Adjust the left margin accordingly
//         var left = this._margin.left + yLabelLength;
// 
//         // Reset the location and the height of this container based on
//         // the placement of the legend.  The 7 pixels here is the difference
//         // between the vertical center and the top of the first legend line, ie.
//         // we need to increase the margin slightly so as to make sure the
//         // legend shows up within the svg container.  We want to maintain a
//         // consistent height of the chart itself, so adjust the svg container
//         // to accomodate large legends
//         var current = this._height - this._margin.top;
//         this._margin.top = this._legend.height() + 7;
//         this._height = current + this._margin.top;
//         d3.select(this).attr('height', this._height);
//         var g = wrap.select('g')
//             .attr('transform', 'translate(' + left + ',' + this._margin.top + ')');
//         wrap.select('.legendWrap')
//             .attr('transform', 'translate(0,' + (-legend.height()) + ')');
// 
//         // Set the zoom behavior
//         var zoom = d3.behavior.zoom()
//             .y(this._y)
//             .on('zoom', this._dispatch.zoomView);
// 
//         // Add a pane to capture zoom events
//         wrap.select('.pane')
//             .attr('width', this._width - left - this._margin.right)
//             .attr('height', this._height - this._margin.top - this._margin.bottom)
//             .call(zoom);
// 
//         // Sets the width, height, colors of the lines chart element
//         this._lines
//             .width(this._width - left - this._margin.right)
//             .height(this._height - this._margin.top - this._margin.bottom)
//             .x(this._x)
//             .y(this._y)
//             .color(
//                 data
//                     // map color by index if not present
//                     .map(function(d, i) { return d.color || this._color[i % 20]; })
//                     // filter out disabled data
//                     .filter(function(d, i) { return !data[i].disabled; })
//             );
// 
//         // Sets the number of axis ticks and their size
//         this._xAxis
//             .ticks(this._width / 100)
//             .tickSize(-(this._height - this._margin.top - this._margin.bottom), 0);
//         this._yAxis
//             .ticks(this._height / 36)
//             .tickSize(-(this._width - left - this._margin.right), 0);
// 
//         // Join data for the lines container
//         var linesWrap = wrap.select('.linesWrap')
//             .datum(data.filter(function(d) { return !d.disabled; }));
//         linesWrap.call(this._lines);
// 
//         // Set the x axis label and provide enter and exit methods
//         var xAxisLabel = g.select('.x.axis').selectAll('text.axislabel')
//             .data([this._xAxisLabelText || null]);
//         xAxisLabel.enter().append('text')
//             .attr('class', 'axislabel')
//             .attr('text-anchor', 'middle');
//         xAxisLabel.exit().remove();
//         xAxisLabel
//             .attr('x', this._x.range()[1] / 2)
//             .attr('y', this._margin.bottom - 15)
//             .text(function(d) { return d; });
// 
//         // Set the x axis ticks
//         g.select('.x.axis')
//             .attr('transform', 'translate(0,' + this._y.range()[0] + ')')
//             .call(this._xAxis)
//             .selectAll('line.tick')
//             .filter(function(d) { return !d; })
//             .classed('zero', true);
// 
//         // Set the y axis label and provide enter and exit methods
//         var yAxisLabel = g.select('.y.axis').selectAll('text.axislabel')
//             .data([this._yAxisLabelText || null]);
//         yAxisLabel.enter().append('text')
//             .attr('class', 'axislabel')
//             .attr('transform', 'rotate(-90)')
//             .attr('text-anchor', 'middle');
//         yAxisLabel.exit().remove();
//         yAxisLabel
//             .attr('x', -this._y.range()[0] / 2)
//             .attr('y', -yLabelLength - 20)
//             .text(function(d) { return d; });
// 
//         // Set the x axis ticks
//         g.select('.y.axis')
//             .call(this._yAxis)
//             .selectAll('line.tick')
//             .filter(function(d) { return !d; })
//             .classed('zero', true);
//     };
// 
//     ChartView.prototype.margin = function(_) {
//         if (!arguments.length)
//             return this._margin;
//         this._margin = _;
//         return this;
//     };
// 
//     ChartView.prototype.width = function(_) {
//         if (!arguments.length)
//             return this._width;
//         this._width = _;
//         return this;
//     };
// 
//     ChartView.prototype.height = function(_) {
//         if (!arguments.length)
//             return this._height;
//         this._height = _;
//         return this;
//     };
// 
//     ChartView.prototype.color = function(_) {
//         if (!arguments.length)
//             return this._color;
//         this._color = _;
//         return this;
//     };
// 
//     ChartView.prototype.yDomain = function(_) {
//         if (!arguments.length)
//             return this._yDomain;
//         this._yDomain = _;
//         return this;
//     };
// 
//     ChartView.prototype.dotRadius = function(_) {
//         if (!arguments.length)
//             return this._dotRadius;
//         this._dotRadius = d3.functor(_);
//         this.lines.dotRadius(d3.functor(_));
//         return this;
//     };
// 
//     // Rebind copies the tickFormat method from xAxis to chart.xAxis
//     // chart.xAxis = {};
//     // d3.rebind(chart.xAxis, xAxis, 'tickFormat');
// 
//     ChartView.prototype.xAxis.label = function(_) {
//         if (!arguments.length)
//             return this._xAxisLabelText;
//         this._xAxisLabelText = _;
//         return this;
//     };
// 
//     // chart.yAxis = {};
//     // d3.rebind(chart.yAxis, yAxis, 'tickFormat');
// 
//     ChartView.prototype.yAxis.label = function(_) {
//         if (!arguments.length)
//             return this._yAxisLabelText;
//         this._yAxisLabelText = _;
//         return this;
//     };

    window.app = window.app || {};
    window.app.ChartView = ChartView;
}(window));

