/* globals d3 */
(function (window) {

    /**
     * Class to control rendering and user interaction with chart legend
     * @constructor
     */
    function LegendView() {
        this._margin = {top: 0, right: 0, bottom: 5, left: 10};
        this._width = 800;
        this._height = 20;
        this._color = d3.scale.category10().range();
        this.dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout');
    }

    /**
     * Render the legend based on the current series selection
     * @param selection - Currently selected series
     */
    LegendView.prototype.render = function(selection) {
        var self = this;
        selection.each(function(data) {
            // Legend currently is setup to automatically expand vertically based
            // on a max width. Should implement legend where EITHER a maxWidth or
            // a maxHeight is defined, then the other dimension will automatically
            // expand to fit, and anything that exceeds that will automatically
            // be clipped.

            // Structure of legend is g.legendWrap -> g.legend -> g -> g.series

            // Set the data element of the g.legend container
            var wrap = d3.select(this).selectAll('g.legend').data([data]);
            wrap.enter().append('g')
                .attr('class', 'legend')
                .append('g');

            // Transform all g containers
            var g = wrap.select('g')
                .attr('transform', 'translate(' + self._margin.left + ',' + self._margin.top + ')');

            // Set the individual series
            var series = g.selectAll('.series')
                .data(function(d) { return d; });

            // Update existing series
            series.select('circle')
                .style('fill', function(d, i) { return d.color || self.color[i % 20]; })
                .style('stroke', function(d, i) { return d.color || self.color[i % 20]; });
            series.select('text')
                .text(function(d) { return d.label; });

            // On enter, set the events to the dispatch events
            var seriesEnter = series.enter().append('g')
                .attr('class', 'series')
                .on('click', function(d, i) { self.dispatch.legendClick(d, i); })
                .on('mouseover', function(d, i) { self.dispatch.legendMouseover(d, i); })
                .on('mouseout', function(d, i) { self.dispatch.legendMouseout(d, i); });

            // Add the actual legend elements (circle and text)
            seriesEnter.append('circle')
                .style('fill', function(d, i) { return d.color || self.color[i % 20]; })
                .style('stroke', function(d, i) { return d.color || self.color[i % 20]; })
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
            series.each(function() {
                var node = d3.select(this).select('text').node();
                var length = node.getComputedTextLength() + 45;
                maxLength = length > maxLength ? length : maxLength;
            });

            // Set the location of the legend series element, accounting for
            // cases when there is not enough room for all series to fit on a
            // single line
            var ypos = 0, newxpos = 0, maxWidth = 0, xpos;
            series
                .attr('transform', function() {
                    xpos = newxpos;
                    if (self._width < self._margin.left + self._margin.right + xpos + maxLength) {
                        newxpos = xpos = 0;
                        ypos += 25;
                    }
                    newxpos += maxLength;
                    if (newxpos > maxWidth)
                        maxWidth = newxpos;
                    return 'translate (' + xpos + ',' + ypos + ')';
                });

            // Adjust the height
            self._height += self._margin.top + ypos;
        });
    };

    /**
     * Setter/getter for legend margin
     * @param _
     * @returns {*}
     */
    LegendView.prototype.margin = function(_) {
        if (!arguments.length)
            return this._margin;
        this._margin = _;
        return this;
    };

    /**
     * Setter/getter for legend width
     * @param _
     * @returns {*}
     */
    LegendView.prototype.width = function(_) {
        if (!arguments.length)
            return this._width;
        this._width = _;
        return this;
    };

    /**
     * Setter/getter for legend height
     * @param _
     * @returns {*}
     */
    LegendView.prototype.height = function(_) {
        if (!arguments.length)
            return this._height;
        this._height = _;
        return this;
    };

    /**
     * Setter/getter for legend series colors
     * @param _
     * @returns {*}
     */
    LegendView.prototype.color = function(_) {
        if (!arguments.length)
            return this._color;
        this._color = _;
        return this;
    };

    window.app = window.app || {};
    window.app.LegendView = LegendView;
}(window));
