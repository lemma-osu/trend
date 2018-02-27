(function (window) {
    'use strict';

    /**
     * Class to provide template for VariableView
     * @constructor
     */
    function VariableTemplate() {
        this.defaultTemplate = '{{title}}';
    }

    /**
     * Render variable based on data
     * @param {Object} data
     * @returns {string}
     */
    VariableTemplate.prototype.show = function (data) {
        var view = this.defaultTemplate;
        return view.replace(/{{title}}/g, data.variableField.alias);
    };

    // Export to window
    window.app = window.app || {};
    window.app.VariableTemplate = VariableTemplate;
})(window);
