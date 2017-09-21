/* globals _, d3 */
(function (window) {
    'use strict';

    function DataStore(callback) {
        callback = callback || function () {};
        this._data = [];
        callback.call(this, this._data);
    }

    DataStore.prototype.load = function (csvFn, callback) {
        callback = callback || function () {};
        var self = this;
        d3.csv(csvFn, function(error, data) {
            if (error) throw error;
            self._data = data;
            callback.call(self, data);
        });
    };

    DataStore.prototype.findAll = function (callback) {
        callback = callback || function() {};
        callback.call(this, this._data);
    };

    DataStore.prototype.find = function(query, callback) {
        if (!callback) {
            return;
        }
        callback.call(this, this._data.filter(function (row) {
            for (var q in query) {
                if (query[q] !== row[q]) {
                    return false;
                }
            }
            return true;
        }));
    };

    DataStore.prototype.fieldNames = function() {
        return _.keys(this._data[0]);
    };

    DataStore.prototype.convertNumericFields = function(numericFields) {
        _.forEach(this._data, function(r) {
            _.forEach(numericFields, function(f) {
                r[f] = +r[f];
            });
        });
    };

    DataStore.prototype.addGroupRecords = function(configModel) {
        // Initially, mark all data as 'non-grouped'
        _.forEach(this._data, function(d) { d.grouped = false; });

        // Calculate group data records
        var copyData = _.clone(this._data);
        var self = this;
        _.forEach(configModel.getStrata(), function(s) {
            _.forEach(s.categories, function(c) {
                if (c.type === 'group') {
                    var groupData = self._calculateGroupData(configModel, copyData, s.key, c.key, c.items);
                    self._data = self._data.concat(groupData);
                }
            });
        });
    };

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
        var contKeys = _.map(configModel.getVariables(), function(v) { return v.key; });
        var groups = _.groupBy(filteredData, function (d) {
            return _.values(_.omit(d, contKeys));
        });
        var groupKeys = _.keys(_.omit(filteredData[0], contKeys));

        // Create a new data record for each combination and this group.
        var weightField = configModel.getWeight().key;
        var newData = [];
        _.forEach(groups, function (groupData, groupKey) {
            var obj = {};
            // Set the values for the categorical variables, setting the key
            // currently being considered to the group value (g)
            obj[key] = g;

            // Copy over all non-group categorical attributes
            var group = groupKey.split(',');
            _.forEach(_.zip(groupKeys, group), function (item, j) {
                obj[item[0]] = item[1];
            });

            // Mark this as a grouped record
            obj.grouped = true;

            // Calculate the total weight once
            var totalWeight = _.reduce(groupData, function (memo, d) {
                return memo + d[weightField];
            }, 0);

            // For each continuous variable, calculate either the weighted mean
            // or sum of area
            _.forEach(configModel.getVariables(), function (v) {
                if (v.key === weightField) {
                    obj[v.key] = totalWeight;
                } else {
                    var total = _.reduce(groupData, function (memo, d) {
                        return memo + (d[weightField] * d[v.key]);
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

