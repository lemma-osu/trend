/* globals _, $ */
(function (window) {
    'use strict';

    function VariableModalView(template) {
        this.template = template;
        this._modal = null;
        this._dropdown = null;
    }

    VariableModalView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            initialize: function () {
                var dropdownItems = self.buildDropdownItems(parameter);
                var config = {
                    modalId: 'variable-modal',
                    header: 'Variable',
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

    VariableModalView.prototype.buildDropdownItems = function(selected) {
        return _.map(selected, function(s) {
            return { type: 'item', key: s.key, alias: s.alias };
        });
    };

    VariableModalView.prototype.getSelectedValue = function() {
        return this._dropdown.dropdown('get text');
    };

    window.app = window.app || {};
    window.app.VariableModalView = VariableModalView;
}(window));
