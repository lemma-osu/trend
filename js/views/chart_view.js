/* globals $, d3 */
(function (window) {

    /**
     * Tooltip for displaying data values on chart hover
     * @constructor
     */
    function Tooltip() {
    }

    Tooltip.prototype.show = function(pos, content, gravity, dist) {
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
    Tooltip.prototype.cleanup = function() {
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
    var tooltip = new Tooltip();

    /**
     * Main chart container class for showing series data.  This controls
     * display and interaction for the d3 chart.
     * @constructor
     */
    function ChartView() {
        this._margin = {top: 0, right: 20, bottom: 50, left: 40};
        this._width = 960;
        this._height = 500;
        this._dotRadius = function() { return 2.5; };
        this._yDomain = 'init';
        this._xAxisLabelText = false;
        this._yAxisLabelText = false;
        this.color = d3.scale.category10().range();
        this.dispatch = d3.dispatch('showTooltip', 'hideTooltip', 'zoomView');

        this._x = d3.scale.linear();
        this._y = d3.scale.linear();
        this._xAxis = d3.svg.axis()
            .scale(this._x)
            .orient('bottom')
            .tickFormat(d3.format('d'));
        this._yAxis = d3.svg.axis()
            .scale(this._y)
            .orient('left');

        this._legendView = new window.app.LegendView().color(this.color);
        this._linesView = new window.app.LinesView();
    }

    /**
     * Initialize the chart based on first selected values in the configuration
     * @param {ConfigurationModel} config - Configuration model
     * @param {Array} data - Series data to display
     */
    ChartView.prototype.initialize = function(config, data) {
        var self = this;
        self
            .xAxisLabelText(config.selected.timeField.alias)
            .width($('#chart').width())
            .height(400);
        d3.select('#chart svg')
            .datum(data)
            .attr('width', self._width)
            .attr('height', self._height);
    };

    /**
     * Method to fire on any update to the chart
     * @param {ConfigurationModel} config - Configuration model
     * @param {Array} data - Series data to display
     */
    ChartView.prototype.update = function(config, data) {
        var self = this;
        if (data.length) {
            this._yDomain = 'init';
            $('#chart').show();
            d3.select('#chart svg')
                .datum(data)
                .call(self.render.bind(self), config);
        } else {
            $('#chart').hide();
        }
    };

    /**
     * Main rendering of chart based on currently selected data
     * @param {d3.selection} selection - Currently selected data
     * @param {ConfigurationModel} config - Configuration model
     */
    ChartView.prototype.render = function(selection, config) {
        var self = this;
        selection.each(function(data) {
            var selected = config.selected;

            // data = _.sortBy(data, function(o) {
            //     return o.label;
            // });

            var series = data
                .filter(function(d) { return !d.disabled; })
                .map(function(d) { return d.getSeriesViewData(); });

            self._yAxisLabelText = selected.variableField.alias + ' (' +
                selected.variableField.units + ')';

            // wrap points to svg -> g.wrap
            var wrap = d3.select(this).selectAll('g.wrap').data([data]);

            // gEnter points to svg -> g.wrap.d3lineWithLegend -> g
            var gEnter = wrap.enter().append('g')
                .attr('class', 'wrap d3lineWithLegend').append('g');

            // Event code
            self._legendView.dispatch.on('legendClick', function(d) {
                d.disabled = !d.disabled;
                if (!data.filter(function(d) { return !d.disabled; }).length) {
                    data.forEach(function(d) {
                        d.disabled = false;
                    });
                }
                // Reset the zoom
                self._yDomain = 'init';
                selection.call(self.render.bind(self), config);
            });

            self._legendView.dispatch.on('legendMouseover', function(d) {
                d.hover = true;
                selection.call(self.render.bind(self), config);
            });

            self._legendView.dispatch.on('legendMouseout', function(d) {
                d.hover = false;
                selection.call(self.render.bind(self), config);
            });

            self._linesView.dispatch.on('pointMouseover.tooltip', function(e) {
                self.dispatch.showTooltip({
                    point: e.point,
                    series: e.series,
                    pos: [e.pos[0] + self._margin.left, e.pos[1] + self._margin.top],
                    seriesIndex: e.seriesIndex,
                    pointIndex: e.pointIndex
                });
            });

            self._linesView.dispatch.on('pointMouseout.tooltip', function(e) {
                self.dispatch.hideTooltip(e);
            });

            self.dispatch.on('zoomView', function() {
                g.select('.x.axis').call(self._xAxis);
                g.select('.y.axis').call(self._yAxis);
                selection.call(self.render.bind(self), config);
            });

            self.dispatch.on('showTooltip', function(e) {
                var offset = $('#chart').offset(),
                    left = e.pos[0] + offset.left,
                    top = e.pos[1] + offset.top,
                    formatter = d3.format(".04f");

                var content =
                    '<p>' +
                    e.series.label + ', ' +
                    e.point[0] + ', ' +
                    formatter(e.point[1]) +
                    '</p>';
                tooltip.show([left, top], content);
            });

            self.dispatch.on('hideTooltip', function() {
                tooltip.cleanup();
            });

            // Set the x range and extent from all data
            self._x.domain(d3.extent(d3.merge(series), function(d) { return d.x; }))
                .range([0, self._width - self._margin.left - self._margin.right]);

            // If the y domain has not already been set, set it from the y-range
            // of all data.  After that, we respond to zoom events
            self._y.range([self._height - self._margin.top - self._margin.bottom, 0]);
            if (self._yDomain === 'init') {
                self._yDomain = 'set';
                var globalMin = d3.min(d3.merge(series), function(d) { return d.min});
                var globalMax = d3.max(d3.merge(series), function(d) { return d.max});
                var m = (globalMax  - globalMin) / 90.0;
                var dMin, dMax, PRECISION=0.00001;
                if (Math.abs(m) > PRECISION) {
                    dMin = globalMax - m * 95.0;
                    dMax = m * 100.0 + globalMin;
                } else {
                    dMin = globalMin * 0.95;
                    dMax = globalMin * 1.05;
                }
                if (dMin === 0.0 && dMax === 0.0) {
                    dMin = -0.1;
                    dMax = 0.1;
                }
                self._y.domain([dMin, dMax]);
            }

            // Add containers for axes, legend and lines
            gEnter.append('g').attr('class', 'legendWrap');
            gEnter.append('g').attr('class', 'x axis');
            gEnter.append('g').attr('class', 'y axis');
            gEnter.append('g').attr('class', 'linesWrap');
            gEnter.append('rect').attr('class', 'pane');

            // Set attributes for legend container - this needs to be done first
            // as there could be more than one row of legend items.  All other
            // sizes are set after the legend is set
            self._legendView
                .width(self._width - self._margin.right)
                .height(30);

            // Figure out the size of the y axis labels and potentially adjust the
            // chart size to accommodate large numbers.

            // Set the format of the y ticks
            if (self._y.domain()[1] > 1000.0) {
                self._yAxis.tickFormat(d3.format('.2e'));
            } else {
                self._yAxis.tickFormat(d3.format('.4f'));
            }

            // Get the maximum size of the labels
            var yTexts = wrap.select('g').select('.y.axis')
                .call(self._yAxis)
                .selectAll('.tick text');

            var yLabelLength = d3.max(yTexts[0], function(d) {
                return d.getComputedTextLength();
            });

            // Adjust the left margin accordingly
            var left = self._margin.left + yLabelLength;

            self._legendView.width(self._legendView.width() - left);

            // Render the legend
            wrap.select('.legendWrap')
                .datum(data)
                .call(self._legendView.render.bind(self._legendView));

            // Reset the location and the height of this container based on
            // the placement of the legend.  The 7 pixels here is the difference
            // between the vertical center and the top of the first legend line, ie.
            // we need to increase the margin slightly so as to make sure the
            // legend shows up within the svg container.  We want to maintain a
            // consistent height of the chart itself, so adjust the svg container
            // to accommodate large legends
            var current = self._height - self._margin.top;
            self._margin.top = self._legendView.height() + 7;
            self._height = current + self._margin.top;
            var g = wrap.select('g')
                .attr('transform', 'translate(' + left + ',' + self._margin.top + ')');
            d3.select(this).attr('height', self._height);
            wrap.select('.legendWrap')
                .attr('transform', 'translate(0,' + (-self._legendView.height()) + ')');

            // Set the zoom behavior
            var zoom = d3.behavior.zoom()
                .y(self._y)
                .on('zoom', self.dispatch.zoomView);

            // Add a pane to capture zoom events
            wrap.select('.pane')
                .attr('width', self._width - left - self._margin.right)
                .attr('height', self._height - self._margin.top - self._margin.bottom)
                .call(zoom);

            // Sets the width, height, colors of the lines chart element
            self._linesView
                .width(self._width - left - self._margin.right)
                .height(self._height - self._margin.top - self._margin.bottom)
                .x(self._x)
                .y(self._y)
                .color(
                    data
                        // map color by index if not present
                        .map(function(d, i) { return d.color || self.color[i % 20]; })
                        // filter out disabled data
                        .filter(function(d, i) { return !data[i].disabled; })
                );

            // Sets the number of axis ticks and their size
            self._xAxis
                .ticks(self._width / 100)
                .tickSize(-(self._height - self._margin.top - self._margin.bottom), 0);
            self._yAxis
                .ticks(self._height / 36)
                .tickSize(-(self._width - left - self._margin.right), 0);

            // Join data for the lines container
            var linesWrap = wrap.select('.linesWrap')
                .datum(data.filter(function(d) { return !d.disabled; }));
            linesWrap.call(self._linesView.render.bind(self._linesView), config.lowAreaThreshold);

            // Set the x axis label and provide enter and exit methods
            var xAxisLabel = g.select('.x.axis').selectAll('text.axislabel')
                .data([self._xAxisLabelText || null]);
            xAxisLabel.enter().append('text')
                .attr('class', 'axislabel')
                .attr('text-anchor', 'middle');
            xAxisLabel.exit().remove();
            xAxisLabel
                .attr('x', self._x.range()[1] / 2)
                .attr('y', self._margin.bottom - 15)
                .text(function(d) { return d; });

            // Set the x axis ticks
            g.select('.x.axis')
                .attr('transform', 'translate(0,' + self._y.range()[0] + ')')
                .call(self._xAxis)
                .selectAll('line.tick')
                .filter(function(d) { return !d; })
                .classed('zero', true);

            // Set the y axis label and provide enter and exit methods
            var yAxisLabel = g.select('.y.axis').selectAll('text.axislabel')
                .data([self._yAxisLabelText || null]);
            yAxisLabel.enter().append('text')
                .attr('class', 'axislabel')
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle');
            yAxisLabel.exit().remove();
            yAxisLabel
                .attr('x', -self._y.range()[0] / 2)
                .attr('y', -yLabelLength - 20)
                .text(function(d) { return d; });

            // Set the x axis ticks
            g.select('.y.axis')
                .call(self._yAxis)
                .selectAll('line.tick')
                .filter(function(d) { return !d; })
                .classed('zero', true);
        });
    };

    /**
     * Setter/getter for chart margin
     * @param _
     * @returns {*}
     */
    ChartView.prototype.margin = function(_) {
        if (!arguments.length)
            return this._margin;
        this._margin = _;
        return this;
    };

    /**
     * Setter/getter for chart width
     * @param _
     * @returns {*}
     */
    ChartView.prototype.width = function(_) {
        if (!arguments.length)
            return this._width;
        this._width = _;
        return this;
    };

    /**
     * Setter/getter for chart height
     * @param _
     * @returns {*}
     */
    ChartView.prototype.height = function(_) {
        if (!arguments.length)
            return this._height;
        this._height = _;
        return this;
    };

    /**
     * Setter/getter for chart series colors
     * @param _
     * @returns {*}
     */
    ChartView.prototype.color = function(_) {
        if (!arguments.length)
            return this.color;
        this.color = _;
        return this;
    };

    /**
     * Setter/getter for y domain
     * @param _
     * @returns {*}
     */
    ChartView.prototype.yDomain = function(_) {
        if (!arguments.length)
            return this._yDomain;
        this._yDomain = _;
        return this;
    };

    /**
     * Setter/getter for series dot radii
     * @param _
     * @returns {*}
     */
    ChartView.prototype.dotRadius = function(_) {
        if (!arguments.length)
            return this._dotRadius;
        this._dotRadius = d3.functor(_);
        this._linesView.dotRadius(_);
        return this;
    };

    /**
     * Setter/getter for x-axis label text
     * @param _
     * @returns {*}
     */
    ChartView.prototype.xAxisLabelText = function(_) {
        if (!arguments.length)
            return this._xAxisLabelText;
        this._xAxisLabelText = _;
        return this;
    };

    /**
     * Setter/getter for y-axis label text
     * @param _
     * @returns {*}
     */
    ChartView.prototype.yAxisLabelText = function(_) {
        if (!arguments.length)
            return this._yAxisLabelText;
        this._yAxisLabelText = _;
        return this;
    };

    window.app = window.app || {};
    window.app.Tooltip = Tooltip;
    window.app.ChartView = ChartView;
}(window));

