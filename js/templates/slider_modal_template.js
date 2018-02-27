(function (window) {
    'use strict';

    /**
     * Class to provide template for Semantic UI slider
     * @constructor
     */
    function SliderTemplate() {
        this.defaultTemplate =
            '<div class="sixteen wide column">' +
            '  <div id="range">Range: {{rangeMin}} - {{rangeMax}}</div>' +
            '  <div id="{{sliderId}}"></div>' +
            '</div>';
    }

    /**
     * Render slider based on input
     * @param {string} sliderId - ID of the slider
     * @param {Array} range - Minimum/maximum values for slider
     * @returns {string}
     */
    SliderTemplate.prototype.render = function(sliderId, range) {
        var rangeMin = range[0];
        var rangeMax = range[1];
        var sliderHtml = this.defaultTemplate;
        sliderHtml = sliderHtml.replace(/{{sliderId}}/g, sliderId);
        sliderHtml = sliderHtml.replace(/{{rangeMin}}/g, rangeMin);
        return sliderHtml.replace(/{{rangeMax}}/g, rangeMax);
    };

    /**
     * Class to provide template for Semantic UI slider modal dialog
     * @constructor
     */
    function SliderModalTemplate() {
        this.defaultTemplate =
            '<div id="{{id}}" class="ui modal grid">' +
            '  <div class="header">{{header}}</div>' +
            '  {{slider}}' +
            '  <div class="actions">' +
            '    <div class="ui positive button">OK</div>' +
            '    <div class="ui cancel button">Cancel</div>' +
            '  </div>' +
            '</div>';
    }

    /**
     * Render slider modal dialog based on input
     * @param data
     * @returns {string|*}
     */
    SliderModalTemplate.prototype.render = function (data) {
        var view = this.defaultTemplate;

        var st = new SliderTemplate();
        var sliderHtml = st.render(data.sliderId, data.limits);

        // Build the rest of the modal dialog
        view = view.replace(/{{id}}/g, data.modalId);
        view = view.replace(/{{header}}/g, data.header);
        view = view.replace(/{{slider}}/g, sliderHtml);

        return view;
    };

    // Export to window
    window.app = window.app || {};
    window.app.SliderModalTemplate = SliderModalTemplate;
})(window);
