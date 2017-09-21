/* globals _, $, d3 */
(function (window) {
    'use strict';
    function ConfigurationModel(dataModel) {
        this.dataModel = dataModel;
        this._rawConfiguration = {};
    }

    ConfigurationModel.prototype.load = function(jsonFn, callback) {
        callback = callback || function() {};
        var self = this;
        $.getJSON(jsonFn, function(data) {
            self._rawConfiguration = data;
            callback.call(self, data);
        });
    };

    ConfigurationModel.prototype.initialize = function (callback) {
        callback = callback || function() {};
        var self = this;

        // Sets a number of instance-level variables for easy access
        self.strata = self._setStrataFromConfig();
        self.variables = self._setVariablesFromConfig();
        self.time = self._setTimeFromConfig();
        self.weight = self._setWeightFromConfig();
        self.series = _.map(self.strata, function(s) {
            return {
                'key': s.key,
                'alias': s.alias
            };
        });

        // Ensure that all fields match between config and data
        if (!_.isEqual(self.getFieldNames().sort(),
            self.dataModel.getFields().sort()))
        {
            var msg = 'Fields from JSON and CSV differ.  Check both files';
            throw Error(msg);
        }

        // Massage the data based on configuration information
        self.dataModel.initialize(self, function(data) {
            // Find unique values in each categorical field
            var uniqCats = _.fromPairs(_.map(self.strata, function (s) {
                var uniq = self.dataModel.getFieldUniqueValues(data, s.key);
                return [ s.key, uniq ];
            }));

            // Drop all categories without representation in the data
            _.forEach(self.strata, function(s) {
                s.categories = _.filter(s.categories, function(c) {
                    return _.includes(uniqCats[s.key], c.key);
                });
            });

            // Return the strata and initially selected variables
            self.getSelected(function(selected) {
                callback({
                    strata: self.strata,
                    variables: self.variables,
                    selected: selected
                });
            });
        });
    };

    ConfigurationModel.prototype._getFieldsFromConfig = function (types) {
        var data = this._rawConfiguration;
        return _.filter(data.variables, function (d) {
            return _.includes(types, d.type);
        });
    };

    ConfigurationModel.prototype._setStrataFromConfig = function() {
        var strata = this._getFieldsFromConfig(['categorical']);
        var colors = d3.scale.category20().range();
        return _.map(strata, function(stratum) {
            var colorIndex = 0;
            var categories = _.map(stratum.categories, function (cat, i) {
                return {
                    key: cat.key,
                    alias: cat.alias,
                    color: colors[colorIndex++ % 20],
                    type: 'item'
                };
            });
            var groups = _.map(stratum.groups, function (group, i) {
                return {
                    key: group.key,
                    alias: group.alias,
                    color: colors[colorIndex++ % 20],
                    type: 'group',
                    items: group.items
                };
            });
            categories = _.concat(categories, groups);
            return {
                key: stratum.key,
                alias: stratum.alias,
                categories: categories
            };
        });
    };

    ConfigurationModel.prototype._setVariablesFromConfig = function() {
        var variables = this._getFieldsFromConfig(['continuous', 'weight']);
        return _.map(variables, function(variable) {
            return {
                key: variable.key,
                alias: variable.alias,
                units: variable.units,
                type: variable.type
            };
        });
    };

    ConfigurationModel.prototype._setTimeFromConfig = function() {
        var timeFields = this._getFieldsFromConfig(['time']);
        if (timeFields.length !== 1) {
            var msg = 'There must be exactly one time field';
            throw Error(msg);
        }
        return {
            'key': timeFields[0].key,
            'alias': timeFields[0].alias
        };
    };

    ConfigurationModel.prototype._setWeightFromConfig = function() {
        var weightFields = this._getFieldsFromConfig(['weight']);
        if (weightFields.length !== 1) {
            var msg = 'There must be exactly one weight field';
            throw Error(msg);
        }
        return {
            'key': weightFields[0].key,
            'alias': weightFields[0].alias
        };
    };

    ConfigurationModel.prototype.getFieldNames = function() {
        var self = this;
        return _.chain()
            .union(
                _.map(self.strata, function(s) { return s.key; }),
                _.map(self.variables, function(v) { return v.key; }),
                [self.time.key],
                [self.weight.key]
            )
            .uniq()
            .value();
    };

    ConfigurationModel.prototype.getStrata = function() {
        return this.strata;
    };

    ConfigurationModel.prototype.getStratum = function(field) {
        return this.strata[field];
    };

    ConfigurationModel.prototype.getVariables = function() {
        return this.variables;
    };

    ConfigurationModel.prototype.getVariable = function(field) {
        return this.variable[field];
    };

    ConfigurationModel.prototype.getTime = function () {
        return this.time;
    };

    ConfigurationModel.prototype.getWeight = function () {
        return this.weight;
    };

    ConfigurationModel.prototype.getWeightField = function () {
        var data = this.getFields(['weight']);
        if ((_.keys(data)).length !== 1) {
            var msg = 'There must be exactly one weight field';
            throw Error(msg);
        }
        return _.values(data)[0];
    };

    ConfigurationModel.prototype.getSelected = function(callback) {
        callback = callback || function() {};
        var self = this;
        var timeField = this.time.key;
        self.dataModel.read(function(data) {
            var timeRange = self.dataModel.getFieldRange(data, timeField);
            callback({
                seriesField: self.series[0],
                variableField: self.variables[0],
                timeField: self.time,
                weightField: self.weight,
                minTime: timeRange[0],
                maxTime: timeRange[1]
            });
        });
    };

    ConfigurationModel.prototype.getSelectedForStratum = function(stratum) {
        return this.strata[stratum];
    };

    window.app = window.app || {};
    window.app.ConfigurationModel = ConfigurationModel;
}(window));
