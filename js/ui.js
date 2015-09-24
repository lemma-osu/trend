var createStratumDropdown = function(item) {
  // Create a label with the stratum name
  var labelDiv = $('<div>').attr({
    'class': 'two wide column'
  });
  var label = $('<div>').attr({
    'class': 'header',
  }).text(item.key);
  $(labelDiv).append(label);

  // Create a pulldown with the choices
  var pulldownDiv = $('<div>').attr({
    'class': 'fourteen wide column'
  });
  var pulldown = $('<div>').attr({
    'id': item.key,
    'class': 'ui fluid multiple search selection dropdown'
  });
  $(pulldown).append('<i class="dropdown icon"></i>');
  $(pulldown).append('<div class="default text">All</div>');
  var menu = $('<div>').attr({
    'class': 'menu'
  });
  $.each(item.values, function(i, subitem) {
    var choice = $('<div>').attr({
      'class': 'item',
      'data-value': subitem
    }).text(subitem);
    $(menu).append(choice);
  });
  $(pulldown).append(menu);
  $(pulldownDiv).append(pulldown);
  return {label: labelDiv, pulldown: pulldownDiv };
};

var createSeriesDropdown = function(items) {
  // Create a pulldown with the choices
  var pulldownDiv = $('<div>').attr({
    'class': 'ten wide column'
  });
  var pulldown = $('<div>').attr({
    'id': 'series-pulldown',
    'class': 'ui fluid search selection dropdown'
  });
  $(pulldown).append('<i class="dropdown icon"></i>');
  $(pulldown).append('<div class="default text">None</div>');
  var menu = $('<div>').attr({
    'class': 'menu'
  });
  $.each(items, function(i, item) {
    var choice = $('<div>').attr({
      'class': 'item',
      'data-value': item.key
    }).text(item.key);
    $(menu).append(choice);
  });
  $(pulldown).append(menu);
  $(pulldownDiv).append(pulldown);
  return pulldownDiv;
};

var createYearSlider = function(years) {
  var yearMin = _.min(years);
  var yearMax = _.max(years);
  var sliderDiv = $('<div>').attr({
    'class': 'six wide column'
  });
  var yearRange = $('<div>').attr({
    'id': 'year-range'
  }).text("Year Range: " + yearMin + " - " + yearMax);
  var slider = $('<div>').attr({
    'id': 'year-slider'
  });
  $(slider).slider({
    range: true,
    min: yearMin,
    max: yearMax,
    values: [ yearMin, yearMax ]
  });
  $(sliderDiv).append(yearRange);
  $(sliderDiv).append(slider);
  return sliderDiv;
};

var createVariableDropdown = function(items) {
  // Create a pulldown with the choices
  var pulldownDiv = $('<div>').attr({
    'class': 'sixteen wide column'
  });
  var pulldown = $('<div>').attr({
    'id': 'variable-pulldown',
    'class': 'ui fluid search selection dropdown'
  });
  $(pulldown).append('<i class="dropdown icon"></i>');
  $(pulldown).append('<div class="default text">None</div>');
  var menu = $('<div>').attr({
    'class': 'menu'
  });
  $.each(items, function(i, item) {
    var choice = $('<div>').attr({
      'class': 'item',
      'data-value': item
    }).text(item);
    $(menu).append(choice);
  });
  $(pulldown).append(menu);
  $(pulldownDiv).append(pulldown);
  return pulldownDiv;
};

// Function to fire when the selection info box is initialized
var initSelected = function(strata, years) {
  // Focus list
  $.each(strata, function(i, item) {
    var listID = "li-" + item.key;
    var listEl = $('<li>').attr({
      'id': listID
    }).text(item.key + ': All');
    $('#focus-list').append(listEl);
  });

  // Series and variable lists
  var listEl = $('<li>').text('None');
  $('#series-list').append(listEl);
  listEl = $('<li>').text('None');
  $('#variable-list').append(listEl);

  // Year range
  listEl = $('<li>').text(_.min(years) + ' - ' + _.max(years));
  $('#year-list').append(listEl);

};
    
// Function to fire when the focus dropdown lists are changed
var focusDropdownChange = function(d) {
  // Get the tab associated with this dropdown
  var tab = $(this).closest(".tab").attr("data-tab");

  // Get the ID associated with this dropdown
  var id = $(this).attr("id");

  // Split the values in d, sort, then cast back to string
  // If nothing is chosen, we consider this to be unfiltered and include all
  var choices = _.sortBy(d.split(","), function(x) { return x });
  var choiceStr;
  if (choices.length > 0 && choices[0] != "") {
    parameters.focus[id] = choices;
    choiceStr = id + ": " + choices.join(", ");
  } else {
    var d = _.filter(strata, function(d) { return d.key == id; })[0];
    parameters.focus[id] = d.values;
    choiceStr = id + ": All";
  }

  // Update the part of the current selections with this information
  var listContainer = $('#' + tab + "-list");
  var listID = "#li-" + id;
  $(listContainer).children(listID).first().text(choiceStr);
  filteredData = filterData();
  updateCount(filteredData);
  updateChart(filteredData);
};

var seriesDropdownChange = function(d) {
  parameters.series = d;
  var str = (d != "" ? d : "None");
  $('#series-list li:first-child').text(str);
  updateChart(filteredData);
};

var yearSliderChange = function(event, ui) {
  var yearRangeStr = ui.values[0] + " - " + ui.values[1];
  parameters.years[0] = +ui.values[0];
  parameters.years[1] = +ui.values[1];
  $('#year-range').text("Year Range: " + yearRangeStr);
  $('#year-list').children().first().text(yearRangeStr);
  // updateChart(filteredData);
};

var yearSliderStop = function(event, ui) {
  updateChart(filteredData);
} 

var variableDropdownChange = function(d) {
  parameters.variable = d;
  var str = (d != "" ? d : "None");
  $('#variable-list li:first-child').text(str);
  updateChart(filteredData);
};

var filterData = function() {
  var filtered = rawData;
  _.each(parameters.focus, function(v, k) {
    filtered = _.chain(filtered)
      .filter(function(d) { return _.contains(v, d[k]); })
      .value();
  });
  return filtered;
};

var updateCount = function(filtered) {
  $('#matching-count').text('Matching Records = ' + filtered.length);
  if (filtered.length == 0) {
    raiseWarning();
  } else {
    clearWarning();
  }
};

var raiseWarning = function() {
  $('#parameters').attr({
    'class': 'ui negative message'
  });
};

var clearWarning = function() {
  $('#parameters').attr({
    'class': 'ui info message'
  });
};
