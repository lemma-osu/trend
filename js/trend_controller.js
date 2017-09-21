(function (window) {
    'use strict';
    function TrendController(configModel, menuView, chartView) {
        var self = this;
        self.configModel = configModel;
        self.menuView = menuView;
        self.chartView = chartView;

        self.menuView.bind('stratum-link-click', function(obj) {
            self.menuView.render('stratumModalShow', obj);
        });
        self.menuView.bind('stratum-modal-select-all', function(obj) {
            self.menuView.render('stratumModalUpdateDropdown', obj);
        });
        self.menuView.bind('stratum-modal-select-none', function(obj) {
            self.menuView.render('stratumModalUpdateDropdown', obj);
        });
        self.menuView.bind('stratum-modal-approve', function(obj) {
            self.menuView.render('stratumUpdateList', obj);
            // update;
        });
        self.menuView.bind('series-link-click', function() {
            self.menuView.render('seriesModalShow');
        });
        self.menuView.bind('series-modal-approve', function(obj) {
            self.menuView.render('seriesUpdate', obj);
            // update;
        });
        self.menuView.bind('time-link-click', function() {
            self.menuView.render('timeModalShow');
        });
        self.menuView.bind('time-slider-change', function(obj) {
            self.menuView.render('timeModalUpdate', obj);
        });
        self.menuView.bind('time-modal-approve', function(obj) {
            self.menuView.render('timeUpdate', obj);
            // update;
        });
        self.menuView.bind('variable-link-click', function() {
            self.menuView.render('variableModalShow');
        });
        self.menuView.bind('variable-modal-approve', function(obj) {
            self.menuView.render('variableUpdate', obj);
            // update;
        });
    }

    TrendController.prototype.initialize = function () {
        var self = this;
        self.configModel.initialize(function(config) {
            self.menuView.render('initializeMenu', config);
        });
    };

    window.app = window.app || {};
    window.app.TrendController = TrendController;
}(window));
