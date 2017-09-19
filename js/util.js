'use strict';

// JSHint options
/*globals _, d3, config, rawData*/

/**
 * Main configuration object - this stores all the metadata information
 * describing the trajectory data and identifies the current selection.
 * @param {object} data - The JSON specification of the trajectory data
 */
var Configuration = function(data) {
  // Read in the JSON specification of the fields and separate them into 
  // separate classes
  this.initialize = function(data) {
    var getFields = function(type) { 
      var colors = d3.scale.category20().range();
      var f = _.filter(data.variables, function(d) {
        return d.type == type;
      });
      return _.fromPairs(_.map(f, function(d) {
        // If this is a categorical variable, store the categories as key/value
        // pairs instead of an array.  We also assign a unique color to this
        // category so that it can be used consistently across graphs
        if (type == 'categorical') {
          d.categories = _.fromPairs(_.map(d.categories, function(x, i) {
            return [x.key, {'alias': x.alias, 'color': colors[i % 20]}];
          }));
          d.groups = _.fromPairs(_.map(d.groups, function(x, i) {
            return [x.key, {
              'alias': x.alias, 'color': colors[i % 20], 'items': x.items
            }];
          }));
        }
        return [d.key, d];
      }));
    };

    // Set the area thresholds for raising warnings or hiding on small strata
    this.warningAreaThreshold = parseFloat(data.warningAreaThreshold);
    this.minimumAreaThreshold = parseFloat(data.minimumAreaThreshold);

    // Separate the different types of fields
    this.selected = {};

    this.catFields = getFields('categorical');
    this.contFields = getFields('continuous');
    var areaFields = getFields('area');
    var msg;
    if (_.keys(areaFields).length != 1) {
      msg = 'There must be exactly one area field';
      throw Error(msg); 
    }
    // Push the area field into the object of allowable continuous fields
    var k = _.keys(areaFields)[0];
    this.contFields[k] = areaFields[k];

    // Do the same with the year field
    var yearFields = getFields('year');
    if (_.keys(yearFields).length != 1) {
      msg = 'There must be exactly one year field';
      throw Error(msg); 
    }

    // Total fields - variables that represent counts that should be totalled
    // across individual records, rather than taking a weighted average
    var totalFields = getFields('total');
    var ref = this.contFields;
    _.each(totalFields, function(f) {
        ref[f.key] = f;
    });

    // Initialize selected values
    this.selected.series = this.catFields[_.keys(this.catFields)[0]];
    this.selected.variable = this.contFields[_.keys(this.contFields)[0]];
    this.selected.area = areaFields[_.keys(areaFields)[0]];
    this.selected.year = yearFields[_.keys(yearFields)[0]];
  };

  // Return all fields from this configuration
  this.getFields = function() {
    return _.chain()
      .union(
        _.keys(this.catFields),
        _.keys(this.contFields),
        [this.selected.year.key],
        [this.selected.area.key]
      )
      .uniq()
      .value();
  };

  this.initializeStrata = function(data) {
    this.strata = _.fromPairs(_.map(this.catFields, function(f) {
      return [ f.key,
        _.chain(rawData)
          .map(function(d) { return d[f.key]; })
          .uniq()
          .sortBy(function(k) { return k; })
          .value()
      ];
    }));
    this.selected.focus = _.clone(this.strata);
  };

  this.initializeYearRange = function(data) {
    this.selected.years = [];
    var years = _.chain(rawData)
      .map(function(d) { return d[config.selected.year.key]; })
      .uniq()
      .sortBy(function(k) { return k; })
      .value();
    this.selected.years.push(_.min(years, function(d) { return +d; }));
    this.selected.years.push(_.max(years, function(d) { return +d; }));
  };

  this.initialize(data);
};

