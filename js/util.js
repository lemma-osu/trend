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
      var f = _.filter(data.variables, function(d) {
        return d.type == type;
      });
      return _.object(_.map(f, function(d) { return [d.key, d]; }));
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
    // this.selected.series = this.catFields[_.keys(this.catFields)[0]];
    // this.selected.variable = yearFields[_.keys(yearFields)[0]];
    // TODO: Change these once done testing
    this.selected.series = this.catFields['DR'];
    this.selected.variable = this.contFields['BA_GE_3_WEIGHTED_MEAN'];
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

  // Set selected elements based on the key passed in
  this.setSelected = function(mapping) {
    var config = this;
    _.forEach(_.keys(mapping), function(k) {
      var v = mapping[k];
      var value;
      switch(k) {
        case 'series':
          value = config.catFields[v];
          break;
        case 'variable':
          value = config.contFields[v];
          break;
        default:
          var msg = 'Value ' + k + ' is not allowed to be set for selected';
          throw Error(msg);
      }
      config.selected[k] = value;
    }); 
  };

  this.getSelected = function() {
    return this.selected;
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
  var series = _.uniq(_.map(data, function(d) { return d[seriesVar]; }));

  // Get the continuous variable
  var contVar = s.variable.key;

  // Get the count variable
  var countVar = s.area.key;

  // Get the years to plot
  var yearVar = s.year.key;
  var minYear = s.years[0];
  var maxYear = s.years[1];

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
        })
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
        })
      };
    }
  });
  return {data: seriesData, count: recordCount};
};
