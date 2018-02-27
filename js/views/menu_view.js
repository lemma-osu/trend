/* globals _, $, qs */
(function (window) {
    'use strict';

    /**
     * Composite container to hold all menu items
     * @constructor
     */
    function MenuView() {
        this.seriesView = new window.app.SeriesView(new window.app.SeriesTemplate());
        this.seriesModalView = new window.app.SeriesModalView(new window.app.DropdownModalTemplate());
        this.timeView = new window.app.TimeView(new window.app.TimeTemplate());
        this.timeModalView = new window.app.TimeModalView(new window.app.SliderModalTemplate());
        this.variableView = new window.app.VariableView(new window.app.VariableTemplate());
        this.variableModalView = new window.app.VariableModalView(new window.app.DropdownModalTemplate());
        this.exportModalView = new window.app.ExportModalView(new window.app.DialogModalTemplate());
        this.stratumViews = [];
        this.stratumModalViews = [];
        this.$menuParameters = qs('#parameters');
        this.$body = qs('body');
    }

    /**
     * Render individual menu elements.  This is just a switchyard and individual
     * rendering is handled by the components
     * @param {string} viewCmd - Rendering command to run
     * @param {Object} parameter - Required data for rendering
     */
    MenuView.prototype.render = function(viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            initializeMenu: function() {
                _.forEach(parameter.strataFields, function(sf, i) {
                    var sv = new window.app.StratumView(new window.app.StratumTemplate());
                    sv.render('show', {stratum: sf, index: i});
                    self.stratumViews.push(sv);

                    var mv = new window.app.StratumModalView(new window.app.DropdownModalTemplate());
                    mv.render('initialize', {stratum: sf, id: i});
                    self.stratumModalViews.push(mv);
                });
                self.seriesView.render('show', parameter.selected);
                self.seriesModalView.render('initialize', parameter.strataFields);

                self.timeView.render('show', parameter.selected);
                self.timeModalView.render('initialize', parameter.selected);

                self.variableView.render('show', parameter.selected);
                self.variableModalView.render('initialize', parameter.variableFields);

                self.exportModalView.render('initialize');
            },
            stratumModalShow: function() {
                var mv = self.stratumModalViews[parameter.index];
                mv.render('show');
            },
            stratumModalUpdateDropdown: function() {
                var mv = self.stratumModalViews[parameter.index];
                mv.render('updateDropdown', parameter);
            },
            stratumUpdateList: function() {
                var sv = self.stratumViews[parameter.index];
                sv.render('updateList', parameter);
            },
            seriesModalShow: function() {
                self.seriesModalView.render('show');
            },
            seriesUpdate: function() {
                self.seriesView.render('update', parameter);
            },
            timeModalShow: function() {
                self.timeModalView.render('show');
            },
            timeModalUpdate: function() {
                self.timeModalView.render('updateRangeText', parameter);
            },
            timeUpdate: function() {
                self.timeView.render('update', parameter);
            },
            variableModalShow: function() {
                self.variableModalView.render('show');
            },
            variableUpdate: function() {
                self.variableView.render('update', parameter);
            },
            exportModalShow: function() {
                self.exportModalView.render('show');
            },
            updateBackground: function() {
                var div = $(self.$menuParameters);
                if (parameter.count === 0) {
                    div.attr({'class': 'ui negative message'});
                } else {
                    div.attr({'class': 'ui info message'});
                }
            }
        };
        viewCommands[viewCmd]();
    };

    /**
     * Bind menu events and pass along to defined handler
     * @param event
     * @param handler
     */
    MenuView.prototype.bind = function(event, handler) {
        var self = this;
        if (event === 'stratum-link-click') {
            $(self.$menuParameters).on('click', '#strata-container .modal-link', function() {
                var stratumIndex = self._stratumIndex(this);
                handler({index: stratumIndex});
            });
        } else if (event === 'series-link-click') {
            $(self.$menuParameters).on('click', '#series-link', function() {
                handler();
            });
        } else if (event === 'time-link-click') {
            $(self.$menuParameters).on('click', '#time-link', function() {
                handler();
            });
        } else if (event === 'variable-link-click') {
            $(self.$menuParameters).on('click', '#variable-link', function() {
                handler();
            });
        } else if (event === 'export-link-click') {
            $(self.$menuParameters).on('click', '#export-link', function() {
                handler();
            });
        } else if (event === 'stratum-modal-select-all') {
            $(self.$body).on('click', 'div[id^=stratum] .select-all', function() {
                var modalIndex = self._modalIndex(this);
                var values = self.stratumModalViews[modalIndex].getAllDropdownValues();
                handler({index: modalIndex, values: values});
            });
        } else if (event === 'stratum-modal-select-none') {
            $(self.$body).on('click', 'div[id^=stratum] .select-none', function() {
                handler({index: self._modalIndex(this), values: []});
            });
        } else if (event === 'stratum-modal-approve') {
            $(self.$body).on('click', 'div[id^=stratum] .ui.positive', function() {
                var modalIndex = self._modalIndex(this);
                var mv = self.stratumModalViews[modalIndex];
                var items = mv.areAllSelected() ? ['All'] : mv.getSelectedDropdownValues();
                handler({index: modalIndex, items: items});
            });
        } else if (event === 'time-slider-change') {
            $(self.$body).on('slide', '#time-slider', function(event, ui) {
                handler({event: event, ui: ui});
            });
        } else if (event === 'time-modal-approve') {
            $(self.$body).on('click', 'div[id^=time] .ui.positive', function() {
                var timeRange = self.timeModalView.getTimeRange();
                handler({timeRange: timeRange});
            });
        } else if (event === 'series-modal-approve') {
            $(self.$body).on('click', 'div[id^=series] .ui.positive', function() {
                var selected = self.seriesModalView.getSelectedValue();
                handler({series: selected});
            });
        } else if (event === 'variable-modal-approve') {
            $(self.$body).on('click', 'div[id^=variable] .ui.positive', function() {
                var selected = self.variableModalView.getSelectedValue();
                handler({variable: selected});
            });
        } else if (event === 'export-modal-approve') {
            $(self.$body).on('click', 'div[id^=export] .ui.positive', function() {
                var filename = self.exportModalView.getFilename();
                handler({filename: filename});
            })
        }
    };

    /**
     * Return the index of the modal dialog
     * @param element
     * @returns {Number}
     * @private
     */
    MenuView.prototype._modalIndex = function (element) {
        var modalID =  $(element).closest('div.ui.modal').attr('id');
        return parseInt(modalID.split('-')[1], 10);
    };

    /**
     * Return the index associated with the stratum
     * @param element
     * @returns {Number}
     * @private
     */
    MenuView.prototype._stratumIndex = function (element) {
        var stratumID =  $(element).closest('div.column').attr('id');
        return parseInt(stratumID.split('-')[1], 10);
    };

    window.app = window.app || {};
    window.app.MenuView = MenuView;
}(window));
