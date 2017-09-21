/* globals $, qs */
(function (window) {
    'use strict';

    function VariableView(template) {
        this.template = template;
        this.$parentContainer = qs('#variable-link');
    }

    VariableView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            show: function () {
                self.$parentContainer.innerHTML = self.template.show(parameter);
            },
            update: function () {
                $('#variable-link').text(parameter.variable);
            }
        };
        viewCommands[viewCmd]();
    };

    window.app = window.app || {};
    window.app.VariableView = VariableView;
}(window));
