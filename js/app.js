/* global app, $ */
(function () {
    'use strict';

    /**
     * Main application class for trend tool
     * @constructor
     */
    function TrendApplication() {
        this.dataStore = new app.DataStore();
        this.dataModel = new app.DataModel(this.dataStore);
        this.configModel = new app.ConfigurationModel(this.dataModel);
        this.menuView = new app.MenuView();
        this.informationView = new app.InformationView();
        this.oloffsonView = new app.OlofssonView();
        this.chartView = new app.ChartView();
        this.controller = new app.TrendController(
            this.configModel, this.menuView, this.informationView, this.oloffsonView,
            this.chartView);
    }
    var trend = new TrendApplication();

    /**
     * Initialize the application by reading in the JSON URL and its
     * corresponding data
     */
    function initializeApplication() {
        var jsonFn = window.getJSONFilename(document.URL);
        $.getJSON(jsonFn, function(config) {
            trend.dataStore.load(config.fn, function() {
                $('#main-container').fadeIn(500, function() {
                    initDocumentation();
                    trend.controller.initialize(config, function() {
                        trend.controller.update();
                    });
                });
            });
        });
    }

    $(document).ready(function() {
        $('#main-container').hide();
        $('.ui.error.message').parents('.row').hide();
        $('.ui.success.message').parents('.row').hide();
        initializeApplication();
    });
})();
