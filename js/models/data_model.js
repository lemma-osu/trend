/* globals _ */
(function (window) {
    'use strict';
    function DataModel(storage) {
        this.dataStore = storage;
    }

    DataModel.prototype.initialize = function(configModel, callback) {
        callback = callback || function() {};
        var numericFields = _.concat(
            _.map(configModel.getVariables(), function(v) { return v.key; }),
            [configModel.getTime().key]
        );
        this.dataStore.convertNumericFields(numericFields);
        this.dataStore.addGroupRecords(configModel);
        this.read(callback);
    };

    DataModel.prototype.read = function (query, callback) {
        var queryType = typeof query;
        callback = callback || function() {};
        if (queryType === 'function') {
            callback = query;
            this.dataStore.findAll(callback);
        } else {
            this.dataStore.find(query, callback);
        }
    };

    DataModel.prototype.getCount = function (callback) {
        callback = callback || function() {};
        this.dataStore.findAll(function(data) {
            callback(data.length);
        });
    };

    DataModel.prototype.getFields = function () {
        return this.dataStore.fieldNames();
    };

    DataModel.prototype.getFieldUniqueValues = function (records, field) {
        return _.chain(records)
            .map(function (d) { return d[field]; })
            .uniq()
            .sortBy(function (k) { return k; })
            .value();
    };

    DataModel.prototype.getFieldRange = function(records, field) {
        var data = this.getFieldUniqueValues(records, field);
        var values = _.map(data, function(d) { return +d; });
        return [_.min(values), _.max(values)];
    };

    DataModel.prototype.filterStratum = function(v, k, seriesVar, groups) {
        var cats;
        if (k === seriesVar) {
            // If this stratum matches the series variable, collect all records
            cats = v;
        } else {
            // Otherwise find the unique set of categories covered by this stratum
            // and we use this to filter for only non-grouped records below
            cats = [];
            _.each(v, function (d) {
                // Expand grouped categories to the items that compose it
                if (_.includes(_.keys(groups), d)) {
                    cats = cats.concat(groups[d].items);
                } else {
                    cats.push(d);
                }
            });
            cats = _.uniq(cats);
        }
        return cats;
    };

    DataModel.prototype.filterRecords = function (configModel, strata, seriesVar) {
        var self = this;

        // For each stratum, set the values that will be included in the
        // filter for data rows
        var conds = {};
        _.each(strata, function (v, k) {
            var groups = configModel.getCategoricalField(k).groups;
            conds[k] = self.filterStratum(v, k, seriesVar, groups);
        });

        // Start with the full data set and filter the records based on the
        // presence of the filters for each stratum.  This doesn't
        // seem very efficient in that it has to iterate over each stratum.
        var data = this.dataStore.findAll();
        return _.filter(data, function (d) {
            return _.every(conds, function (v, k) {
                return _.includes(v, d[k]);
            });
        });
    };

    DataModel.prototype.getSum = function(records, field) {
        return _.reduce(records, function(memo, d) {
            return memo + (+d[field]);
        }, 0);
    };

    DataModel.prototype.getWeightedSum = function(records, weightField, valueField) {
        return _.reduce(records, function (memo, d) {
            return memo + (+d[weightField] * +d[valueField]);
        }, 0);
    };

    DataModel.prototype.getWeightedMean = function(records, weightField, valueField) {
        var wSum = this.getWeightedSum(records, weightField, valueField);
        var w = this.getSum(records, weightField);
        return wSum / w;
    };

    DataModel.prototype.groupData = function (filteredData, configModel, seriesVar, contVar, contVarType,
                                              weightVar, timeField, minTime, maxTime) {

        // Get the unique values from the series
        var self = this;
        var series = this.getFieldUniqueValues(filteredData, seriesVar);

        // Get the color choices
        // TODO: This should probably be in the view
        var groups = configModel.getCategoricalField(seriesVar).groups;
        var items = configModel.getCategoricalField(seriesVar).categories;
        var colors = _.fromPairs(_.map(series, function (d) {
            if (_.includes(_.keys(groups), d)) {
                return [d, groups[d].color];
            } else {
                return [d, items[d].color];
            }
        }));

        // Assign the data to each series.  This iterates through the records and
        // pushes the record to the correct series if that record is not grouped
        // on all other strata besides the one of interest (to avoid double
        // counting).  The record also has to meet the year threshold to be
        // assigned.  For series that represent groups, assign the record if the
        // series matches.
        var seriesData = _.zipObject(series, _.map(series, function () {
            return [];
        }));
        var groupKeys = _.keys(groups);
        _.forEach(filteredData, function (d) {
            if (+d[timeField] >= minTime && +d[timeField] <= maxTime) {
                _.forEach(groupKeys, function (g) {
                    if (d[seriesVar] === g) {
                        seriesData[g].push(d);
                    }
                });
                // TODO: Fix this - not currently marking records as grouped
                // if (d.grouped === false) {
                seriesData[d[seriesVar]].push(d);
                // }
            }
        });

        // For each series, create aggregate information from all records.  First,
        // group the records by year, then return an object of the series
        // label, color and an array of year, value pairs.  For area variables
        // (e.g. countVar), values are the 'weights' themselves; for all other
        // variables, values are an area-weighted average.
        var seriesGroupedData = series.map(function (s) {
            var subset = seriesData[s];
            var timeGroups = _.groupBy(subset, function (d) {
                return d[timeField];
            });

            // Calculate weights across timeGroups associated with this series.
            // We need this information to warn on low counts
            var weights = _.map(timeGroups, function (items) {
                return self.getSum(items, weightVar);
            });

            var groupedData;
            if (contVar !== weightVar) {
                if (contVarType === 'total') {
                    groupedData = _.map(timeGroups, function (items, time) {
                        // TODO: Why is this not weighted?
                        return [time, self.getSum(items, contVar)];
                    });
                } else {
                    groupedData = _.map(timeGroups, function (items, time) {
                        return [time, self.getWeightedMean(items, weightVar, contVar)];
                    });
                }
            } else {
                groupedData =  _.map(timeGroups, function (items, time) {
                    return [time, self.getSum(items, weightVar)];
                });
            }
            return {
                label: s,
                color: colors[s],
                minWeight: _.min(weights),
                data: groupedData
            };
        });
        return seriesGroupedData;
    };

    DataModel.prototype.filterRecordsFromConfiguration = function(configModel) {
        // Aliases to selected data
        var s = configModel.getSelected();
        var seriesVar = s.series.key;

        // TODO: Take out configModel as argument
        var filteredData = this.filterRecords(configModel, configModel.strata, seriesVar);

        // Get the continuous variable
        var contVar = s.variable.key;
        var contVarType = configModel.getContinuousField(contVar).type;

        // Get the weight variable
        var weightVar = s.weight.key;

        // Get the time period to extract
        var timeField = configModel.getTimeField().key;
        var timeRange = this.getFieldRange(filteredData, timeField);
        var minTime = timeRange[0];
        var maxTime = timeRange[1];

        // Finally group these data and return
        // TODO: Take out configModel as argument
        return this.groupData(filteredData, configModel, seriesVar, contVar,
            contVarType, weightVar, timeField, minTime, maxTime);
    };


    window.app = window.app || {};
    window.app.DataModel = DataModel;
}(window));
