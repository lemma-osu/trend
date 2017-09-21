/* globals _ */
(function (window) {
    'use strict';

    function DropdownTemplate() {
        this.defaultTemplate = 
            '<div class="sixteen wide column">' + 
            '  <div id="{{id}}" class="{{classes}}">' +
            '    <input type="hidden" name="value" />' +
            '    <i class="dropdown icon"></i>' +
            '    <div class="default text">{{defaultText}}</div>' +
            '    <div class="menu">{{dropdown}}</div>' +
            '  </div>' +
            '</div>';

        this.itemTemplate =
            '<div class="item" data-value="{{key}}">{{alias}}</div>';

        this.headerTemplate =
            '<div class="header">{{key}}</div>';

        this.dividerTemplate = 
            '<div class="divider"></div>';
    }

    DropdownTemplate.prototype.render = function(id, items, multiple, defaultText) {
        var self = this;
        var dropdownHtml = this.defaultTemplate;
        var classes = multiple ?
            'ui fluid multiple search selection dropdown' :
            'ui fluid search selection dropdown';
        dropdownHtml = dropdownHtml.replace(/{{id}}/g, id);
        dropdownHtml = dropdownHtml.replace(/{{classes}}/g, classes);
        dropdownHtml = dropdownHtml.replace(/{{defaultText}}/g, defaultText);

        var innerHtml = '';
        var itemHtml;
        _.forEach(items, function (item) {
            switch (item.type) {
                case 'group':
                case 'item':
                    itemHtml = self.itemTemplate;
                    itemHtml = itemHtml.replace(/{{key}}/g, item.key);
                    itemHtml = itemHtml.replace(/{{alias}}/g, item.alias);
                    break;
                case 'header':
                    itemHtml = self.headerTemplate;
                    itemHtml = itemHtml.replace(/{{key}}/g, item.key);
                    break;
                case 'divider':
                    itemHtml = self.dividerTemplate;
                    break;
                default:
                    var msg = 'Unknown dropdown item type';
                    throw Error(msg);
            }
            innerHtml += itemHtml;
        });
        return dropdownHtml.replace(/{{dropdown}}/g, innerHtml);
    };

    function DropdownModalTemplate() {
        this.defaultTemplate =
            '<div id="{{id}}" class="ui modal grid">' +
            '  <div class="header">{{header}}{{selectTools}}</div>' +
            '  {{dropdown}}' +
            '  <div class="actions">' +
            '    <div class="ui positive button">OK</div>' +
            '    <div class="ui cancel button">Cancel</div>' +
            '  </div>' +
            '</div>';

        this.selectToolsTemplate =
            '<span class="select-tools">' +
            '  <i title="Select All" class="select-all square icon"></i>' +
            '  <i title="Select None" class="select-none square outline icon"></i>' +
            '</span>';
    }

    DropdownModalTemplate.prototype.render = function (data) {
        var view = this.defaultTemplate;

        var selectTools = data.multiple ? this.selectToolsTemplate : '';
        var dt = new DropdownTemplate();
        var dropdownHtml = dt.render(
            data.dropdownId, data.dropdownItems, data.multiple, data.defaultText);

        // Build the rest of the modal dialog
        view = view.replace(/{{id}}/g, data.modalId);
        view = view.replace(/{{header}}/g, data.header);
        view = view.replace(/{{selectTools}}/g, selectTools);
        view = view.replace(/{{dropdown}}/g, dropdownHtml);

        return view;
    };

    // Export to window
    window.app = window.app || {};
    window.app.DropdownModalTemplate = DropdownModalTemplate;
})(window);
