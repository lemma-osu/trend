(function (window) {
    'use strict';

    function TimeTemplate() {
        this.defaultTemplate = '{{title}}';
    }

    TimeTemplate.prototype.show = function (data) {
        var view = this.defaultTemplate;
        var timeStr = data.minTime + ' - ' + data.maxTime;
        return view.replace(/{{title}}/g, timeStr);
    };

    // Export to window
    window.app = window.app || {};
    window.app.TimeTemplate = TimeTemplate;
})(window);
