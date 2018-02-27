/* globals _, d3 */
(function (window) {
    'use strict';

    /**
     * Controller for trend application
     * @param {ConfigurationModel} configModel - Configuration/data settings
     * @param {MenuView} menuView - View controlling user interaction
     * @param {InformationView} informationView - View controlling information panels
     * @param {OlofssonView} olofssonView - View controlling Olofsson error-correction panel
     * @param {ChartView} chartView - View controlling chart and chart interaction
     * @constructor
     */
    function TrendController(configModel, menuView, informationView, olofssonView, chartView) {
        var self = this;
        self.configModel = configModel;
        self.menuView = menuView;
        self.informationView = informationView;
        self.olofssonView = olofssonView;
        self.chartView = chartView;
        self.seriesData = null;

        self.menuView.bind('stratum-link-click', function(obj) {
            self.menuView.render('stratumModalShow', obj);
        });
        self.menuView.bind('stratum-modal-select-all', function(obj) {
            self.menuView.render('stratumModalUpdateDropdown', obj);
        });
        self.menuView.bind('stratum-modal-select-none', function(obj) {
            self.menuView.render('stratumModalUpdateDropdown', obj);
        });
        self.menuView.bind('stratum-modal-approve', function(obj) {
            self.menuView.render('stratumUpdateList', obj);
            var stratum = (self.configModel.strataFields)[obj.index];
            var cats = stratum.categories;
            var groups = stratum.groups;
            var subsetStrata = self.configModel.selected.strataFields;
            if (obj.items[0] === 'All') {
                subsetStrata[obj.index].categories = cats;
                subsetStrata[obj.index].groups = groups;
            } else {
                subsetStrata[obj.index].categories = _.filter(cats, function(d) {
                    return _.includes(obj.items, d.key);
                });
                subsetStrata[obj.index].groups = _.filter(groups, function(d) {
                    return _.includes(obj.items, d.key);
                });
            }
            self.configModel.selected.strataFields = subsetStrata;
            self.update();
        });
        self.menuView.bind('series-link-click', function() {
            self.menuView.render('seriesModalShow', {});
        });
        self.menuView.bind('series-modal-approve', function(obj) {
            var item = self.configModel.series(obj.series);
            self.menuView.render('seriesUpdate', item.alias);
            self.configModel.selected.seriesField = item;
            self.update();
        });
        self.menuView.bind('time-link-click', function() {
            self.menuView.render('timeModalShow', {});
        });
        self.menuView.bind('time-slider-change', function(obj) {
            self.menuView.render('timeModalUpdate', obj);
        });
        self.menuView.bind('time-modal-approve', function(obj) {
            self.menuView.render('timeUpdate', obj);
            self.configModel.selected.minTime = obj.timeRange[0];
            self.configModel.selected.maxTime = obj.timeRange[1];
            self.update();
        });
        self.menuView.bind('variable-link-click', function() {
            self.menuView.render('variableModalShow', {});
        });
        self.menuView.bind('variable-modal-approve', function(obj) {
            var item = self.configModel.variable(obj.variable);
            self.menuView.render('variableUpdate', item.alias);
            self.configModel.selected.variableField = item;
            self.update();
        });
        self.menuView.bind('export-link-click', function(obj) {
            self.menuView.render('exportModalShow', obj);
        });
        self.menuView.bind('export-modal-approve', function(obj) {
            self.downloadFile(obj.filename, self.seriesData);
        });

        self.olofssonView.bind('olofsson-toggle-click', function(checked) {
            if (!checked) {
                self.removeOlofssonSeries();
            } else {
                self.chartView.update(self.configModel, self.seriesData);
            }

        });

        // Window resize handler
        d3.select(window).on('resize', function() {
            self.resize();
        });

    }

    /**
     * Initialize all components using the raw JSON configuration
     * @param {Object} rawConfig - Configuration object read from URL
     */
    TrendController.prototype.initialize = function(rawConfig, callback) {
        callback = callback || function() {};
        var self = this;
        self.configModel.initialize(rawConfig, function(config) {
            self.menuView.render('initializeMenu', config);
            self.informationView.initialize(config);
            self.configModel.filterGroupRecords(function(obj) {
                self.chartView.initialize(config, obj.data);
                self.update();
                callback();
            });
        });
    };

    /**
     * Respond to any UI change that may change data selection
     */
    TrendController.prototype.update = function() {
        var self = this;
        this.configModel.filterGroupRecords(function(obj) {
            // Subset the series down to just those categories selected
            // for this stratum
            var selectedStrata = self.configModel.selected.strataFields;
            var selectedSeries = self.configModel.selected.seriesField;
            var selectedCats = _.find(selectedStrata, function(x) {
                return x.key === selectedSeries.key;
            }).categoriesAndGroups();
            var selectedKeys = _.map(selectedCats, function(x) {return x.key; });
            var dataKeys = _.map(obj.data, function(x) { return x.label; });

            // Some categories are present in menu but not obj.data and vice versa
            // Some categories are present in obj.data but not menu
            // Need to show missing categories in warning menu
            // Don't show obj.data cats in warning menu that are missing from menu
            obj.showData = _.cloneDeep(obj.data);
            _.forEach(_.difference(selectedKeys, dataKeys), function(s) {
                obj.showData.push(new window.app.SeriesModel(s, '#ffffff', 0.0, []));
            });
            _.forEach(_.difference(dataKeys, selectedKeys), function(s) {
                _.remove(obj.showData, function(series) { return series.label === s;});
            });

            // If there is no overlap, set obj.count to 0
            if (_.intersection(selectedKeys, dataKeys).length === 0)
                obj.count = 0;

            // Update the information panels
            var units = self.configModel.selected.weightField.units;
            self.informationView.render({data: obj.showData, count: obj.count, units: units});
            self.menuView.render('updateBackground', obj);

            // Subset the data to not shown series that don't meet minimum
            // area threshold
            obj.showData = self.removeMinimumSeries(obj.showData,  self.configModel.minimumAreaThreshold);
            self.seriesData = obj.showData;

            // Olofsson - Check if the currently selected series has error-correction
            // associated with it and render the menu if it does
            self.configModel.filterOlofssonRecords(obj.data, function(olofssonData) {
                self.olofssonView.render(olofssonData);

                // If there are series present from Olofsson data, weave these in
                // We only want to include the series that are currently being shown
                // so we need to match on label - FRAGILE!!!
                if (olofssonData) {
                    var subsetOlofssonData = _.filter(olofssonData.series_data, function(s) {
                        var oLabel = s.label;
                        oLabel = oLabel.substring(0, oLabel.length - 3);
                        return _.includes(selectedKeys, oLabel);
                    });
                    obj.showData = _.concat(obj.showData, subsetOlofssonData);
                }

                // Finally, sort the labels in the series data as they are in the menus
                // adding in EA labels if they are present
                var cats = self.configModel.stratum(selectedSeries.key).categoriesAndGroups();
                var labels =_.map(cats, function(x) { return x.key; } );
                var sorted_labels = [];
                _.forEach(labels, function(l) {
                    _.forEach(['', '-EA'], function(suffix) {
                        sorted_labels.push(l+suffix);
                    });
                });
                obj.showData = _.map(sorted_labels, function(l) {
                    return _.find(obj.showData, function(s) {
                        return s.label === l;
                    });
                });
                obj.showData = _.filter(obj.showData, function(s) {
                    return s !== undefined;
                });
                self.seriesData = obj.showData;

                // Finally, update the chart
                self.chartView.update(self.configModel, obj.showData);
            });
        });
    };

    TrendController.prototype.removeOlofssonSeries = function() {
        var self = this;
        var data = _.filter(self.seriesData, function(d) {
            return !(d instanceof window.app.SeriesAndErrorsModel);
        });
        self.chartView.update(self.configModel, data);
    };

    /**
     * Respond to resizing of browser window
     */
    TrendController.prototype.resize = function() {
        var self = this;
        var width = parseInt(d3.select('#chart').style('width'), 10);
        d3.select('#chart svg').attr('width', width);
        self.chartView.width(width).update(self.configModel, self.seriesData);
    };

    /**
     * Remove data series with weights that don't meet minimum thresholds.  This
     * is run subsequent to retrieving the data from the configModel and before
     * sending it to the views for rendering
     * @param {Array} data - Series data for which minimum thresholds are determined
     * @param {number} threshold - Minimum weight threshold for inclusion
     * @returns {*}
     */
    TrendController.prototype.removeMinimumSeries = function(data, threshold) {
        var removeList = [];
        _.forEach(data, function(d, i) {
            if (d.minWeight < threshold) {
                removeList.push(i);
            }
        });
        _.pullAt(data, removeList);
        return data;
    };

    TrendController.prototype.downloadFile = function(csvFile) {
        // See http://stackoverflow.com/a/24922761
        // Creation of the blob is handled in convertToCSV
        var blob = this.convertToCSV();
        if (window.navigator.msSaveBlob) {
            window.navigator.msSaveBlob(blob, csvFile);
        } else {
            var link = document.createElement('a');
            if (link.download !== undefined) {
                var url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', csvFile);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };

    TrendController.prototype.convertToCSV = function() {
        var self = this;
        var selected = self.configModel.selected;

        // Separate the two series types from one another
        var mappedSeries = []
        var olofssonSeries = [];
        _.forEach(self.seriesData, function(s) {
            if (s instanceof window.app.SeriesAndErrorsModel) {
                olofssonSeries.push(s);
            } else {
                mappedSeries.push(s);
            }
        });

        // Print out the strata
        var result = 'STRATA\n';
        _.forEach(selected.strataFields, function(sf) {
            var refStratum = self.configModel.stratum(sf.key);
            if (_.isEqual(sf.groups, refStratum.groups) &&
                    _.isEqual(sf.categories, refStratum.categories)) {
                result += sf.alias + ':ALL\n';
            } else {
                result += sf.alias + ':';
                result += _.map(sf.categories, function(c) { return c.key; }).join(';');
                result += _.map(sf.groups, function(g) { return g.key; }).join(';') + '\n';
            }
        });

        // Print out a bit more metadata
        result += '\nSERIES\n' + selected.seriesField.alias + '\n';
        result += '\nTIME_RANGE\n' + selected.minTime + '-' + selected.maxTime + '\n';
        result += '\nVARIABLE\n' + selected.variableField.alias +
            ' (' + selected.variableField.units + ')\n';

        // Header line
        result += '\nMAPPED_AREAS\n';
        var header = [selected.seriesField.alias];
        var times = _.range(selected.minTime, selected.maxTime + 1);
        result += header.concat(times).join(',') + '\n';

        // Now print out the mapped data: series are rows, years are columns and
        // variable values are array elements
        _.forEach(mappedSeries, function (s) {
            var line = [s.label];
            var values = _.map(times, function (t) {
                var obj = _.find(s.seriesData, function (d) {
                    return d[0] == t.toString();
                });
                return obj ? obj[1] : '';
            }); //.join(',');
            result += line.concat(values).join(',') + '\n';
        });

        // If there is Olofsson data, print this out as well
        if (olofssonSeries.length) {
            // Header line
            result += '\nERROR_CORRECTED_AREA_ESTIMATES\n';
            header = [selected.seriesField.alias];
            times = _.range(selected.minTime, selected.maxTime + 1);
            result += header.concat(times).join(',') + '\n';

            _.forEach(olofssonSeries, function (s) {
                var line = [s.label];
                var values = _.map(times, function (t) {
                    var obj = _.find(s.seriesData, function (d) {
                        return d[0] == t.toString();
                    });
                    return obj ? obj[1] : '';
                }); //.join(',');
                result += line.concat(values).join(',') + '\n';
            });


            result += '\nSE_AREA_ESTIMATES\n';
            header = [selected.seriesField.alias];
            times = _.range(selected.minTime, selected.maxTime + 1);
            result += header.concat(times).join(',') + '\n';

            _.forEach(olofssonSeries, function (s) {
                var line = [s.label];
                var values = _.map(times, function (t) {
                    var obj = _.find(s.seriesData, function (d) {
                        return d[0] == t.toString();
                    });
                    return obj ? obj[1] - obj[2] : '';
                }); //.join(',');
                result += line.concat(values).join(',') + '\n';
            });
        }

        return new Blob([result], {type: 'text/csv;charset=utf-8;'});
    };

    window.app = window.app || {};
    window.app.TrendController = TrendController;
}(window));
