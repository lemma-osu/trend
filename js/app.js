/* global app, $ */
(function () {
    'use strict';

    /**
     * Main application class for trend tool
     * @constructor
     */
    function TrendApplication() {
        this._dataStore = new app.DataStore();
        this._dataModel = new app.DataModel(this._dataStore);
        this._configModel = new app.ConfigurationModel(this._dataModel);
        this._menuView = new app.MenuView();
        this._informationView = new app.InformationView();
        this._chartView = new app.ChartView();
        this._controller = new app.TrendController(
            this._configModel, this._menuView, this._informationView, this._chartView);
    }
    var trend = new TrendApplication();

    /**
     * Initialize the application by reading in the JSON URL and its
     * corresponding data
     */
    function initializeApplication() {
        var jsonFn = window.getJSONFilename(document.URL);
        $.getJSON(jsonFn, function(config) {
            trend._dataStore.load(config.fn, function() {
                trend._controller.initialize(config);
            });
        });
    }

    $(document).ready(function() {
        // $('#main-container').hide();
        $('.ui.error.message').parents('.row').hide();
        initializeApplication();
    });
})();
