/* globals _, d3 */
(function (window) {
    'use strict';

    /**
     * Controller for trend application
     * @param {ConfigurationModel} configModel - Configuration/data settings
     * @param {MenuView} menuView - View controlling user interaction
     * @param {InformationView} informationView - View controlling information panels
     * @param {ChartView} chartView - View controlling chart and chart interaction
     * @constructor
     */
    function TrendController(configModel, menuView, informationView, chartView) {
        var self = this;
        self._configModel = configModel;
        self._menuView = menuView;
        self._informationView = informationView;
        self._chartView = chartView;
        self._data = null;

        self._menuView.bind('stratum-link-click', function(obj) {
            self._menuView.render('stratumModalShow', obj);
        });
        self._menuView.bind('stratum-modal-select-all', function(obj) {
            self._menuView.render('stratumModalUpdateDropdown', obj);
        });
        self._menuView.bind('stratum-modal-select-none', function(obj) {
            self._menuView.render('stratumModalUpdateDropdown', obj);
        });
        self._menuView.bind('stratum-modal-approve', function(obj) {
            self._menuView.render('stratumUpdateList', obj);
            var cats = (self._configModel.strataFields())[obj.index].categories;
            var subsetStrata = self._configModel.selected().strataFields;
            if (obj.items[0] === 'All') {
                subsetStrata[obj.index].categories = cats;
            } else {
                subsetStrata[obj.index].categories = _.filter(cats, function(d) {
                    return _.includes(obj.items, d.key);
                });
            }
            self._configModel.selected({
                'strataFields': subsetStrata
            });
            self.update();
        });
        self._menuView.bind('series-link-click', function() {
            self._menuView.render('seriesModalShow');
        });
        self._menuView.bind('series-modal-approve', function(obj) {
            var item = self._configModel.getSeries(obj.series);
            self._menuView.render('seriesUpdate', item.alias);
            self._configModel.selected({
                'seriesField': item
            });
            self.update();
        });
        self._menuView.bind('time-link-click', function() {
            self._menuView.render('timeModalShow');
        });
        self._menuView.bind('time-slider-change', function(obj) {
            self._menuView.render('timeModalUpdate', obj);
        });
        self._menuView.bind('time-modal-approve', function(obj) {
            self._menuView.render('timeUpdate', obj);
            self._configModel.selected({
                'minTime': obj.timeRange[0],
                'maxTime': obj.timeRange[1]
            });
            self.update();
        });
        self._menuView.bind('variable-link-click', function() {
            self._menuView.render('variableModalShow');
        });
        self._menuView.bind('variable-modal-approve', function(obj) {
            var item = self._configModel.getVariable(obj.variable);
            self._menuView.render('variableUpdate', item.alias);
            self._configModel.selected({
                'variableField': item
            });
            self.update();
        });

        // Window resize handler
        d3.select(window).on('resize', function() {
            self.resize();
        });

    }

    /**
     * Initialize all components using the raw JSON configuration
     * @param {Object} rawConfig - Configuration object read from URL
     */
    TrendController.prototype.initialize = function(rawConfig) {
        var self = this;
        self._configModel.initialize(rawConfig, function(config) {
            self._menuView.render('initializeMenu', config);
            self._informationView.initialize(config);
            self._configModel.filterGroupRecords(function(obj) {
                self._chartView.initialize(config, obj.data);
                self._data = obj.data;
            });
        });
    };

    /**
     * Respond to any UI change that may change data selection
     */
    TrendController.prototype.update = function() {
        var self = this;
        this._configModel.filterGroupRecords(function(obj) {
            var units = self._configModel.selected().weightField.units;
            self._informationView.render('update', {units: units, data: obj.data, count: obj.count});
            self._menuView.render('updateBackground', obj);

            // Subset the data to not shown series that don't meet minimum
            // area threshold
            obj.data = self.removeMinimumSeries(obj.data, self._configModel.minimumAreaThreshold());
            self._chartView.update(self._configModel, obj.data);
            self._data = obj.data;
        });
    };

    /**
     * Respond to resizing of browser window
     */
    TrendController.prototype.resize = function() {
        var self = this;
        var width = parseInt(d3.select('#chart').style('width'), 10);
        d3.select('#chart svg').attr('width', width);
        self._chartView.width(width).update(self._configModel, self._data);
    };

    /**
     * Remove data series with weights that don't meet minimum thresholds.  This
     * is run subsequent to retrieving the data from the configModel and before
     * sending it to the views for rendering
     * @param {Array} data - Series data for which minimum thresholds are determined
     * @param {float} threshold - Minimum weight threshold for inclusion
     * @returns {*}
     */
    TrendController.prototype.removeMinimumSeries = function(data, threshold) {
        var removeList = [];
        _.forEach(data, function(d, i) {
            if (d.minWeight < threshold) {
                removeList.push(i);
            }
        });
        _.pullAt(data, removeList);
        return data;
    };

    window.app = window.app || {};
    window.app.TrendController = TrendController;
}(window));
