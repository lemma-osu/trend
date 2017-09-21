/* globals _, $, qs */
(function (window) {
    'use strict';

    function MenuView() {
        this.seriesView = new window.app.SeriesView(new window.app.SeriesTemplate());
        this.seriesModalView = new window.app.SeriesModalView(new window.app.DropdownModalTemplate());
        this.timeView = new window.app.TimeView(new window.app.TimeTemplate());
        this.timeModalView = new window.app.TimeModalView(new window.app.SliderModalTemplate());
        this.variableView = new window.app.VariableView(new window.app.VariableTemplate());
        this.variableModalView = new window.app.VariableModalView(new window.app.DropdownModalTemplate());
        this.stratumViews = [];
        this.stratumModalViews = [];
        this.$menuParameters = qs('#parameters');
        this.$body = qs('body');
    }

    MenuView.prototype.render = function(viewCmd, parameter) {
        var self = this;
        var viewCommands = {
            initializeMenu: function() {
                _.forEach(parameter.strata, function(s, i) {
                    var sv = new window.app.StratumView(new window.app.StratumTemplate());
                    sv.render('show', {stratum: s, index: i});
                    self.stratumViews.push(sv);

                    var mv = new window.app.StratumModalView(new window.app.DropdownModalTemplate());
                    mv.render('initialize', {stratum: s, id: i});
                    self.stratumModalViews.push(mv);
                });
                self.seriesView.render('show', parameter.selected);
                self.seriesModalView.render('initialize', parameter.strata);

                self.timeView.render('show', parameter.selected);
                self.timeModalView.render('initialize', parameter.selected);

                self.variableView.render('show', parameter.selected);
                self.variableModalView.render('initialize', parameter.variables);
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
            }
        };
        viewCommands[viewCmd]();
    };

    MenuView.prototype.bind = function(event, handler) {
        var self = this;
        if (event === 'stratum-link-click') {
            // $delegate(self.$menuParameters, '#strata-container .modal-link', 'click', function () {
            $(self.$menuParameters).on('click', '#strata-container .modal-link', function() {
                var stratumIndex = self._stratumIndex(this);
                handler({index: stratumIndex});
            });
        } else if (event === 'series-link-click') {
            // $delegate(self.$menuParameters, '#series-link', 'click', function () {
            $(self.$menuParameters).on('click', '#series-link', function() {
                handler();
            });
        } else if (event === 'time-link-click') {
            // $delegate(self.$menuParameters, '#time-link', 'click', function () {
            $(self.$menuParameters).on('click', '#time-link', function() {
                handler();
            });
        } else if (event === 'variable-link-click') {
            // $delegate(self.$menuParameters, '#variable-link', 'click', function () {
            $(self.$menuParameters).on('click', '#variable-link', function() {
                handler();
            });
        } else if (event === 'stratum-modal-select-all') {
            //$delegate(self.$body, 'div[id^=stratum] .select-all', 'click', function() {
            $(self.$body).on('click', 'div[id^=stratum] .select-all', function() {
                var modalIndex = self._modalIndex(this);
                var values = self.stratumModalViews[modalIndex].getAllDropdownValues();
                handler({index: modalIndex, values: values});
            });
        } else if (event === 'stratum-modal-select-none') {
            // $delegate(self.$body, 'div[id^=stratum] .select-none', 'click', function() {
            $(self.$body).on('click', 'div[id^=stratum] .select-none', function() {
                handler({index: self._modalIndex(this), values: []});
            });
        } else if (event === 'stratum-modal-approve') {
            // $delegate(self.$body, 'div[id^=stratum] .ui.positive', 'click', function() {
            $(self.$body).on('click', 'div[id^=stratum] .ui.positive', function() {
                var modalIndex = self._modalIndex(this);
                var mv = self.stratumModalViews[modalIndex];
                var items = mv.areAllSelected() ? ['All'] : mv.getSelectedDropdownValues();
                handler({index: modalIndex, items: items});
            });
        } else if (event === 'time-slider-change') {
            // $delegate(self.$body, '#time-slider', 'slide', function () {
            $(self.$body).on('slide', '#time-slider', function(event, ui) {
                handler({event: event, ui: ui});
            });
        } else if (event === 'time-modal-approve') {
            // $delegate(self.$body, '#time-slider', 'stop', function () {
            $(self.$body).on('click', 'div[id^=time] .ui.positive', function() {
                var timeRange = self.timeModalView.getTimeRange();
                handler({timeRange: timeRange});
            });
        } else if (event === 'series-modal-approve') {
            // $delegate(self.$body, 'div[id^=series] .ui.positive', 'stop', function () {
            $(self.$body).on('click', 'div[id^=series] .ui.positive', function() {
                var selected = self.seriesModalView.getSelectedValue();
                handler({series: selected});
            });
        } else if (event === 'variable-modal-approve') {
            // $delegate(self.$body, '#time-slider', 'stop', function () {
            $(self.$body).on('click', 'div[id^=variable] .ui.positive', function() {
                var selected = self.variableModalView.getSelectedValue();
                handler({variable: selected});
            });
        }
    };

    MenuView.prototype._modalIndex = function (element) {
        var modalID =  $(element).closest('div.ui.modal').attr('id');
        return parseInt(modalID.split('-')[1], 10);
    };

    MenuView.prototype._stratumIndex = function (element) {
        var stratumID =  $(element).closest('div.column').attr('id');
        return parseInt(stratumID.split('-')[1], 10);
    };

    window.app = window.app || {};
    window.app.MenuView = MenuView;
}(window));
