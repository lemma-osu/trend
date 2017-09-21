(function (window) {
    'use strict';

    function SeriesTemplate() {
        this.defaultTemplate = '{{title}}';
    }

    SeriesTemplate.prototype.show = function (data) {
        var view = this.defaultTemplate;
        return view.replace(/{{title}}/g, data.seriesField.alias);
    };

    // Export to window
    window.app = window.app || {};
    window.app.SeriesTemplate = SeriesTemplate;
})(window);
