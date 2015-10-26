/**
 * Main configuration object - this stores all the metadata information
 * describing the trajectory data and identifies the current selection.
 * @param {object} data - The JSON specification of the trajectory data
 */
function Configuration(data) {

  // Read in the JSON specification of the fields and separate them into 
  // separate classes
  this.initialize = function(data) {
    function getFields(type) { 
      var colors = d3.scale.category20().range();
      var f = _.filter(data.variables, function(d) {
        return d.type == type;
      });
      return _.object(_.map(f, function(d) {
        // If this is a categorical variable, store the categories as key/value
        // pairs instead of an array.  We also assign a unique color to this
        // category so that it can be used consistently across graphs
        if (type == 'categorical') {
          d.categories = _.object(_.map(d.categories, function(x, i) {
            return [x.key, {'alias': x.alias, 'color': colors[i % 20]}];
          })); 
          d.groups = _.object(_.map(d.groups, function(x, i) {
            return [x.key, {
              'alias': x.alias, 'color': colors[i % 20], 'items': x.items
            }];
          }));
        }
        return [d.key, d];
      }));
    };

    // Separate the different types of fields
    this.selected = {};

    this.catFields = getFields('categorical');
    this.contFields = getFields('continuous');
    var areaFields = getFields('area');
    if (_.keys(areaFields).length != 1) {
      var msg = 'There must be exactly one area field';
      throw Error(msg); 
    }
    // Push the area field into the object of allowable continuous fields
    var k = _.keys(areaFields)[0];
    this.contFields[k] = areaFields[k];

    // Do the same with the year field
    var yearFields = getFields('year');
    if (_.keys(yearFields).length != 1) {
      var msg = 'There must be exactly one year field';
      throw Error(msg); 
    }

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
    this.strata = _.object(_.map(this.catFields, function(f) {
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
  // Filter to just the items in this group.  At the same time, remove the
  // key from each record to make grouping easier 
  var filteredData = _.chain(data)
    .filter(function(d) { return _.contains(items, d[key]); })
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
    obj = {};
    // Set the values for the categorical variables, setting the key 
    // currently being considered to the group value (g)
    obj[key] = g;

    // Mark this as a grouped record
    obj.grouped = true;

    var group = groupKey.split(','); 
    _.each(_.zip(groupKeys, group), function(item, j) {
      obj[item[0]] = item[1]; 
    });

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
  // Aliases to selected data
  var s = config.selected;
  var seriesVar = s.series.key;

  // Start with the full data set and filter the records based on the 
  // presence of the allowed focus filters for each stratum.  This doesn't
  // seem very efficient in that it has to iterate over each stratum.
  var data = rawData;
  _.each(s.focus, function(v, k) {
    if (k == seriesVar) {
      // If this stratum matches the series variable, collect all records
      cats = v;
    } else {
      // Otherwise find the unique set of categories covered by this stratum
      // and we use this to filter for only non-grouped records below
      var cats = [];
      _.each(v, function(d) {
        var groups = config.catFields[k].groups;
        if (_.contains(_.keys(groups), d)) {
          cats = cats.concat(groups[d].items);
        } else {
          cats.push(d);
        }
      });
      cats = _.uniq(cats);
    }
    data = _.filter(data, function(d) { return _.contains(cats, d[k]); });
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

  // Get the count variable
  var countVar = s.area.key;

  // Get the years to plot
  var yearVar = s.year.key;
  var minYear = s.years[0];
  var maxYear = s.years[1];

  // Get the color choices
  var groups = config.catFields[seriesVar].groups;
  var items = config.catFields[seriesVar].categories;
  var colors = _.object(_.map(series, function(d) {
    if (_.contains(_.keys(groups), d)) {
      return [d, groups[d].color];
    } else {
      return [d, items[d].color];
    }
  }));

  // Get the data for each series value.  This is a somewhat convoluted bit
  // of code, but it first maps a function over all unique series which
  // subsets the data down to just those records with that series value.
  // Then it finds the unique years for those records and sorts those to 
  // ensure that the series ordering is correct.  Finally, it returns an
  // object of the series value ('series') and an array of values that 
  // should be the same size as the unique number of years.  These values
  // are the area weighted average of continuous variable (contVar).  
  var seriesData = series.map(function(s) {
    // Filter for this series - if this is a grouped series, we include all 
    // records, otherwise only include records that are not grouped to avoid
    // double-counting
    var subset = _.filter(data, function(d) {
      if (_.contains(_.keys(groups), s)) {
        return d[seriesVar] == s;
      } else { 
        return d[seriesVar] == s && d.grouped == false;
      }
    });

    // Filter for years
    subset = _.filter(subset, function(d) { 
      return d[yearVar] >= minYear && d[yearVar] <= maxYear; 
    });
    var years = _.uniq(_.map(subset, function(d) { return +d[yearVar]; }));
    years = _.sortBy(years, function(y) { return y; });

    var color = colors[s];
    if (contVar != countVar) {
      return {
        label: s,
        data: years.map(function(y) {
          var subsetYear = _.filter(subset, function(d) {
            return d[yearVar] == y;
          });
          var w_s = _.reduce(subsetYear, function(memo, d) {
            return memo + (d[countVar] * d[contVar]);
          }, 0);
          var w = _.reduce(subsetYear, function(memo, d) {
            return memo + (d[countVar]);
          }, 0);
          return [y, w_s / w];
        }),
        color: color
      };
    } else {
      return {
        label: s,
        data: years.map(function(y) {
          var subsetYear = _.filter(subset, function(d) {
            return d[yearVar] == y;
          });
          var w = _.reduce(subsetYear, function(memo, d) {
            return memo + (d[countVar]);
          }, 0);
          return [y, w];
        }),
        color: color
      };
    }
  });
  return {data: seriesData, count: recordCount};
};

function getJSONFilename(url) {
  var fn = 'trajectory.json';
  var q = url.split('?')[1];
  if (q != undefined) {
    q = q.split('&');
    var hash = q[0].split('=');
    if (hash[0] != 'json-filename') {
      var msg = 'Wrong query parameter key: ' + hash[0];
      throw Error(msg);
    }
    return hash[1];
  } else {
    return 'trajectory.json';
  }
};

