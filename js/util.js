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

/**
 * Filter data based on the current selection.  This is called on most
 * user interactions, whenever parameters are changed
 * @param {object} config - The main configuration object which specifies
 *   the current selection 
 * @return (object) - The data to graph and the current number of records
 */
var filterData = function(config) {
  // Start with the full data set and filter the records based on the 
  // presence of the allowed focus filters for each stratum.  This doesn't
  // seem very efficient in that it has to iterate over each stratum.
  var data = rawData;
  _.each(config.selected.focus, function(v, k) {
    data = _.filter(data, function(d) { return _.contains(v, d[k]); });
  });

  var recordCount = data.length;

  // Now that we have the matching records, group by the unique values in 
  // the series data and return 
  var s = config.selected;
  var seriesVar = s.series.key;
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

  // Get the categories in this series for the color choices
  var cats = config.catFields[seriesVar].categories;

  // Get the data for each series value.  This is a somewhat convoluted bit
  // of code, but it first maps a function over all unique series which
  // subsets the data down to just those records with that series value.
  // Then it finds the unique years for those records and sorts those to 
  // ensure that the series ordering is correct.  Finally, it returns an
  // object of the series value ('series') and an array of values that 
  // should be the same size as the unique number of years.  These values
  // are the area weighted average of continuous variable (contVar).  
  var seriesData = series.map(function(s) {
    // Filter for series
    var subset = _.filter(data, function(d) { return d[seriesVar] == s; });

    // Filter for years
    subset = _.filter(subset, function(d) { 
      return d[yearVar] >= minYear && d[yearVar] <= maxYear; 
    });
    var years = _.uniq(_.map(subset, function(d) { return +d[yearVar]; }));
    years = _.sortBy(years, function(y) { return y; });

    var color = cats[s].color;
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

