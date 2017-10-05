/* globals _, d3 */
(function (window) {
    'use strict';

    /**
     * Model to hold configuration information and acts as intermediary
     * between controller and data model
     * @param {DataModel} dataModel - The data model to fetch trend data
     * @constructor
     */
    function ConfigurationModel(dataModel) {
        /**
         * @type {DataModel}
         * @private
         */
        this._dataModel = dataModel;

        /**
         * Strata fields for this trend tool.  Each stratum is expected to
         * have one or more categories associated with it.
         * @type {[{key: string, alias: string, categories: []}]}
         * @private
         */
        this._strataFields = [];

        /**
         * Variables to use as the continuous values under consideration
         * @type {[{key: string, alias: string, units: string, type: string}]}
         * @private
         */
        this._variableFields = [];

        /**
         * Variables to use as the series under consideration
         * @type {[{key: string, alias: string}]}
         * @private
         */
        this._seriesFields = [];

        /**
         * Variable that holds information about the time axis
         * @type {{key: string, alias: string}}
         * @private
         */
        this._timeField = {};

        /**
         * Variable that holds information about the weight variable
         * @type {{key: string, alias: string, units: string}}
         * @private
         */
        this._weightField = {};

        /**
         * The currently selected configuration
         * @type {{strataFields, seriesField, variableField, timeField, weightField, minTime, maxTime}}
         * @private
         */
        this._selected = {};

        this._lowAreaThreshold = 0.0;
        this._minimumAreaThreshold = 0.0;
    }

    /**
     * Initialize the configuration object and, in turn, the member data model.  Once
     * filled, return the data needed to initially populate the menu view
     * @param {Object} configObj - The original parsed JSON object
     * @param {Function} callback
     */
    ConfigurationModel.prototype.initialize = function(configObj, callback) {
        callback = callback || function() {};
        var self = this;

        // Sets a number of instance-level variables for easy access
        self
            .strataFields(self._setStrataFromConfig(configObj))
            .variableFields(self._setVariablesFromConfig(configObj))
            .timeField(self._setTimeFromConfig(configObj))
            .weightField(self._setWeightFromConfig(configObj))
            .seriesFields(function() {
                return _.map(self.strataFields(), function(s) {
                    return {
                        'key': s.key,
                        'alias': s.alias
                    };
                });
            }());

        self
            .lowAreaThreshold(parseFloat(configObj.warningAreaThreshold))
            .minimumAreaThreshold(parseFloat(configObj.minimumAreaThreshold));

        // Ensure that all fields match between config and data
        if (!_.isEqual(self.getFieldNames().sort(),
            self._dataModel.getFieldNames().sort()))
        {
            var msg = 'Fields from JSON and CSV differ.  Check both files';
            throw Error(msg);
        }

        // Massage the data based on configuration information
        self._dataModel.initialize(self, function(data) {
            // Find unique values in each categorical field
            var uniqCats = _.fromPairs(_.map(self.strata, function (s) {
                var uniq = self._dataModel.getFieldUniqueValues(data, s.key);
                return [ s.key, uniq ];
            }));

            // Drop all categories without representation in the data
            _.forEach(self.strata, function(s) {
                s.categories = _.filter(s.categories, function(c) {
                    return _.includes(uniqCats[s.key], c.key);
                });
            });

            // Set initially selected variables and return config
            self._initializeSelected(function(selected) {
                self._selected = selected;
                callback(self);
            });
        });
    };

    /**
     * Initialize selected fields at application startup.  Return this
     * information via callback
     * @param {Function} callback
     * @private
     */
    ConfigurationModel.prototype._initializeSelected = function(callback) {
        callback = callback || function() {};
        var self = this;
        self._dataModel.read(function(data) {
            var timeRange = self._dataModel.getFieldRange(data, self._timeField.key);
            callback({
                strataFields: _.cloneDeep(self._strataFields),
                seriesField: self._seriesFields[0],
                variableField: self._variableFields[0],
                timeField: self._timeField,
                weightField: self._weightField,
                minTime: timeRange[0],
                maxTime: timeRange[1]
            });
        });
    };

    /**
     * Returns filtered fields from raw configuration object
     * @param {Object} config - The original parsed JSON object
     * @param {Array} types - The types of variables for which to filter
     * @returns {Array}
     * @private
     */
    ConfigurationModel.prototype._getFieldsFromConfig = function (config, types) {
        return _.filter(config.variables, function (d) {
            return _.includes(types, d.type);
        });
    };

    /**
     * Build strata information from raw configuration information
     * @param {Object} config - The original parsed JSON object
     * @returns {Array}
     * @private
     */
    ConfigurationModel.prototype._setStrataFromConfig = function(config) {
        var strata = this._getFieldsFromConfig(config, ['categorical']);
        var colors = d3.scale.category20().range();
        return _.map(strata, function(stratum) {
            var colorIndex = 0;
            var categories = _.map(stratum.categories, function (cat) {
                return {
                    key: cat.key,
                    alias: cat.alias,
                    color: colors[colorIndex++ % 20],
                    type: 'item'
                };
            });
            var groups = _.map(stratum.groups, function (group) {
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

    /**
     * Build variable information from raw configuration information.  Both
     * continuous and weight type fields are considered valid
     * @param {Object} config - The original parsed JSON object
     * @returns {Array}
     * @private
     */
    ConfigurationModel.prototype._setVariablesFromConfig = function(config) {
        var variables = this._getFieldsFromConfig(config, ['continuous', 'weight']);
        return _.map(variables, function(variable) {
            return {
                key: variable.key,
                alias: variable.alias,
                units: variable.units,
                type: variable.type
            };
        });
    };

    /**
     * Get the time field from raw configuration information
     * @param {Object} config - The original parsed JSON object
     * @returns {{key, alias: string}}
     * @private
     */
    ConfigurationModel.prototype._setTimeFromConfig = function(config) {
        var timeFields = this._getFieldsFromConfig(config, ['time']);
        if (timeFields.length !== 1) {
            var msg = 'There must be exactly one time field';
            throw Error(msg);
        }
        return {
            'key': timeFields[0].key,
            'alias': timeFields[0].alias
        };
    };

    /**
     * Get the weight field from raw configuration information
     * @param {Object} config - The original parsed JSON object
     * @returns {{key, alias, units: string}}
     * @private
     */
    ConfigurationModel.prototype._setWeightFromConfig = function(config) {
        var weightFields = this._getFieldsFromConfig(config, ['weight']);
        if (weightFields.length !== 1) {
            var msg = 'There must be exactly one weight field';
            throw Error(msg);
        }
        return {
            'key': weightFields[0].key,
            'alias': weightFields[0].alias,
            'units': weightFields[0].units
        };
    };

    /**
     * Returns all field names (keys) associated with this configuration object
     * @returns {Array}
     * @private
     */
    ConfigurationModel.prototype.getFieldNames = function() {
        var self = this;
        var variableKeys = _.union(
            _.map(self._strataFields, function(s) { return s.key; }),
            _.map(self._variableFields, function(v) { return v.key; }),
            [self._timeField.key],
            [self._weightField.key]
        );
        return _.uniq(variableKeys);
    };

    /**
     * Setter/getter for this._strataFields
     * @param _
     * @returns {*}
     */
    ConfigurationModel.prototype.strataFields = function(_) {
        if (!arguments.length)
            return this._strataFields;
        this._strataFields = _;
        return this;
    };

    /**
     * Getter for an individual stratum in this._strataFields.  Because
     * this._strataFields is an array, we search for the key within this array
     * @param {string} key - Stratum key for which to search
     * @returns {Object} - The matching entry in this._strataFields
     */
    ConfigurationModel.prototype.getStratum = function(key) {
        var matching = _.filter(this._strataFields, function(d) {
            return d.key === key;
        });
        return matching[0];
    };

    /**
     * Setter/getter for this._variableFields
     * @param _
     * @returns {*}
     */
    ConfigurationModel.prototype.variableFields = function(_) {
        if (!arguments.length)
            return this._variableFields;
        this._variableFields = _;
        return this;
    };

    /**
     * Getter for an individual variable in this._variableFields.  Because
     * this._variableFields is an array, we search for the key within this array
     * @param {string} key - Variable key for which to search
     * @returns {Object} - The matching entry in this._variableFields
     */
    ConfigurationModel.prototype.getVariable = function(key) {
        var matching = _.filter(this._variableFields, function(d) {
            return d.key === key;
        });
        return matching[0];
    };


    /**
     * Setter/getter for this._seriesFields
     * @param _
     * @returns {*}
     */
    ConfigurationModel.prototype.seriesFields = function(_) {
        if (!arguments.length)
            return this._seriesFields;
        this._seriesFields = _;
        return this;
    };

    /**
     * Getter for an individual series in this._seriesFields.  Because
     * this._seriesFields is an array, we search for the key within this array
     * @param {string} key - Series key for which to search
     * @returns {Object} - The matching entry in this._seriesFields
     */
    ConfigurationModel.prototype.getSeries = function(key) {
        var matching = _.filter(this._seriesFields, function(d) {
            return d.key === key;
        });
        return matching[0];
    };

    /**
     * Setter/getter for this._timeField
     * @param _
     * @returns {*}
     */
    ConfigurationModel.prototype.timeField = function (_) {
        if (!arguments.length)
            return this._timeField;
        this._timeField = _;
        return this;
    };

    /**
     * Setter/getter for this._weightField
     * @param _
     * @returns {*}
     */
    ConfigurationModel.prototype.weightField = function (_) {
        if (!arguments.length)
            return this._weightField;
        this._weightField = _;
        return this;
    };

    /**
     * Setter/getter for this._selected.  If an argument is passed, it
     * will update the values associated with the keys passed
     * @param {Object} [obj] - Object with values to be updated if passed
     * @returns {*}
     */
    ConfigurationModel.prototype.selected = function(obj) {
        if (!arguments.length)
            return this._selected;
        var self = this;
        _.forEach(obj, function(v, k) {
            self._selected[k] = v;
        });
        return this;
    };

    /**
     * Setter/getter for this._lowAreaThreshold
     * @param _
     * @returns {*}
     */
    ConfigurationModel.prototype.lowAreaThreshold = function (_) {
        if (!arguments.length)
            return this._lowAreaThreshold;
        this._lowAreaThreshold = _;
        return this;
    };

    /**
     * Setter/getter for this._lowAreaThreshold
     * @param _
     * @returns {*}
     */
    ConfigurationModel.prototype.minimumAreaThreshold = function (_) {
        if (!arguments.length)
            return this._minimumAreaThreshold;
        this._minimumAreaThreshold = _;
        return this;
    };

    /**
     * Filter and group data records based on currently selected configuration
     * Return this information via callback
     * @param {Function} callback
     */
    ConfigurationModel.prototype.filterGroupRecords = function(callback) {
        callback = callback || function() {};
        this._dataModel.filterGroupRecordsFromConfig(this, callback);
    };

    window.app = window.app || {};
    window.app.ConfigurationModel = ConfigurationModel;
}(window));
