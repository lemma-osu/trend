/* globals $, qs */
(function (window) {
    'use strict';

    /**
     * View to render the currently selected series in the main menu
     * @param template
     * @constructor
     */
    function SeriesView(template) {
        this.template = template;
        this.$parentContainer = qs('#series-link');
    }

    /**
     * Render the currently selected series
     * @param {string} viewCmd - Command to fire
     * @param {Object} parameter - Data that holds the currently selected series
     */
    SeriesView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            show: function () {
                self.$parentContainer.innerHTML = self.template.show(parameter);
            },
            update: function () {
                $('#series-link').text(parameter);
            }

        };
        viewCommands[viewCmd]();
    };

    window.app = window.app || {};
    window.app.SeriesView = SeriesView;
}(window));
