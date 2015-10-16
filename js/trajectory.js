var config;
var rawData,
    filteredData,
    compositeContainer;

$(document).ready(function() {

  // Hide the main container until the data has been read in
  $('#main-container').hide();

  var jsonFn = getJSONFilename(document.URL);
  $.getJSON(jsonFn, function(data) {
    // Read the JSON data into a new configuration object
    config = new Configuration(data);

    // Open the CSV file
    d3.csv(data.fn, function(error, rows) {
      if (error) throw error;
      rawData = rows;

      // Ensure that all fields are accounted for from the JSON file
      var csvFields = _.keys(rawData[0]);
      if (!_.isEqual(config.getFields().sort(), csvFields.sort())) {
        msg = 'Fields from JSON and CSV differ.  Check both files'
        throw Error(msg);
      }

      // Convert all numeric fields
      var numberFields = _.chain()
        .union(_.keys(config.contFields), [config.selected.year.key])
        .uniq()
        .value();
      _.forEach(rawData, function(r) {
        _.forEach(numberFields, function(f) {
          r[f] = +r[f];
        });
      });

      // Find the unique values of all categorical variables - this also
      // initializes the selected strata to be all categories in each
      // stratum
      config.initializeStrata(rawData);

      // Find the unique values for years
      config.initializeYearRange(rawData);

      // Initialize the information panel of currently selected configuration 
      initInformation(config);

      // Create actions that can be used across all modal menus
      var actions = $('<div class="actions"></div>');
      actions.append('<div class="ui positive button">OK</div>');
      actions.append('<div class="ui cancel button">Cancel</div>');

      // Create modal menus for all strata
      _.each(_.keys(config.strata), function(k, i) {
        // TODO: Change this to alias of each category
        var items = _.map(config.strata[k], function(d) {
          return { key: d, alias: d }
        });
        createModalDropdownMenu({
          modalId: 'focus' + i + '-modal',
          header: config.catFields[k].alias,
          actions: actions,
          f: focusDropdownChange,
          dropdownId: k,
          dropdownItems: items,
          multiple: true,
          defaultText: 'All'
        });
      });

      // Create a modal menu with dropdown for series
      createModalDropdownMenu({
        modalId: 'series-modal',
        header: 'Series',
        actions: actions,
        f: seriesDropdownChange,
        dropdownId: 'series-dropdown',
        dropdownItems: config.catFields,
        multiple: false,
        defaultText: 'None'
      });
     
      // Create a modal menu with dropdown for variable 
      createModalDropdownMenu({
        modalId: 'variable-modal',
        header: 'Variable',
        actions: actions,
        f: variableDropdownChange,
        dropdownId: 'variable-dropdown',
        dropdownItems: config.contFields,
        multiple: false,
        defaultText: 'None'
      });

      // Create a modal menu with slider for the year range 
      createModalSliderMenu({
        modalId: 'year-modal',
        header: 'Year Range',
        actions: actions,
        onChange: yearSliderChange,
        onStop: yearSliderStop,
        limits: config.selected.years,
        sliderId: 'year-slider'
      });
  
      // In the modal menus, set the selected values from config
      var s = config.selected;
      $('#series-dropdown').dropdown('set selected', s.series.key);
      $('#variable-dropdown').dropdown('set selected', s.variable.key);

      // Get the currently filtered data
      filteredData = filterData(config);

      // Update the count of matching records
      updateRecordCount(filteredData.count);

      // Finished loading - reveal the form
      $('#main-container').fadeIn(500, function() {
        // $('.dimmer').fadeOut();

        // Get width of the chart element and set height to static for now
        var width = $('#chart').width(),
          height = 400;

        // Create the container to hold one panel - this will later be
        // extended to contain all panels
        compositeContainer = models.compositeContainer()
            .xAxis.label(config.selected.year.alias)
            .width(width)
            .height(height);

        // Render the chart
        var svg = d3.select('#chart svg')
          .datum(filteredData.data)
          .attr('width', width)
          .attr('height', height)
          .call(compositeContainer);
      });
    });
  });
});
