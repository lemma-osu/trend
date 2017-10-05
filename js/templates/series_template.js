(function (window) {
    'use strict';

    /**
     * Class to provide template for SeriesView
     * @constructor
     */
    function SeriesTemplate() {
        this.defaultTemplate = '{{title}}';
    }

    /**
     * Render series based on data
     * @param {Object} data
     * @returns {string}
     */
    SeriesTemplate.prototype.show = function (data) {
        var view = this.defaultTemplate;
        return view.replace(/{{title}}/g, data.seriesField.alias);
    };

    // Export to window
    window.app = window.app || {};
    window.app.SeriesTemplate = SeriesTemplate;
})(window);
