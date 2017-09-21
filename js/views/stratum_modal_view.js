/* globals _, $ */
(function (window) {
    'use strict';

    function StratumModalView(template) {
        this.template = template;
        this._modal = null;
        this._dropdown = null;
    }

    StratumModalView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            initialize: function () {
                var dropdownItems = self.buildDropdownItems(parameter.stratum);
                var config = {
                    modalId: 'stratum-' + parameter.id + '-modal',
                    header: parameter.stratum.alias,
                    dropdownId: parameter.stratum.key,
                    dropdownItems: dropdownItems,
                    multiple: true,
                    defaultText: 'All'
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
            },
            updateDropdown: function() {
                self._dropdown.dropdown('set exactly', parameter.values);
            }
        };
        viewCommands[viewCmd]();
    };

    StratumModalView.prototype.buildDropdownItems = function (stratum) {
        var dropdownItems = [];
        var groups = _.filter(stratum.categories, function (g) {
            return g.type === 'group';
        });
        if (groups.length) {
            dropdownItems.push({type: 'header', key: 'Groups'});
            dropdownItems = dropdownItems.concat(_.map(groups, function (g) {
                return {type: 'group', key: g.key, alias: g.key + ': ' + g.alias};
            }));
            dropdownItems.push({type: 'divider'});
        }
        dropdownItems.push({type: 'header', key: 'Items'});
        var items = _.filter(stratum.categories, function (c) {
            return c.type === 'item';
        });
        return dropdownItems.concat(_.map(items, function (c) {
            return {type: 'item', key: c.key, alias: c.key + ': ' + c.alias};
        }));
    };

    StratumModalView.prototype.getSelectedDropdownValues = function() {
        // Return an array of sorted values
        var values = this._dropdown.dropdown('get value');
        return _.sortBy(values.split(","), function (x) { return x; });
    };

    StratumModalView.prototype.getAllDropdownValues = function() {
        var values = $(this._dropdown).find('.menu .item');
        return values.map(function () {
            return $(this).attr('data-value');
        }).get();
    };

    StratumModalView.prototype.areAllSelected = function() {
        var selected = this.getSelectedDropdownValues();
        var all = this.getAllDropdownValues();
        if (selected.length === 0 || selected[0] === '')
            return true;
        else if (_.isEqual(all.sort(), selected.sort()))
            return true;
        return false;
    };

    window.app = window.app || {};
    window.app.StratumModalView = StratumModalView;
}(window));
