/* globals d3 */
(function (window) {

    /**
     * Class to control rendering and user interaction with chart series
     * @constructor
     */
    function LinesView() {
        this._margin = {top: 0, right: 0, bottom: 0, left: 0};
        this._width = 960;
        this._height = 500;
        this._dotRadius = function() { return 2.5; };
        this._color = d3.scale.category20().range();
        this._id = Math.floor(Math.random() * 10000);
        this._x = d3.scale.linear();
        this._y = d3.scale.linear();
        this.dispatch = d3.dispatch('pointMouseover', 'pointMouseout');
        this._x0 = null;
        this._y0 = null;
    }

    /**
     * Render the lines based on the current series selection
     * @param selection - Currently selected series
     * @param {float} lowAreaThreshold - Threshold to change line symbolization
     */
    LinesView.prototype.render = function(selection, lowAreaThreshold) {
        var self = this;
        selection.each(function(data) {
            var seriesData = data.map(function(d) { return d.data; });
            self._x0 = self._x0 || self._x;
            self._y0 = self._y0 || self._y;

            // Add the series as an attribute to each point
            data = data.map(function(series, i) {
                series.data = series.data.map(function(point) {
                    point.series = i;
                    return point;
                });
                return series;
            });

            // Set the domain and range of the x-axis
            self._x.domain(d3.extent(d3.merge(seriesData), function(d) { return d[0]; }))
                .range([0, self._width - self._margin.left - self._margin.right]);

            // Set the range for the y-axis, but don't set the domain as this can
            // change based on zooming
            self._y.range([self._height - self._margin.top - self._margin.bottom, 0]);

            // Create a 2D array with x, y coordinates and line and point
            // indexes
            var vertices = d3.merge(data.map(function(line, lineIndex) {
                return line.data.map(function(point, pointIndex) {
                    return [self._x(point[0]), self._y(point[1]), lineIndex, pointIndex];
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
            wrap.select('g')
                .attr('transform', 'translate(' + self._margin.left + ',' + self._margin.top + ')');

            // Create a border for the series data
            gEnter.append('rect')
                .attr('id', 'chart-border');

            // Create a clip-path for the series data
            gEnter.append('clipPath')
                .attr('id', 'clip-border')
                .append('rect');

            gEnter.append('g')
                .attr('class', 'voronoi-clip')
                .append('clipPath')
                .attr('id', 'voronoi-clip-path-' + self._id)
                .append('rect');

            wrap.select('#chart-border')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', self._width - self._margin.left - self._margin.right)
                .attr('height', self._height - self._margin.top - self._margin.bottom);

            wrap.select('#clip-border rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', self._width - self._margin.left - self._margin.right)
                .attr('height', self._height - self._margin.top - self._margin.bottom);

            wrap.select('.voronoi-clip rect')
                .attr('x', -10)
                .attr('y', -10)
                .attr('width', self._width - self._margin.left - self._margin.right + 20)
                .attr('height', self._height - self._margin.top - self._margin.bottom + 20);

            wrap.select('.point-paths')
                .attr('clip-path', 'url(#voronoi-clip-path-' + self._id + ')');

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
                    return 'clip-' + self._id + '-' + d[2] + '-' + d[3];
                })
                .attr('transform', function(d) {
                    return 'translate(' + d[0] + ',' + d[1] + ')';
                });

            // // TODO: Voronoi points are causing issues
            // // Create jittered versions of the vertices to ensure that no two
            // // points are coincident which causes problems for d3.geom.voronoi
            // var fuzzedVertices = vertices.map(function(d, i) {
            //     var xFuzz = d[0] + ((Math.random() - 0.5) * 1e-5);
            //     var yFuzz = d[1] + ((Math.random() - 0.5) * 1e-5);
            //     return [xFuzz, yFuzz, d[2], d[3]];
            // });
            //
            // var voronoi = d3.geom.voronoi(fuzzedVertices).map(function(d, i) {
            //     return {
            //         'data': d,
            //         'series': fuzzedVertices[i][2],
            //         'point': fuzzedVertices[i][3]
            //     };
            // });
            //
            // var pointPaths = wrap.select('.point-paths').selectAll('path')
            //     .data(voronoi);
            // pointPaths.enter().append('path')
            //     .attr('class', function(d,i) { return 'path-' + i; });
            // pointPaths.exit().remove();
            // pointPaths
            //     .attr('clip-path', function(d) {
            //         try {
            //             return 'url(#clip-' + self._id + '-' + d.series + '-' + d.point + ')';
            //         } catch(e) {
            //         }
            //     })
            //     .attr('d', function(d) {
            //         try {
            //             return 'M' + d.data.join(',') + 'Z';
            //         } catch(e) {
            //         }
            //     })
            //     .on('mouseover', function(d) {
            //         self.dispatch.pointMouseover({
            //             point: data[d.series].data[d.point],
            //             series: data[d.series],
            //             pos: [
            //                 self._x(data[d.series].data[d.point][0]) + self._margin.left,
            //                 self._y(data[d.series].data[d.point][1]) + self._margin.top
            //             ],
            //             pointIndex: d.point,
            //             seriesIndex: d.series
            //         });
            //     })
            //     .on('mouseout', function(d) {
            //         self.dispatch.pointMouseout({
            //             point: d,
            //             series: data[d.series],
            //             pointIndex: d.point,
            //             seriesIndex: d.series
            //         });
            //     });
            //
            // self.dispatch.on('pointMouseover.point', function(d) {
            //     wrap.select('.line-' + d.seriesIndex + ' .point-' + d.pointIndex)
            //         .classed('hover', true);
            // });
            //
            // self.dispatch.on('pointMouseout.point', function(d) {
            //     wrap.select('.line-' + d.seriesIndex + ' .point-' + d.pointIndex)
            //         .classed('hover', false);
            // });

            // Bring in the line containers
            var lines = wrap.select('.lines').selectAll('.line')
                .data(function(d) { return d; }, function(d) { return d.label; });
            lines.enter().append('g')
                .attr('clip-path', 'url(#clip-border)')
                .style('stroke-opacity', 1e-6)
                .style('fill-opacity', 1e-6);
            lines.exit().transition()
                .style('stroke-opacity', 1e-6)
                .style('fill-opacity', 1e-6)
                .remove();
            lines.attr('class', function(d,i) { return 'line line-' + i; })
                .classed('hover', function(d) { return d.hover; })
                .style('fill', function(d,i) { return d.color || self._color[i % 20]; })
                .style('stroke', function(d,i) { return d.color || self._color[i % 20]; })
                .style('stroke-dasharray', function(d) {
                    return d.minWeight < lowAreaThreshold ? '3, 5' : 'none';
                });
            lines.transition()
                .style('stroke-opacity', 1)
                .style('fill-opacity', 0.5);

            // Insert the paths into the line containers
            var paths = lines.selectAll('path')
                .data(function(d) { return [d.data]; });
            paths.enter().append('path')
                .attr('d', d3.svg.line()
                    .x(function(d) { return self._x0(d[0]); })
                    .y(function(d) { return self._y0(d[1]); })
                );
            paths.exit().remove();
            paths.transition()
                .attr('d', d3.svg.line()
                    .x(function(d) { return self._x(d[0]); })
                    .y(function(d) { return self._y(d[1]); })
                );

            // Add points to the line containers
            var points = lines.selectAll('circle.point')
                .data(function(d) { return d.data; });
            points.enter().append('circle')
                .attr('cx', function(d) { return self._x0(d[0]); })
                .attr('cy', function(d) { return self._y0(d[1]); });
            points.exit().remove();
            points.attr('class', function(d, i) { return 'point point-' + i; });
            points.transition()
                .attr('cx', function(d) { return self._x(d[0]); })
                .attr('cy', function(d) { return self._y(d[1]); })
                .attr('r', self._dotRadius());
        });
        self._x0 = self._x;
        self._y0 = self._y;
    };

    /**
     * Setter/getter for lines margin
     * @param _
     * @returns {*}
     */
    LinesView.prototype.margin = function(_) {
        if (!arguments.length)
            return this._margin;
        this._margin = _;
        return this;
    };

    /**
     * Setter/getter for lines width
     * @param _
     * @returns {*}
     */
    LinesView.prototype.width = function(_) {
        if (!arguments.length)
            return this._width;
        this._width = _;
        return this;
    };

    /**
     * Setter/getter for lines height
     * @param _
     * @returns {*}
     */
    LinesView.prototype.height = function(_) {
        if (!arguments.length)
            return this._height;
        this._height = _;
        return this;
    };

    /**
     * Setter/getter for lines x scale
     * @param _
     * @returns {*}
     */
    LinesView.prototype.x = function(_) {
        if (!arguments.length)
            return this._x;
        this._x = _;
        return this;
    };

    /**
     * Setter/getter for lines y scale
     * @param _
     * @returns {*}
     */
    LinesView.prototype.y = function(_) {
        if (!arguments.length)
            return this._y;
        this._y = _;
        return this;
    };

    /**
     * Setter/getter for lines dot radii
     * @param _
     * @returns {*}
     */
    LinesView.prototype.dotRadius = function(_) {
        if (!arguments.length)
            return this._dotRadius;
        this._dotRadius = d3.functor(_);
        return this;
    };

    /**
     * Setter/getter for lines colors
     * @param _
     * @returns {*}
     */
    LinesView.prototype.color = function(_) {
        if (!arguments.length)
            return this._color;
        this._color = _;
        return this;
    };

    /**
     * Setter/getter for lines IDs
     * @param _
     * @returns {*}
     */
    LinesView.prototype.id = function(_) {
        if (!arguments.length)
            return this._id;
        this._id = _;
        return this;
    };

    window.app = window.app || {};
    window.app.LinesView = LinesView;
}(window));
