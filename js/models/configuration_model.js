/* globals _, d3 */
(function (window) {
    'use strict';

    function KeyValuePair(key, alias) {
        this.key = key;
        this.alias = alias;
    }

    function Category(key, alias, color) {
        KeyValuePair.call(this, key, alias);
        this.color = color;
    }
    Category.prototype = Object.create(KeyValuePair.prototype);
    Category.prototype.constructor = Category;

    function GroupCategory(key, alias, color, items) {
        Category.call(this, key, alias, color);
        this.items = items;
    }
    GroupCategory.prototype = Object.create(Category.prototype);
    GroupCategory.prototype.constructor = GroupCategory;

    function StratumField(key, alias, categories, groups) {
        KeyValuePair.call(this, key, alias);
        this.groups = groups;
        this.categories = categories;
    }
    StratumField.prototype = Object.create(KeyValuePair.prototype);
    StratumField.prototype.constructor = StratumField;

    StratumField.prototype.categoriesAndGroups = function() {
        return this.categories.concat(this.groups);
    };

    function TimeField(key, alias) {
        KeyValuePair.call(this, key, alias);
    }
    TimeField.prototype = Object.create(KeyValuePair.prototype);
    TimeField.prototype.constructor = TimeField;

    function SeriesField(key, alias) {
        KeyValuePair.call(this, key, alias);
    }
    SeriesField.prototype = Object.create(KeyValuePair.prototype);
    SeriesField.prototype.constructor = SeriesField;

    function WeightField(key, alias, units) {
        KeyValuePair.call(this, key, alias);
        this.units = units;
    }
    WeightField.prototype = Object.create(KeyValuePair.prototype);
    WeightField.prototype.constructor = WeightField;

    function VariableField(key, alias, units, type) {
        KeyValuePair.call(this, key, alias);
        this.units = units;
        this.type = type;
    }
    VariableField.prototype = Object.create(KeyValuePair.prototype);
    VariableField.prototype.constructor = VariableField;

    function Selected(selectedObject) {
        this.strataFields = selectedObject.strataFields;
        this.seriesField = selectedObject.seriesField;
        this.variableField = selectedObject.variableField;
        this.timeField = selectedObject.timeField;
        this.weightField = selectedObject.weightField;
        this.minTime = selectedObject.minTime;
        this.maxTime = selectedObject.maxTime;
    }
    Selected.prototype.stratum = function(key) {
        return _.find(this.strataFields, function(d) {
            return d.key === key;
        });
    };
    Selected.prototype.strataKeys = function() {
        return _.map(this.strataFields, function(s) { return s.key; });
    };

    /**
     * Model to hold configuration information and acts as intermediary
     * between controller and data model
     * @param {DataModel} dataModel - The data model to fetch trend data
     */
    function ConfigurationModel(dataModel) {
        /**
         * The actual data model that hold trend information
         * @type {DataModel}
         */
        this.dataModel = dataModel;

        /**
         * Strata fields for this trend tool.  Each stratum is expected to
         * have one or more categories associated with it.
         * @type {[StratumField]}
         */
        this.strataFields = null;

        /**
         * Variables to use as the continuous values under consideration
         * @type {[VariableField]}
         */
        this.variableFields = null;

        /**
         * Variables to use as the series under consideration
         * @type {[SeriesField]}
         */
        this.seriesFields = null;

        /**
         * Variable that holds information about the time axis
         * @type {TimeField}
         */
        this.timeField = null;

        /**
         * Variable that holds information about the weight variable
         * @type {WeightField}
         */
        this.weightField = null;

        /**
         * The currently selected configuration
         * @type {Selected}
         */
        this.selected = null;

        /**
         * The threshold at which to display warnings about low weights
         * @type {number}
         */
        this.lowAreaThreshold = 0.0;

        /**
         * The threshold at which to not display series because of low weights
         * @type {number}
         */
        this.minimumAreaThreshold = 0.0;

        /**
         * If present, this holds plot-based information about prediction accuracy
         * used to correct predicted map areas
         * @type {OlofssonModel}
         */
        this.olofssonModel = null;
    }

    /**
     * Initialize the configuration object and, in turn, the member data model.  Once
     * filled, return the data needed to initially populate the menu view
     * @param {Object} configData - The original parsed JSON object
     * @param {Function} callback
     */
    ConfigurationModel.prototype.initialize = function(configData, callback) {
        callback = callback || function() {};
        var self = this;

        // Sets a number of instance-level variables for easy access
        self.strataFields = self._setStrataFromConfig(configData);
        self.variableFields = self._setVariablesFromConfig(configData);
        self.timeField = self._setTimeFromConfig(configData);
        self.weightField = self._setWeightFromConfig(configData);
        self.seriesFields = _.map(self.strataFields, function(sf) {
            return new SeriesField(sf.key, sf.alias);
        });
        self.lowAreaThreshold = parseFloat(configData.warningAreaThreshold);
        self.minimumAreaThreshold = parseFloat(configData.minimumAreaThreshold);

        // Ensure that all fields match between config and data
        if (!_.isEqual(self.getSortedFieldNames(), self.dataModel.getSortedFieldNames())) {
            var msg = 'Fields from JSON and CSV differ.  Check both files';
            throw Error(msg);
        }

        // Massage the data based on configuration information
        self.dataModel.initialize(self, function(trendData) {
            // Find unique values in each categorical field
            var uniqCats = _.fromPairs(_.map(self.strataFields, function (sf) {
                var uniq = self.dataModel.getFieldUniqueValues(trendData, sf.key);
                return [ sf.key, uniq ];
            }));

            // Drop all categories without representation in the data
            self.strataFields.forEach(function(sf) {
                sf.categories = sf.categories.filter(function(c) {
                    return uniqCats[sf.key].includes(c.key);
                });
            });

            // Read in the plot data for Olofsson if it exists
            self.readOlofsson(configData, function() {
                // Set initially selected variables and return this object
                self._initializeSelected(function(selected) {
                    self.selected = selected;
                    callback(self);
                });
            });
        });
    };

    /**
     * Read in plot prediction accuracy information that provides error-adjusted
     * area estimates (see Olofsson et al. (2013) RSE: 129:122-131
     * @param configData
     * @param callback
     */
    ConfigurationModel.prototype.readOlofsson = function(configData, callback) {
        var self = this;
        callback = callback || function() {};
        if (configData.olofsson) {
            self.olofssonModel = new window.app.OlofssonModel();
            self.olofssonModel.initialize(configData, function() {
                callback();
            })
        } else {
            callback();
        }
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
        self.dataModel.read(function(data) {
            var timeRange = self.dataModel.getFieldRange(data, self.timeField.key);
            callback(new Selected({
                strataFields: _.cloneDeep(self.strataFields),
                seriesField: self.seriesFields[0],
                variableField: self.variableFields[0],
                timeField: self.timeField,
                weightField: self.weightField,
                minTime: timeRange[0],
                maxTime: timeRange[1]
            }));
        });
    };

    /**
     * Returns filtered fields from raw configuration object
     * @param {Object} configData - The original parsed JSON object
     * @param {Array} types - The types of variables for which to filter
     * @returns {Array}
     * @private
     */
    ConfigurationModel.prototype._getFieldsFromConfig = function (configData, types) {
        return configData.variables.filter(function (d) {
            return types.includes(d.type);
        });
    };

    /**
     * Build strata information from raw configuration information
     * @param {Object} configData - The original parsed JSON object
     * @returns {Array}
     * @private
     */
    ConfigurationModel.prototype._setStrataFromConfig = function(configData) {
        var strata = this._getFieldsFromConfig(configData, ['categorical']);
        var colors = d3.scale.category10().range();
        var nColors = 10;
        return _.map(strata, function(stratum) {
            var colorIndex = 0;
            var categories = _.map(stratum.categories, function(cat) {
                return new Category(
                    cat.key,
                    cat.alias,
                    colors[colorIndex++ % nColors]
                );
            });
            var groups = _.map(stratum.groups, function(group) {
                return new GroupCategory(
                    group.key,
                    group.alias,
                    colors[colorIndex++ % nColors],
                    group.items
                );
            });
            return new StratumField(
                stratum.key,
                stratum.alias,
                categories,
                groups
            );
        });
    };

    /**
     * Build variable information from raw configuration information.  Both
     * continuous and weight type fields are considered valid
     * @param {Object} configData - The original parsed JSON object
     * @returns {Array} - All variable fields
     * @private
     */
    ConfigurationModel.prototype._setVariablesFromConfig = function(configData) {
        var variables = this._getFieldsFromConfig(configData, ['continuous', 'weight', 'total']);
        return _.map(variables, function(variable) {
            return new VariableField(
                variable.key,
                variable.alias,
                variable.units,
                variable.type
            );
        });
    };

    /**
     * Get the time field from raw configuration information
     * @param {Object} configData - The original parsed JSON object
     * @returns {TimeField} - The stored time field
     * @private
     */
    ConfigurationModel.prototype._setTimeFromConfig = function(configData) {
        var timeFields = this._getFieldsFromConfig(configData, ['time']);
        if (timeFields.length !== 1) {
            var msg = 'There must be exactly one time field';
            throw Error(msg);
        }
        return new TimeField(
            timeFields[0].key,
            timeFields[0].alias
        );
    };

    /**
     * Get the weight field from raw configuration information
     * @param {Object} configData - The original parsed JSON object
     * @returns {WeightField} - The stored weight field
     * @private
     */
    ConfigurationModel.prototype._setWeightFromConfig = function(configData) {
        var weightFields = this._getFieldsFromConfig(configData, ['weight']);
        if (weightFields.length !== 1) {
            var msg = 'There must be exactly one weight field';
            throw Error(msg);
        }
        return new WeightField(
            weightFields[0].key,
            weightFields[0].alias,
            weightFields[0].units
        );
    };

    /**
     * Returns all field names (keys) associated with this configuration object
     * @returns {Array}
     * @private
     */
    ConfigurationModel.prototype.getSortedFieldNames = function() {
        var self = this;
        var fieldNames = _.union(
            self.strataKeys(),
            self.variableKeys(),
            [self.timeField.key],
            [self.weightField.key]
        );
        return _.uniq(fieldNames).sort();
    };
    ConfigurationModel.prototype.strataKeys = Selected.prototype.strataKeys;
    ConfigurationModel.prototype.stratum = Selected.prototype.stratum;
    ConfigurationModel.prototype.constructor = ConfigurationModel;

    ConfigurationModel.prototype.variableKeys = function() {
        return _.map(this.variableFields, function(vf) { return vf.key; });
    };

    /**
     * Getter for an individual variable in this.variableFields.  Because
     * this.variableFields is an array, we search for the key within this array
     * @param {string} key - Variable key for which to search
     * @returns {Object} - The matching entry in this.variableFields
     */
    ConfigurationModel.prototype.variable = function(key) {
        return _.find(this.variableFields, function(d) {
            return d.key === key;
        });
    };

    /**
     * Getter for an individual series in this.seriesFields.  Because
     * this.seriesFields is an array, we search for the key within this array
     * @param {string} key - Series key for which to search
     * @returns {Object} - The matching entry in this.seriesFields
     */
    ConfigurationModel.prototype.series = function(key) {
        return _.find(this.seriesFields, function(d) {
            return d.key === key;
        });
    };

    /**
     * Filter and group data records based on currently selected configuration
     * Return this information via callback
     * @param {Function} callback
     */
    ConfigurationModel.prototype.filterGroupRecords = function(callback) {
        callback = callback || function() {};
        this.dataModel.filterGroupRecordsFromConfig(this, callback);
    };

    ConfigurationModel.prototype.filterOlofssonRecords = function(data, callback) {
        callback = callback || function() {};
        if (this.olofssonModel)
            this.olofssonModel.filterRecordsFromConfig(this, data, callback);
        else
            callback(null);
    };

    window.app = window.app || {};
    window.app.Field = KeyValuePair;
    window.app.Category = Category;
    window.app.GroupCategory = GroupCategory;
    window.app.StratumField = StratumField;
    window.app.TimeField = TimeField;
    window.app.SeriesField = SeriesField;
    window.app.WeightField = WeightField;
    window.app.VariableField = VariableField;
    window.app.Selected = Selected;
    window.app.ConfigurationModel = ConfigurationModel;
}(window));
