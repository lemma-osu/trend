/* globals $ */
(function (window) {
    'use strict';

    /**
     * View to render a modal dialog for selecting current time range
     * @param template - Template to use to populate modal dialog
     * @constructor
     */
    function TimeModalView(template) {
        this.template = template;
        this._modal = null;
        this._slider = null;
    }

    /**
     * Render the modal slider dialog based on the data passed
     * @param viewCmd
     * @param parameter
     */
    TimeModalView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            initialize: function () {
                var config = {
                    modalId: 'time-modal',
                    header: 'Time Range',
                    sliderId: 'time-slider',
                    limits: [parameter.minTime,  parameter.maxTime]
                };
                self._modal = $(self.template.render(config));

                // Activate the slider
                self._slider = $(self._modal).find('#time-slider');
                self._slider.slider({
                    range: true,
                    min: parameter.minTime,
                    max: parameter.maxTime,
                    values: [ parameter.minTime, parameter.maxTime ]
                });

                // Activate the modal menu
                self._modal.modal({
                    autofocus: false
                });
            },
            show: function () {
                self._modal.modal('show');
            },
            updateRangeText: function () {
                var rangeStr = parameter.ui.values[0] + " - " + parameter.ui.values[1];
                $('#range').text("Range: " + rangeStr);
            }
        };
        viewCommands[viewCmd]();
    };

    /**
     * Get selected time range from modal dialog
     */
    TimeModalView.prototype.getTimeRange = function() {
        return this._slider.slider('values');
    };

    window.app = window.app || {};
    window.app.TimeModalView = TimeModalView;
}(window));
