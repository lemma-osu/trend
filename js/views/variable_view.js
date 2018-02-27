/* globals $, qs */
(function (window) {
    'use strict';

    /**
     * View to render the currently selected variable in the main menu
     * @param template
     * @constructor
     */
    function VariableView(template) {
        this.template = template;
        this.$parentContainer = qs('#variable-link');
    }

    /**
     * Render the currently selected variable
     * @param {string} viewCmd - Command to fire
     * @param {Object} parameter - Data that holds the currently selected series
     */
    VariableView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            show: function () {
                self.$parentContainer.innerHTML = self.template.show(parameter);
            },
            update: function () {
                $('#variable-link').text(parameter);
            }
        };
        viewCommands[viewCmd]();
    };

    window.app = window.app || {};
    window.app.VariableView = VariableView;
}(window));
