/* globals $, qs */
(function (window) {
    'use strict';

    function TimeView(template) {
        this.template = template;
        this.$parentContainer = qs('#time-link');
    }

    TimeView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            show: function () {
                self.$parentContainer.innerHTML = self.template.show(parameter);
            },
            update: function () {
                var rangeStr = parameter.timeRange[0] + " - " + parameter.timeRange[1];
                $('#time-link').text(rangeStr);
            }
        };
        viewCommands[viewCmd]();
    };

    window.app = window.app || {};
    window.app.TimeView = TimeView;
}(window));
