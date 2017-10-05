/* globals $, _ */
(function (window) {
    /**
     * Class for rendering warning panel when selection produces no records
     * @constructor
     */
    function EmptyRecordsView() {
        this._root = $('#no-records');
        this._template =
            '<div class="header">Error</div>' +
            '<p>There are no series with this combination of strata</p>';
        this._root.append(this._template);
    }

    /**
     * Render panel based on current selection
     * @param {string} viewCmd - Command to render
     * @param {Object} parameter - Selected data information
     */
    EmptyRecordsView.prototype.render = function(viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            update: function() {
                var parent = self._root.parents('.row');
                if (parameter.count === 0)
                    parent.show();
                else
                    parent.hide();
            }
        };
        viewCommands[viewCmd]();
    };

    /**
     * Class for rendering warning panel when series has weight (area) lower
     * than specified minimum area threshold
     * @constructor
     */
    function NotShownView() {
        this._root = $('#not-shown-warning');
        this._minimumAreaThreshold = 0.0;
        this._template =
            '<div class="header">Warning: Series not shown</div>' +
            '<p>These series are not shown because they are less ' +
            '    than the minimum area threshold ({{threshold}})' +
            '<ul class="list">{{list}}</ul>';
    }

    /**
     * Render panel based on current selection.  If any series does not
     * meet the minimum area threshold, it is listed in the panel
     * @param {string} viewCmd - Command to render
     * @param {Object} parameter - Selected data information
     */
    NotShownView.prototype.render = function(viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            update: function() {
                var msg = '';
                _.forEach(parameter.data, function(d) {
                    if (d.minWeight < self._minimumAreaThreshold) {
                        msg += '<li>Series ' + d.label + ': ' + d.minWeight.toFixed(2) + ' ';
                        msg += parameter.units + '</li>';
                    }
                });
                var parent = self._root.parents('.row');
                if (msg) {
                    var str = self._template;
                    var threshold = self._minimumAreaThreshold + ' ' + parameter.units;
                    str = str.replace(/{{threshold}}/g, threshold);
                    str = str.replace(/{{list}}/g, msg);
                    self._root.html(str);
                    parent.show();
                } else {
                    parent.hide();
                }
            }
        };
        viewCommands[viewCmd]();
    };

    /**
     * Setter/getter for minimum area
     * @param _
     * @returns {*}
     */
    NotShownView.prototype.minimumAreaThreshold = function(_) {
        if (!arguments.length)
            return this._minimumAreaThreshold;
        this._minimumAreaThreshold = _;
        return this;
    };

    /**
     * Class for rendering warning panel when series has low weight (area) -
     * between minimum and low areas
     * @constructor
     */
    function LowAreaView() {
        this._root = $('#low-area-warning');
        this._lowAreaThreshold = 0.0;
        this._minimumAreaThreshold = 0.0;
        this._template =
            '<div class="header">Warning: Series have low area</div>' +
            '<p>These series have low areas associated with their ' +
            '    strata and are symbolized with dashed lines in the ' +
            '    chart below. Use with caution!</p>' +
            '<ul class="list">{{list}}</ul>';
    }

    /**
     * Render panel based on current selection.  If any series
     * meets the low area threshold, it is listed in the panel.
     * @param {string} viewCmd - Command to render
     * @param {Object} parameter - Selected data information
     */
    LowAreaView.prototype.render = function(viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            update: function() {
                var msg = '';
                _.forEach(parameter.data, function(d) {
                    if (d.minWeight < self._lowAreaThreshold && d.minWeight >= self._minimumAreaThreshold) {
                        msg += '<li>Series ' + d.label + ': ' + d.minWeight.toFixed(2) + ' ';
                        msg += parameter.units + '</li>';
                    }
                });
                var parent = self._root.parents('.row');
                if (msg) {
                    self._root.html(self._template.replace(/{{list}}/g, msg));
                    parent.show();
                } else {
                    parent.hide();
                }
            }
        };
        viewCommands[viewCmd]();
    };

    /**
     * Setter/getter for low area
     * @param _
     * @returns {*}
     */
    LowAreaView.prototype.lowAreaThreshold = function(_) {
        if (!arguments.length)
            return this._lowAreaThreshold;
        this._lowAreaThreshold = _;
        return this;
    };

    /**
     * Setter/getter for minimum area
     * @param _
     * @returns {*}
     */
    LowAreaView.prototype.minimumAreaThreshold = function(_) {
        if (!arguments.length)
            return this._minimumAreaThreshold;
        this._minimumAreaThreshold = _;
        return this;
    };

    /**
     * Composite container to control all information panels
     * @constructor
     */
    function InformationView() {
        this.emptyRecordsView = new EmptyRecordsView();
        this.notShownView = new NotShownView();
        this.lowAreaView = new LowAreaView();
    }

    /**
     * Initialize the three warning panels and set area thresholds
     * @param {ConfigurationModel} config - Configuration model
     */
    InformationView.prototype.initialize = function(config) {
        this.lowAreaView.lowAreaThreshold(config.lowAreaThreshold());
        this.lowAreaView.minimumAreaThreshold(config.minimumAreaThreshold());
        this.notShownView.minimumAreaThreshold(config.minimumAreaThreshold());
    };

    /**
     * Render all three information panels based on data.  This passes the
     * actual rendering to the contained instances
     * @param {string} viewCmd - Command to render
     * @param {Object} parameter - Selected data information
     */
    InformationView.prototype.render = function(viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            update: function() {
                self.emptyRecordsView.render('update', parameter);
                self.notShownView.render('update', parameter);
                self.lowAreaView.render('update', parameter);
            }
        };
        viewCommands[viewCmd]();
    };

    window.app = window.app || {};
    window.app.InformationView = InformationView;
}(window));
