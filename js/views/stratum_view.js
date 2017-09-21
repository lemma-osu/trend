/* globals $, _ */
(function (window) {
    'use strict';

    function StratumView(template) {
        this.template = template;
        this._parent = $('#strata-container');
        this._root = null;
        this._list = null;
    }

    StratumView.prototype.render = function(viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            show: function () {
                self._root = $(self.template.show(parameter));
                self._parent.append(self._root);
                self._list = $(self._root).find('ul');
            },
            updateList: function() {
                self._list.find('li').remove();
                _.forEach(parameter.items, function(item) {
                    var el = $('<li>').text(item);
                    el.appendTo(self._list);
                });
            }
        };
        viewCommands[viewCmd]();
    };

    window.app = window.app || {};
    window.app.StratumView = StratumView;
}(window));
