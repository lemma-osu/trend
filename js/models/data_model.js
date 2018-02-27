/* globals _ */
(function (window) {
    'use strict';

    /**
     * Model to hold accessor methods to the raw data.  Should be able
     * to go against multiple data stores.
     * @param {DataStore} storage - The data storage object
     */
    function DataModel(storage) {
        this.dataStore = storage;
    }

    /**
     * Initialize the data model based on information from the parent
     * configuration model.  This method converts all numeric data appropriately
     * and adds group records if requested from the configuration
     * @param {ConfigurationModel} configModel
     * @param {Function} callback
     */
    DataModel.prototype.initialize = function(configModel, callback) {
        callback = callback || function() {};
        var numericFields = _.concat(
            _.map(configModel.variableFields, function(v) { return v.key; }),
            [configModel.timeField.key]
        );
        this.dataStore.convertNumericFields(numericFields);
        this.dataStore.addGroupRecords(configModel);
        this.read(callback);
    };

    /**
     * Read data based on a possible subset of the data.
     * @param {*} [query] - Query to restrict the data being passed
     * @param {Function} callback
     */
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

    /**
     * Get field names associated with the data
     * @returns {Array}
     */
    DataModel.prototype.getSortedFieldNames = function () {
        return this.dataStore.fieldNames().sort();
    };

    /**
     * Get unique values from a given data field
     * @param {Array} records - Records to search
     * @param {string} field - The field for which to find unique values
     * @returns {Array} - Unique values
     */
    DataModel.prototype.getFieldUniqueValues = function (records, field) {
        return _.chain(records)
            .map(function (d) { return d[field]; })
            .uniq()
            .sortBy(function (k) { return k; })
            .value();
    };

    /**
     * Get the range of values from a given data field
     * @param {Array} records - Records to search
     * @param {string} field - The field for which to find the range of values
     * @returns {Array} - Minimum and maximum of data
     */
    DataModel.prototype.getFieldRange = function(records, field) {
        var data = this.getFieldUniqueValues(records, field);
        var values = data.map(function(d) { return +d; });
        return [_.min(values), _.max(values)];
    };

    /**
     * Create the list of categories that need to be filtered in the data
     * based on currently selected filters.  This function also expands group
     * data to get the individual categories associated with the group.
     * @param {Object} s - Series under consideration
     * @param {string} seriesVar - Currently selected series variable
     * @param {Array} selectedCats - All categories from the seriesVar
     * @returns {*} - Unique list of categories to filter on for this stratum
     */
    DataModel.prototype.filterStratum = function(s, seriesVar, selectedCats) {
        if (s.key === seriesVar) {
            // If this stratum matches the series variable, collect all records
            return _.map(selectedCats, function(x) { return x.key; });
        } else {
            // Otherwise find the unique set of categories covered by this stratum
            // and we use this to filter for only non-grouped records below
            var cats = _.map(s.categories, function(c) { return c.key; });
            var groups = _.map(s.groups, function(g) { return g.items; });
            return _.uniq(_.union(cats, _.flatten(groups)));
        }
    };

    /**
     * Filter records based on currently selected strata
     * @param {Array} strata - Strata for this configuration
     * @param {string} seriesField - Currently selected series field
     * @param {Array} selectedCats - All categories from the seriesField
     * @param callback
     */
    DataModel.prototype.filterRecords = function (strata, seriesField, selectedCats, callback) {
        callback = callback || function() {};
        var self = this;

        // For each stratum, set the values that will be included in the
        // filter for data rows
        var conds = {};
        strata.forEach(function (s) {
            conds[s.key] = self.filterStratum(s, seriesField, selectedCats);
        });

        // Start with the full data set and filter the records based on the
        // presence of the filters for each stratum.
        this.dataStore.findAll(function(data) {
            var out_data = [];
            for (var i = 0; i < data.length; i++) {
                var d = data[i];
                var all_in = true;
                for (var key in conds) {
                    if (conds.hasOwnProperty(key)) {
                        var val = d[key];
                        var arr = conds[key];
                        var here = false;
                        for (var j = 0; j < arr.length; j++) {
                            if (val === arr[j]) {
                                here = true;
                                break;
                            }
                        }
                        if (here === false) {
                            all_in = false;
                            break;
                        }
                    }
                }
                if (all_in === true) {
                    out_data.push(d);
                }
            }
            callback(out_data);
        });
    };

    /**
     * Reduce variable field by summing across records in a group
     * @param {Array} records - Records in this group
     * @param {string} field - Field to use for sums
     * @returns {*} - Summed value
     */
    DataModel.prototype.getSum = function(records, field) {
        return records.reduce(function(memo, d) {
            return memo + (+d[field]);
        }, 0);
    };

    /**
     * Reduce variable field by summing the product of weights and
     * values across records in a group
     * @param {Array} records - Records in this group
     * @param {string} weightField - Field to use for weights
     * @param {string} valueField - Field to use for values
     * @returns {*} - Summed product of weights and values
     */
    DataModel.prototype.getWeightedSum = function(records, weightField, valueField) {
        return records.reduce(function (memo, d) {
            return memo + (+d[weightField] * +d[valueField]);
        }, 0);
    };

    /**
     * Reduce variable field by calculating weighted mean
     * across records in a group
     * @param {Array} records - Records in this group
     * @param {string} weightField - Field to use for weights
     * @param {string} valueField - Field to use for values
     * @returns {number} - Weighted mean across group
     */
    DataModel.prototype.getWeightedMean = function(records, weightField, valueField) {
        var wSum = this.getWeightedSum(records, weightField, valueField);
        var w = this.getSum(records, weightField);
        return wSum / w;
    };

    /**
     * Create grouped data based on the currently selected configuration
     * @param {Array} filteredData - Filtered data based on current configuration
     * @param {ConfigurationModel} configModel - Configuration model
     * @param {string} seriesField - Currently selected series
     * @param {string} varField - Currently selected variable
     * @param {string} varFieldType - Type of currently selected variable
     * @param {string} weightField - Currently selected weighting field
     * @param {string} timeField - Currently selected time field
     * @param {int} minTime - Currently selected minimum time value
     * @param {int} maxTime - Currently selected maximum time value
     * @returns {Array}
     */
    DataModel.prototype.groupData = function (filteredData, configModel, seriesField, varField, varFieldType,
                                              weightField, timeField, minTime, maxTime) {

        // Get the unique values from the series
        var self = this;
        var series = this.getFieldUniqueValues(filteredData, seriesField);

        // // Get the color choices
        var color;
        var categories = configModel.stratum(seriesField).categories;
        var groups = configModel.stratum(seriesField).groups;
        var groupKeys = _.map(groups, function(g) { return g.key; });
        var colors = _.fromPairs(series.map(function (s) {
            if (groupKeys.includes(s)) {
                color = _.find(groups, function(g) {
                    return g.key === s;
                }).color;
                return [s, color];
            } else {
                color = _.find(categories, function(c) {
                    return c.key === s;
                }).color;
                return [s, color];
            }
        }));

        // Assign the data to each series.  This iterates through the records and
        // pushes the record to the correct series if that record is not grouped
        // on all other strata besides the one of interest (to avoid double
        // counting).  The record also has to meet the year threshold to be
        // assigned.  For series that represent groups, assign the record if the
        // series matches.
        var seriesData = _.zipObject(series, _.map(series, function() {
            return [];
        }));
        filteredData.forEach(function (d) {
            if (+d[timeField] >= minTime && +d[timeField] <= maxTime) {
                groupKeys.forEach(function (g) {
                    if (d[seriesField] === g) {
                        seriesData[g].push(d);
                    }
                });
                if (d.grouped === false) {
                    seriesData[d[seriesField]].push(d);
                }
            }
        });

        // For each series, create aggregate information from all records.  First,
        // group the records by year, then return an object of the series
        // label, color and an array of year, value pairs.  For area variables
        // (e.g. countVar), values are the 'weights' themselves; for all other
        // variables, values are an area-weighted average.
        return series.map(function (s) {
            var subset = seriesData[s];
            var timeGroups = _.groupBy(subset, function (d) {
                return d[timeField];
            });

            // Calculate weights across timeGroups associated with this series.
            // We need this information to warn on low counts
            var weights = _.map(timeGroups, function (items) {
                return self.getSum(items, weightField);
            });

            var groupedData;
            if (varField !== weightField) {
                if (varFieldType === 'total') {
                    groupedData = _.map(timeGroups, function (items, time) {
                        // TODO: Why is this not weighted?
                        return [time, self.getSum(items, varField)];
                    });
                } else {
                    groupedData = _.map(timeGroups, function (items, time) {
                        return [time, self.getWeightedMean(items, weightField, varField)];
                    });
                }
            } else {
                groupedData =  _.map(timeGroups, function (items, time) {
                    return [time, self.getSum(items, weightField)];
                });
            }
            return new window.app.SeriesModel(s, colors[s], _.min(weights), groupedData);
        });
    };

    /**
     * Filter and group records from currently selected configuration.  Once
     * filtered and group, calls the passed callback.
     * @param {ConfigurationModel} configModel - Configuration model
     * @param callback
     */
    DataModel.prototype.filterGroupRecordsFromConfig = function(configModel, callback) {
        callback = callback || function() {};
        var self = this;
        var selected = configModel.selected;

        var strataFields = selected.strataFields;
        var seriesField = selected.seriesField.key;

        // Collect all categories from the currently selected series
        // as this can figure in to Olofsson metrics
        var selectedCats = configModel.stratum(seriesField).categoriesAndGroups();

        // Get the continuous variable
        var varField = selected.variableField.key;
        var varFieldType = selected.variableField.type;

        // Get the weight variable
        var weightField = selected.weightField.key;

        // Get the time period to extract
        var timeField = selected.timeField.key;
        var minTime = selected.minTime;
        var maxTime = selected.maxTime;

        self.filterRecords(strataFields, seriesField, selectedCats, function (filteredData) {
            // Finally group these data and return
            // TODO: Take out configModel as argument
            var groupData = self.groupData(filteredData, configModel,
                seriesField, varField, varFieldType, weightField, timeField,
                minTime, maxTime);
            callback({data: groupData, count: filteredData.length});
        });
    };

    window.app = window.app || {};
    window.app.DataModel = DataModel;
}(window));