var calculateGroupData = function(data, key, g, items) {
  'use strict';
  // Filter to just the items in this group.  At the same time, remove the
  // key from each record to make grouping easier 
  var filteredData = _.chain(data)
    .filter(function(d) { return _.includes(items, d[key]); })
    .map(function(d) { return _.omit(d, key); })
    .value();

  // Group by the remaining categorical fields.  This will create groups for
  // each unique combination.  Note that the group key becomes a
  // comma-delimited string.
  var contKeys = _.keys(config.contFields);
  var groups = _.groupBy(filteredData, function(d) {
    return _.values(_.omit(d, contKeys));
  });
  var groupKeys = _.keys(_.omit(filteredData[0], contKeys));

  // Create a new data record for each combination and this group.
  var areaField = config.selected.area.key;
  var newData = [];
  _.each(groups, function(groupData, groupKey) {
    var obj = {};
    // Set the values for the categorical variables, setting the key 
    // currently being considered to the group value (g)
    obj[key] = g;

    var group = groupKey.split(','); 
    _.each(_.zip(groupKeys, group), function(item, j) {
      obj[item[0]] = item[1]; 
    });

    // Mark this as a grouped record
    obj.grouped = true;

    // Calculate the total area once
    var totalArea = _.reduce(groupData, function(memo, d) {
      return memo + d[areaField];
    }, 0);

    // For each continuous variable, calculate either the weighted mean
    // or sum of area 
    _.each(config.contFields, function(v, k) {
      if (k == areaField) {
        obj[k] = totalArea;
      } else {
        var total = _.reduce(groupData, function(memo, d) {
          return memo + (d[areaField] * d[k]);
        }, 0);
        obj[k] = total / totalArea;
      }
    });
    newData.push(obj);
  });
  return newData;
};

/**
 * Filter data based on the current selection.  This is called on most
 * user interactions, whenever parameters are changed
 * @param {object} config - The main configuration object which specifies
 *   the current selection 
 * @return (object) - The data to graph and the current number of records
 */
