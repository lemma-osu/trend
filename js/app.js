/* global app, $ */
(function () {
    'use strict';

    function Trend() {
        this.dataStore = new app.DataStore();
        this.dataModel = new app.DataModel(this.dataStore);
        this.configModel = new app.ConfigurationModel(this.dataModel);
        this.menuView = new app.MenuView();
        this.chartView = new app.ChartView();
        this.controller = new app.TrendController(
            this.configModel, this.menuView, this.chartView);
    }

    var trend = new Trend();

    function toJSON(obj) {
        console.log(JSON.stringify(obj, undefined, 2));
    }

    function setView() {
        var jsonFn = window.getJSONFilename(document.URL);
        trend.configModel.load(jsonFn, function(configData) {
            trend.dataStore.load(configData.fn, function(trendData) {
                trend.controller.initialize(toJSON);
            });
        });
    }

    $(document).ready(function() {
        // $('#main-container').hide();
        $('.ui.error.message').parents('.row').hide();
        setView();
    });
})();
