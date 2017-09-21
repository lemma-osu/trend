/* globals $, _ */
(function (window) {
    'use strict';

    function SeriesModalView(template) {
        this.template = template;
        this._modal = null;
        this._dropdown = null;
    }

    SeriesModalView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            initialize: function () {
                var dropdownItems = self.buildDropdownItems(parameter);
                var config = {
                    modalId: 'series-modal',
                    header: 'Series',
                    dropdownId: 'series-dropdown',
                    dropdownItems: dropdownItems,
                    multiple: false,
                    defaultText: 'None'
                };
                self._modal = $(self.template.render(config));

                // Activate the dropdown
                self._dropdown = $(self._modal).find('.ui.dropdown');
                self._dropdown.dropdown();

                // Activate the modal menu
                self._modal.modal({
                    autofocus: false
                });
            },
            show: function () {
                self._modal.modal('show');
            }
        };
        viewCommands[viewCmd]();
    };

    SeriesModalView.prototype.buildDropdownItems = function(strata) {
        return _.map(strata, function(s) {
            return { type: 'item', key: s.key, alias: s.alias };
        });
    };

    SeriesModalView.prototype.getSelectedValue = function() {
        return this._dropdown.dropdown('get text');
    };

    window.app = window.app || {};
    window.app.SeriesModalView = SeriesModalView;
}(window));