var filterData = function(config) {
  'use strict';
  // Aliases to selected data
  var s = config.selected;
  var seriesVar = s.series.key;

  // Start with the full data set and filter the records based on the 
  // presence of the allowed focus filters for each stratum.  This doesn't
  // seem very efficient in that it has to iterate over each stratum.
  var conds = {};
  var cats;
  _.each(s.focus, function(v, k) {
    if (k == seriesVar) {
      // If this stratum matches the series variable, collect all records
      cats = v;
    } else {
      // Otherwise find the unique set of categories covered by this stratum
      // and we use this to filter for only non-grouped records below
      cats = [];
      _.each(v, function(d) {
        var groups = config.catFields[k].groups;
        if (_.includes(_.keys(groups), d)) {
          cats = cats.concat(groups[d].items);
        } else {
          cats.push(d);
        }
      });
      cats = _.uniq(cats);
    }
    conds[k] = cats;
  });
  var data = _.filter(rawData, function(d) { 
    return _.every(conds, function(v, k) { return _.includes(v, d[k]); });
  });

  var recordCount = data.length;

  // Now that we have the matching records, group by the unique values in 
  // the series data and return 
  var series = _.chain(data)
    .map(function(d) { return d[seriesVar]; })
    .uniq()
    .sortBy(function(d) { return d; })
    .value();

  // Get the continuous variable
  var contVar = s.variable.key;
  var contVarType = config.contFields[contVar].type;

  // Get the count variable
  var countVar = s.area.key;

  // Get the years to plot
  var yearVar = s.year.key;
  var minYear = s.years[0];
  var maxYear = s.years[1];

  // Get the color choices
  var groups = config.catFields[seriesVar].groups;
  var items = config.catFields[seriesVar].categories;
  var colors = _.fromPairs(_.map(series, function(d) {
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
  var seriesData = _.zipObject(series, _.map(series, function(s) { return []; }));
  var groupKeys = _.keys(groups); 
  _.each(data, function(d) {
    if (d[yearVar] >= minYear && d[yearVar] <= maxYear) {
      _.each(groupKeys, function(g) {
        if (d[seriesVar] == g) {
          seriesData[g].push(d);
        }
      });
      if (d.grouped === false) {
        seriesData[d[seriesVar]].push(d);
      }
    }
  });

  // For each series, create aggregate information from all records.  First,
  // group the records by year, then return an object of the series
  // label, color and an array of year, value pairs.  For area variables
  // (e.g. countVar), values are the 'weights' themselves; for all other
  // variables, values are an area-weighted average.
  var seriesGroupedData = series.map(function(s) {
    var subset = seriesData[s];
    var yearGroups = _.groupBy(subset, function(d) {
      return d[yearVar];
    });

    // Calculate the minimum count across years associated with this series.
    // We need this information to warn on low counts
    var counts = _.map(yearGroups, function(items, y) {
      var w = _.reduce(items, function(memo, d) {
        return memo + (d[countVar]);
      }, 0);
      return w;
    });
    var minCount = _.min(counts);

    if (contVar != countVar) {
      if (contVarType != 'total') {
        return {
          label: s,
          color: colors[s],
          minCount: minCount, 
          data: _.map(yearGroups, function(items, y) {
            var w_s = _.reduce(items, function(memo, d) {
              return memo + (d[countVar] * d[contVar]);
            }, 0);
            var w = _.reduce(items, function(memo, d) {
              return memo + (d[countVar]);
            }, 0);
            return [y, w_s / w];
          })
        };
      } else {
        return {
          label: s,
          color: colors[s],
          minCount: minCount, 
          data: _.map(yearGroups, function(items, y) {
            var w = _.reduce(items, function(memo, d) {
              return memo + (d[contVar]);
            }, 0);
            return [y, w];
          })
        };
      }
    } else {
      return {
        label: s,
        color: colors[s],
        minCount: minCount, 
        data: _.map(yearGroups, function(items, y) {
          var w = _.reduce(items, function(memo, d) {
            return memo + (d[countVar]);
          }, 0);
          return [y, w];
        })
      };
    }
  });
  return {data: seriesGroupedData, count: recordCount};
};

/**
 * Retrieve the configuration JSON filename from the query string.  The
 * parameter in the query string is currently 'json-filename'.
 * @param {string} url - The current URL
 * @return (string) - If the json-filename key is specified, return the
 *   specified filename.  Otherwise, return the default
 *   'trajectory-default.json'.
 */
var getJSONFilename = function(url) {
  'use strict';
  var q = url.split('?')[1];
  if (q !== undefined) {
    q = q.split('&');
    var hash = q[0].split('=');
    if (hash[0] != 'json-filename') {
      var msg = 'Wrong query parameter key: ' + hash[0];
      throw Error(msg);
    }
    return hash[1];
  } else {
    return 'trajectory-default.json';
  }
};

/**
 * Convert currently shown data to an MIME-encoded CSV file.  Metadata is
 * written at the top of the file which represents the current strata being
 * used.
 * @param {object} config - The main configuration object which specifies
 *   the current selection 
 * @param {object} seriesData - The selected series data to export
 * @return (string) - The encoded CSV file 
 */
var convertToCSV = function(config, seriesData) {
  'use strict';
  // Get aliases on the configuration
  var s = config.selected;
  var cf = config.catFields;

  // Print out the strata
  var result = 'STRATA\n';
  _.each(s.focus, function(v, k) {
    if (v === config.strata[k]) {
      result += cf[k].alias + ':ALL\n';
    } else {
      result += cf[k].alias + ':' + v.join(';') + '\n';
    }
  });

  // Print out a bit more metadata
  result += '\nSERIES\n' + s.series.alias + '\n';
  result += '\nYEAR_RANGE\n' + s.years.join('-') + '\n';
  result += '\nVARIABLE\n' + s.variable.alias + ' (' + s.variable.units + ')\n';
  result += '\n';

  // Header line
  var header = [s.series.alias];
  var years = _.range(s.years[0], s.years[1] + 1);
  result += header.concat(years).join(',') + '\n';
 
  // Now print out the actual data: series are rows, years are columns and 
  // variable values are array elements
  _.each(seriesData.data, function(s) {
    var line = [ s.label ];
    var values = _.map(years, function(y) {
      var obj = _.find(s.data, function(d) { return d[0] == y.toString(); });
      return obj ? obj[1] : '';
    }).join(',');
    result += line.concat(values).join(',') + '\n';
  });

  return new Blob([result], { type: 'text/csv;charset=utf-8;' });
};

