(function (window) {
    'use strict';

    /**
     * Class to provide template for TimeView
     * @constructor
     */
    function TimeTemplate() {
        this.defaultTemplate = '{{title}}';
    }

    /**
     * Render time based on data
     * @param {Object} data
     * @returns {string}
     */
    TimeTemplate.prototype.show = function (data) {
        var view = this.defaultTemplate;
        var timeStr = data.minTime + ' - ' + data.maxTime;
        return view.replace(/{{title}}/g, timeStr);
    };

    // Export to window
    window.app = window.app || {};
    window.app.TimeTemplate = TimeTemplate;
})(window);
