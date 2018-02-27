/* globals $, _ */
(function (window) {
    'use strict';

    /**
     * View to render a modal dialog for selecting current series
     * @param template - Template to use to populate modal dialog
     * @constructor
     */
    function SeriesModalView(template) {
        this.template = template;
        this._modal = null;
        this._dropdown = null;
    }

    /**
     * Render the dropdown modal view based on the data passed
     * @param viewCmd
     * @param parameter
     */
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

    /**
     * Build dropdown items based on the configuration strata
     * @param strata
     * @returns {Array}
     */
    SeriesModalView.prototype.buildDropdownItems = function(strata) {
        return _.map(strata, function(s) {
            return { type: 'item', key: s.key, alias: s.alias };
        });
    };

    /**
     * Retrieve selected values from the modal dialog
     * @returns {*}
     */
    SeriesModalView.prototype.getSelectedValue = function() {
        return this._dropdown.dropdown('get value');
    };

    window.app = window.app || {};
    window.app.SeriesModalView = SeriesModalView;
}(window));
