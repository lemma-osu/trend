/* globals $, _ */
(function (window) {
    /**
     * Simple warning panel with header, message and optional list of warnings
     * @param root - selector to identify the HTML element associated with the panel
     * @param {string} header - Header message
     * @param {string} message - Body of message
     * @param {boolean} hasList - Whether this warning panel includes a list
     * @constructor
     */
    function WarningView(root, header, message, hasList) {
        this._root = $(root);
        this._template =
            '<div class="header">' + header + '</div>' +
            '<p>' + message + '</p>';
        this._template += hasList ? '<ul class="list">{{list}}</ul>' : '';
    }

    /**
     * Specialization of WarningView to represent data elements outside the expected bounds
     * @param root
     * @param {string} header - Header message
     * @param {string} message - Body of message
     * @param {boolean} hasList - Whether this warning panel includes a list
     * @constructor
     */
    function BoundWarningView(root, header, message, hasList) {
        WarningView.call(this, root, header, message, hasList);
        this._lowerLimit = 0.0;
        this._upperLimit = 0.0;
    }

    /**
      * Render panel based on current selection.  If any series does not
      * fall between the lower and upper limit, it is listed in the panel
      * @param {{data: Array, units: string, count: int}} parameter - Selected data information
      */
    BoundWarningView.prototype.render = function (parameter) {
        var self = this;
        var msg = '';
        _.forEach(parameter.data, function (d) {
            if (d.minWeight >= self._lowerLimit && d.minWeight < self._upperLimit) {
                msg += '<li>Series ' + d.label + ': ' + d.minWeight.toFixed(2) + ' ';
                msg += parameter.units + '</li>';
            }
        });
        var parent = self._root.parents('.row');
        if (msg) {
            var threshold = self._upperLimit + ' ' + parameter.units;
            var str = self._template;
            str = str.replace(/{{threshold}}/g, threshold);
            str = str.replace(/{{list}}/g, msg);
            self._root.html(str);
            parent.show();
        } else {
            parent.hide();
        }
    };

    /**
     * Setter/getter for lower bound
     * @param {number} [_]
     * @returns {*}
     */
    BoundWarningView.prototype.lowerLimit = function(_) {
        if (!arguments.length)
            return this._lowerLimit;
        this._lowerLimit = _;
        return this;
    };

    /**
     * Setter/getter for upper bound
     * @param {number} [_]
     * @returns {*}
     */
    BoundWarningView.prototype.upperLimit = function(_) {
        if (!arguments.length)
            return this._upperLimit;
        this._upperLimit = _;
        return this;
    };

    /**
     * Class for rendering warning panel when selection produces no records
     * @constructor
     */
    function EmptyRecordsView() {
        WarningView.call(this,
            '#no-records',
            'Error',
            'There are no series with this combination of strata',
            false
        );
    }

    /**
     * Render panel based on current selection
     * @param {{data: Array, units: string, count: int}} parameter - Selected data information
     */
    EmptyRecordsView.prototype.render = function(parameter) {
        var parent = this._root.parents('.row');
        if (parameter.count === 0) {
            this._root.html(this._template);
            parent.show();
        } else {
            parent.hide();
        }
    };

    /**
     * Class for rendering warning panel when series has weight (area) lower
     * than specified minimum area threshold
     * @constructor
     */
    function NotShownView() {
        BoundWarningView.call(this,
            '#not-shown-warning',
            'Warning: Series not shown',
            'These series are not shown because they are less than the minimum area ' +
            'threshold ({{threshold}}).',
            true
        );
    }
    NotShownView.prototype = Object.create(BoundWarningView.prototype);
    NotShownView.prototype.constructor = NotShownView;

    /**
     * Class for rendering warning panel when series has low weight (area) -
     * between minimum and low areas
     * @constructor
     */
    function LowAreaView() {
        BoundWarningView.call(this,
            '#low-area-warning',
            'Warning: Series have low area',
            'These series have low areas associated with their strata and are symbolized ' +
            'with dashed lines in the chart below.  Use with caution!',
            true
        );
    }
    LowAreaView.prototype = Object.create(BoundWarningView.prototype);
    LowAreaView.prototype.constructor = LowAreaView;

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
        this.notShownView.lowerLimit(0.0);
        this.notShownView.upperLimit(config.minimumAreaThreshold());
        this.lowAreaView.lowerLimit(config.minimumAreaThreshold());
        this.lowAreaView.upperLimit(config.lowAreaThreshold());
    };

    /**
     * Render all three information panels based on data.  This passes the
     * actual rendering to the contained instances
     * @param {Object} parameter - Selected data information
     */
    InformationView.prototype.render = function (parameter) {
        this.emptyRecordsView.render(parameter);
        this.notShownView.render(parameter);
        this.lowAreaView.render(parameter);
    };

    window.app = window.app || {};
    window.app.InformationView = InformationView;
}(window));
