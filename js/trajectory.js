// Master object for holding the current parameters
var parameters = {
    focus: {},
    series: [],
    years: [0, 0],
    yearVariable: "",
    countVariable: "",
    variable: ""
};
var rawData,
    filteredData,
    strata;

$(document).ready(function() {
  $('#main-container').hide();

  $('.ui.menu .item')
    .tab()
  ;

  $.getJSON("trajectory.json", function(data) {
    // Get the categorical fields
    var catFields = _.chain(data.variables)
      .filter(function(d) { return d.type == "categorical" })
      .map(function(d) { return d.name; })
      .value();

    // Get the continuous fields
    var contFields = _.chain(data.variables)
      .filter(function(d) { return d.type == "continuous"; })
      .map(function(d) { return d.name; })
      .value();

    // Ensure one and only one year field
    var yearFields = _.chain(data.variables)
      .filter(function(d) { return d.type == "year"; })
      .map(function(d) { return d.name; })
      .value();
    if (yearFields.length != 1) {
      console.log("There must be exactly one year field!");
    }
    parameters.yearVariable = yearFields[0];

    // Ensure one and only one area (weighting) field
    var areaFields = _.chain(data.variables)
      .filter(function(d) { return d.type == "area"; })
      .map(function(d) { return d.name; })
      .value();
    if (areaFields.length != 1) {
      console.log("There must be exactly one area field!");
    }
    parameters.countVar = areaFields[0];

    // TODO: Test just adding count to contFields
    contFields.push(parameters.countVar);

    // Union of all fields from the JSON file
    var jsonFields = _.union(catFields, contFields, yearFields, areaFields);

    // Open the CSV file 
    d3.csv(data.fn, function(error, rows) {
      if (error) throw error;
      rawData = rows;

      // Ensure that all fields are accounted for from the JSON file
      var csvFields = Object.keys(rawData[0]);
      var sameFields = _.isEqual(jsonFields.sort(), csvFields.sort());
      // TODO: Raise error if this is not true

      // Find the unique values of all categorical variables
      strata = _.map(catFields, function(f) {
        return {
          key: f,
          values: _.chain(rawData)
            .map(function(d) { return d[f]; })
            .uniq()
            .sortBy(function(k) { return k; })
            .value()
        };
      });

      // Add to the parameters object
      _.forEach(strata, function(s) {
        parameters.focus[s.key] = s.values;
      });

      // Find the unique values for years
      var years = _.chain(rawData)
        .map(function(d) { return +d[parameters.yearVariable]; })
        .uniq()
        .sortBy(function(k) { return k; })
        .value();
      parameters.years[0] = _.min(years, function(d) { return +d; });
      parameters.years[1] = _.max(years, function(d) { return +d; });

      $.each(strata, function(i, item) {
        // Create a label and pulldown for each stratum and add to the
        // focus element
        var o = createStratumDropdown(item);
        $('#focus').append(o.label);
        $('#focus').append(o.pulldown);

        // Initialize the focus dropdown menus
        $('#focus .ui.dropdown').dropdown({
          onChange: focusDropdownChange
        });
      });

      // Create a multiselect dropdown for series
      var o = createSeriesDropdown(strata);
      $('#series').append(o);

      // Initialize the series dropdown menu
      $('#series .ui.dropdown').dropdown({
        onChange: seriesDropdownChange
      });

      // Create the year slider
      o = createYearSlider(years);
      $('#series').append(o);

      // Initialize the year slider events
      $('#series #year-slider').slider({
        slide: yearSliderChange,
        stop: yearSliderStop
      }); 

      // Create a select box for variable
      o = createVariableDropdown(contFields);
      $('#variable').append(o);

      // Initialize the variable dropdown menu
      $('#variable .ui.dropdown').dropdown({
        onChange: variableDropdownChange
      });

      // Initialize the selected info box
      initSelected(strata, years);

      // Get the currently filtered data
      filteredData = filterData();

      // Update the count of matching records
      updateCount(filteredData);

      // Set a handler for the resize window
      d3.select(window).on('resize', resizeChart); 

      // Finished loading - reveal the form
      $('#main-container').show(function() {
        initChart();
        $('.dimmer').fadeOut(1000);
      });
    });
  });
});
