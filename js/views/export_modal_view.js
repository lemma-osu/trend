/* globals _, $ */
(function (window) {
    'use strict';

    /**
     * View to render a modal dialog for exporting data
     * @param template
     */
    function ExportModalView(template) {
        this.template = template;
        this._modal = null;
        this._input = null;
    }

    /**
     * Render the dialog modal view based on the data passed
     * @param viewCmd
     * @param parameter
     */
    ExportModalView.prototype.render = function (viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            initialize: function () {
                var config = {
                    modalId: 'export-modal',
                    inputId: 'export-id',
                    header: 'Export to CSV',
                    label: 'Enter output filename',
                };
                self._modal = $(self.template.render(config));
                self._input = '#' + config.inputId + ' input';

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
     * Retrieve selected values from the modal dialog
     * @returns {*}
     */
    ExportModalView.prototype.getFilename = function() {
        return $(this._input).val();
    };

    window.app = window.app || {};
    window.app.ExportModalView = ExportModalView;
}(window));
