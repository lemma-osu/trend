/* globals _, d3 */
(function (window) {
    'use strict';

    /**
     * Back-end store for trend data.  This is a simple array of records
     * directly from a CSV file
     * @constructor
     */
    function DataStore() {
        this.data = [];
    }

    /**
     * Load data from a CSV file and return via callback
     * @param {string} csvFn - The CSV file to read in
     * @param {Function} callback
     */
    DataStore.prototype.load = function (csvFn, callback) {
        callback = callback || function () {};
        var self = this;
        d3.csv(csvFn, function(error, data) {
            if (error) throw error;
            self.data = data;
            callback.call(self, data);
        });
    };

    /**
     * Return all records via callback
     * @param {Function} callback
     */
    DataStore.prototype.findAll = function (callback) {
        callback = callback || function() {};
        callback.call(this, this.data);
    };

    /**
     * Return a subset of data based on query
     * @param {Object} query - Query to return subset of records
     * @param {Function} callback
     */
    DataStore.prototype.find = function(query, callback) {
        if (!callback) {
            return;
        }
        callback.call(this, this.data.filter(function (row) {
            for (var q in query) {
                if (query[q] !== row[q]) {
                    return false;
                }
            }
            return true;
        }));
    };

    /**
     * Return all field names from data
     * @returns {Array}
     */
    DataStore.prototype.fieldNames = function() {
        return _.keys(this.data[0]);
    };

    /**
     * Convert data identified as numeric based on passed array in place
     * @param {Array} numericFields - The fields to convert to numeric
     */
    DataStore.prototype.convertNumericFields = function(numericFields) {
        _.forEach(this.data, function(r) {
            _.forEach(numericFields, function(f) {
                r[f] = +r[f];
            });
        });
    };

    /**
     * Add group records which are weighted combinations of two or more categories
     * in a given stratum.  It's easier to calculate these upfront and identify them
     * as grouped records.  Weighted values of each continuous variable is calculated
     * as part of this function
     * @param {ConfigurationModel} configModel
     */
    DataStore.prototype.addGroupRecords = function(configModel) {
        // Initially, mark all data as 'non-grouped'
        _.forEach(this.data, function(d) { d.grouped = false; });

        // Calculate group data records
        var copyData = _.clone(this.data);
        var self = this;
        _.forEach(configModel.strataFields, function(s) {
            _.forEach(s.groups, function(g) {
                var groupData = self._calculateGroupData(configModel, copyData, s.key, g.key, g.items);
                self.data = self.data.concat(groupData);
            });
        });
    };

    /**
     * Calculate the grouped summary data for this group
     * @param {ConfigurationModel} configModel
     * @param {Array} data - copy of original data
     * @param {string} key - Stratum being grouped
     * @param {string} g - Group name
     * @param {Array} items - Category names in this group
     * @returns {Array} - Grouped records to add in to data store
     * @private
     */
    DataStore.prototype._calculateGroupData = function (configModel, data, key, g, items) {
        // TODO: Don't pass configModel if possible

        // Filter to just the items in this group.  At the same time, remove the
        // key from each record to make grouping easier
        var filteredData = _.chain(data)
            .filter(function (d) { return _.includes(items, d[key]); })
            .map(function (d) { return _.omit(d, key); })
            .value();

        // Group by the remaining categorical fields.  This will create groups for
        // each unique combination.  Note that the group key becomes a
        // comma-delimited string.
        var contKeys = _.map(configModel.variableFields, function(v) { return v.key; });
        var groups = _.groupBy(filteredData, function (d) {
            return _.values(_.omit(d, contKeys));
        });
        var groupKeys = _.keys(_.omit(filteredData[0], contKeys));

        // Create a new data record for each combination and this group.
        var weightKey = configModel.weightField.key;
        var newData = [];
        _.forEach(groups, function (groupData, groupKey) {
            var obj = {};
            // Set the values for the categorical variables, setting the key
            // currently being considered to the group value (g)
            obj[key] = g;

            // Copy over all non-group categorical attributes
            var group = groupKey.split(',');
            _.forEach(_.zip(groupKeys, group), function (item) {
                obj[item[0]] = item[1];
            });

            // Mark this as a grouped record
            obj.grouped = true;

            // Calculate the total weight once
            var totalWeight = _.reduce(groupData, function (memo, d) {
                return memo + d[weightKey];
            }, 0);

            // For each continuous variable, calculate either the weighted mean
            // or sum of area
            _.forEach(configModel.variableFields, function (v) {
                if (v.key === weightKey) {
                    obj[v.key] = totalWeight;
                } else {
                    var total = _.reduce(groupData, function (memo, d) {
                        return memo + (d[weightKey] * d[v.key]);
                    }, 0);
                    obj[v.key] = total / totalWeight;
                }
            });
            newData.push(obj);
        });
        return newData;
    };

    window.app = window.app || {};
    window.app.DataStore = DataStore;
})(window);

