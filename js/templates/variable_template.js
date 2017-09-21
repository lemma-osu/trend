(function (window) {
    'use strict';

    function VariableTemplate() {
        this.defaultTemplate = '{{title}}';
    }

    VariableTemplate.prototype.show = function (data) {
        var view = this.defaultTemplate;
        return view.replace(/{{title}}/g, data.variableField.alias);
    };

    // Export to window
    window.app = window.app || {};
    window.app.VariableTemplate = VariableTemplate;
})(window);
