(function (window) {
    'use strict';

    /**
     * Class to provide template for Semantic UI slider
     * @constructor
     */
    function DialogTemplate() {
        this.defaultTemplate =
            '<div class="sixteen wide column">' +
            '  <div id="{{inputId}}" class="ui labeled fluid input">' +
            '    <div class="ui label">{{label}}</div>' +
            '    <input type="text"}</input>' +
            '  </div>' +
            '</div>';
    }

    /**
     * Render slider based on input
     * @param {string} inputId - ID of the dialog input tag
     * @param {string} label - Label for the dialog box
     * @returns {string}
     */
    DialogTemplate.prototype.render = function(inputId, label) {
        var dialogHtml = this.defaultTemplate;
        dialogHtml = dialogHtml.replace(/{{inputId}}/g, inputId);
        return dialogHtml.replace(/{{label}}/g, label);
    };

    /**
     * Class to provide template for Semantic UI slider modal dialog
     */
    function DialogModalTemplate() {
        this.defaultTemplate =
            '<div id="{{id}}" class="ui modal grid">' +
            '  <div class="header">{{header}}</div>' +
            '  {{dialog}}' +
            '  <div class="actions">' +
            '    <div class="ui positive button">OK</div>' +
            '    <div class="ui cancel button">Cancel</div>' +
            '  </div>' +
            '</div>';
    }

    /**
     * Render slider modal dialog based on input
     * @param data
     * @returns {string|*}
     */
    DialogModalTemplate.prototype.render = function (data) {
        var view = this.defaultTemplate;

        var dt = new DialogTemplate();
        var dialogHtml = dt.render(data.inputId, data.label);

        // Build the rest of the modal dialog
        view = view.replace(/{{id}}/g, data.modalId);
        view = view.replace(/{{header}}/g, data.header);
        view = view.replace(/{{dialog}}/g, dialogHtml);

        return view;
    };

    // Export to window
    window.app = window.app || {};
    window.app.DialogModalTemplate = DialogModalTemplate;
})(window);
