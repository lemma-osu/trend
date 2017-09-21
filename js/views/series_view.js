/* globals $, qs */
(function (window) {
    'use strict';

    function SeriesView(template) {
        this.template = template;
        this.$parentContainer = qs('#series-link');
    }

    SeriesView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            show: function () {
                self.$parentContainer.innerHTML = self.template.show(parameter);
            },
            update: function () {
                $('#series-link').text(parameter.series);
            }

        };
        viewCommands[viewCmd]();
    };

    window.app = window.app || {};
    window.app.SeriesView = SeriesView;
}(window));
