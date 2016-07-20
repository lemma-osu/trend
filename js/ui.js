// JSHint options
/*globals _, $, config, convertToCSV, filterData:true, filteredData, updateChart*/

/**
 * Create Semantic UI dropdown menu 
 * @param {string} id - The ID to set on the dropdown element
 * @param {Array} items - The dropdown items.  This should be an array of
 *   objects, each with both key and alias keys
 * @param {bool} multiple - Flag for creating a multiple select dropdown list
 * @param {string} defaultText - The default text to show in the dropdown
 * @returns {HTMLDivElement} - The enclosing HTML div tag for the dropdown
 */
var createDropdown = function(id, items, multiple, defaultText) {
  'use strict';
  var dropdownDiv = $('<div>').attr({
    'class': 'sixteen wide column'
  });
  var classes = multiple ?
    'ui fluid multiple search selection dropdown' :
    'ui fluid search selection dropdown';
  var dropdown = $('<div>').attr({
    'id': id,
    'class': classes 
  });
  $(dropdown).append('<input type="hidden" name="value" />');
  $(dropdown).append('<i class="dropdown icon"></i>');
  $(dropdown).append('<div class="default text">' + defaultText + '</div>');
  var menu = $('<div>').attr({
    'class': 'menu'
  });
  _.each(items, function(item) {
    var choice;
    switch(item.type) {
      case 'group':
      case 'item':
        choice = $('<div>').attr({
          'class': 'item',
          'data-value': item.key
        }).text(item.alias);
        break;
      case 'header':
        choice = $('<div>').attr({
          'class': 'header'
        }).text(item.key);
        break;
      case 'divider':
        choice = $('<div>').attr({
          'class': 'divider'
        });
        break;
      default:
        var msg = 'Unknown dropdown item type';
        throw Error(msg);
    }
    $(menu).append(choice);
  });
  $(dropdown).append(menu);
  $(dropdownDiv).append(dropdown);
  return dropdownDiv;
};

/**
 * Create Semantic UI dropdown modal menu - this creates a modal menu with
 * header, dropdown list of values and buttons for 'OK' and 'Cancel'.
 * @param {object} obj - Modal parameters including:
 *   modalId - ID of the modal div
 *   header - Title for header of the modal menu
 *   actions - Actions (buttons) to include
 *   f - Function to call on 'OK' button press
 *   dropdownId - ID of the dropdown div
 *   dropdownItems - Items for the dropdown (see createDropdown)
 *   multiple - Flag for creating a multiple select dropdown list
 *   defaultText - Default text to display in the dropdown
 */
var createModalDropdownMenu = function(obj) {
  'use strict';
  var modalId = obj.modalId || 'modal';
  var header = obj.header || 'Header';
  var actions = obj.actions || null;
  var f = obj.f || null;
  var dropdownId = obj.dropdownId || 'dropdown-id';
  var dropdownItems = obj.dropdownItems || [];
  var multiple = obj.multiple || false;
  var defaultText = obj.defaultText || 'All';

  // Set up the modal menu
  var m = $('<div>')
    .attr('id', modalId)
    .attr('class', 'ui modal grid');

  // Create the header
  var h = $('<div>')
    .attr('class', 'header')
    .text(header);

  // If this is a multiple select dropdown create 'Select all / Select none'
  // buttons
  if (multiple) {
    var icons = $('<span class="select-tools">')
      .append('<i title="Select All" class="select-all square icon"></i>')
      .append('<i title="Select None" ' + 
        'class="select-none square outline icon"></i>');

    // Create click handlers for these buttons
    $(icons).find('.select-all').on('click', function () {
      selectAllElements(m, dropdownId);
    });
    $(icons).find('.select-none').on('click', function() {
      selectNoElements(m);
    });

    // Append these icons to the header div
    $(h).append(icons);
  }

  // Create the dropdown and add elements to the main modal container
  var dd = createDropdown(dropdownId, dropdownItems, multiple, defaultText);
  m.append(h, dd, actions.clone());

  // Initialize the dropdown
  dd = $(m).find('.ui.dropdown');
  dd.dropdown();

  // Set the events for the modal form
  m.modal({
    autofocus: false,
    onApprove: function() { f(dd); }
  });
};

/**
 * Create jQueryUI range slider based on the given values 
 * @param {string} sliderId - The ID of the slider div
 * @param {Array} range - The minimum and maximum values for the slider
 * @returns {HTMLDivElement} - The enclosing HTML div tag for the slider
 */
var createRangeSlider = function(sliderId, range) {
  'use strict';
  var rangeMin = range[0];
  var rangeMax = range[1];
  var sliderDiv = $('<div>').attr({
    'class': 'sixteen wide column'
  });
  var rangeDiv = $('<div>').attr({
    'id': 'range'
  }).text("Range: " + rangeMin + " - " + rangeMax);
  var slider = $('<div>').attr({
    'id': sliderId 
  });
  $(slider).slider({
    range: true,
    min: rangeMin,
    max: rangeMax,
    values: [ rangeMin, rangeMax ]
  });
  $(sliderDiv).append(rangeDiv);
  $(sliderDiv).append(slider);
  return sliderDiv;
};

/**
 * Create Semantic UI range modal menu - this creates a modal menu with header,
 * range slider, and buttons for 'OK' and 'Cancel'.
 * @param {object} obj - Modal parameters including:
 *   modalId - ID of the modal div
 *   header - Title for header of the modal menu
 *   actions - Actions (buttons) to include
 *   onChange - Function to call when slider is change (drag event) 
 *   onStop - Function to call when slider stops 
 *   limits - Array holding numerical limits of slider 
 *   sliderId - ID of the slider element 
 */
var createModalSliderMenu = function(obj) {
  'use strict';
  var modalId = obj.modalId || 'modal';
  var header = obj.header || 'Header';
  var actions = obj.actions || null;
  var onChange = obj.onChange || null;
  var onStop = obj.onStop || null;
  var limits = obj.limits || null;
  var sliderId = obj.sliderId || 'slider-id';

  // Set up the modal menu
  var m = $('<div>')
    .attr('id', modalId)
    .attr('class', 'ui modal grid');

  // Create the header
  var h = $('<div>')
    .attr('class', 'header')
    .text(header);

  // Create the slider and add elements to the main modal container
  var s = createRangeSlider(sliderId, limits);
  m.append(h, s, actions.clone());

  // Initialize the slider and set the onChange event 
  m.find('#' + sliderId).slider({
    slide: onChange
  });

  // Set the events for the modal form
  m.modal({
    autofocus: false,
    onApprove: onStop 
  });
};

var createDialog = function(label, inputId) {
  'use strict';
  var dialogDiv = $('<div>').attr({
    'class': 'sixteen wide column'
  });
  var labelDiv = $('<div>').attr({
    'class': 'ui label'
  }).text(label);
  var input = $('<input>').attr({
    'type': 'text'
  });
  var dialog = $('<div>').attr({
    'id': inputId, 
    'class': 'ui labeled fluid input'
  });
  $(dialog).append(labelDiv);
  $(dialog).append(input);

  $(dialogDiv).append(dialog);
  return dialogDiv;
};

var createModalDialogMenu = function(obj) {
  'use strict';
  var modalId = obj.modalId || 'modalId';
  var inputId = obj.inputId || 'inputId';
  var header = obj.header || 'Header';
  var label = obj.label || 'Label';
  var actions = obj.actions || null;
  var f = obj.f || null;

  // Set up the modal menu
  var m = $('<div>')
    .attr('id', modalId)
    .attr('class', 'ui modal grid');

  // Create the header
  var h = $('<div>')
    .attr('class', 'header')
    .text(header);

  // Create a input dialog box 
  var d = createDialog(label, inputId);
  m.append(h, d, actions.clone());

  // Set the events for the modal form
  m.modal({
    autofocus: false,
    onApprove: function() {
      // Get the value in the dialog box and call the function
      var val = d.find('input').first().val(); 
      f(val);
    }
  });
};

/**
 * Initialize the data shown in the information panel associated with the
 * different stratifying variables.  This is called from initInformation
 * @param {object} config - The main configuration object
 */
var initFocusInformation = function(config) {
  'use strict';
  // Initialize the container to show each stratum as a column with the 
  // currently selected items from each stratum shown as a list
  var focus = config.selected.focus;
  var keys = _.keys(focus);

  _.each(keys, function(item, i) {
    var alias = config.catFields[item].alias;
    var link = $('<span>')
      .attr('id', 'focus' + i + '-link')
      .attr('class', 'modal-link')
      .text(alias);

    var data = $('<ul class="list">')
      .attr('id', 'focus' + i + '-data')
      .append('<li>All</li>');

    var column = $('<div class="column">')
      .append([link, data]);

    column.appendTo('#focus-container');

    // Create clink handlers on links within the information panel for
    // the focus, series and variable dropdowns
    var menu = '#focus' + i + '-modal';
    $(link).on('click', function() {
      $(menu).modal('show');
    });
  });
};

/**
 * Initialize the data shown in the information panel.
 * @param {object} config - The main configuration object
 */
var initInformation = function(config) {
  'use strict';
  // Initialize the focus container
  initFocusInformation(config);

  // Series and variable names for the information box
  var s = config.selected;
  var seriesLink = $('#series-link');
  var variableLink = $('#variable-link');
  var yearLink = $('#year-link');
  seriesLink.html(s.series.alias);
  variableLink.html(s.variable.alias);
  yearLink.html(s.years[0] + ' - ' + s.years[1]);

  // Create click handlers on links within the information panel
  seriesLink.on('click', function() {
    $('#series-modal').modal('show');
  });
  variableLink.on('click', function() {
    $('#variable-modal').modal('show');
  });
  yearLink.on('click', function() {
    $('#year-modal').modal('show');
  });
  $('#export-link').on('click', function() {
    $('#export-modal').modal('show');
  });
};

/**
 * Set a dropdown menu to select all elements
 * @param {HTMLDivElement} m - The div object of the modal menu
 * @param {string} id - The id of the stratum from which to pull all values
 */
var selectAllElements = function(m, id) {
  'use strict';
  var dd = $(m).find('.ui.dropdown');
  var values = config.strata[id];
  dd.dropdown('set exactly', values);
};

/**
 * Set a dropdown menu to select no elements
 * @param {HTMLDivElement} m - The div object of the modal menu
 */
var selectNoElements = function(m) {
  'use strict';
  var dd = $(m).find('.ui.dropdown');
  dd.dropdown('set exactly', []);
};

/**
 * Function to fire when a focus dropdown list is changed - this gets the 
 * currently selected values, updates the config object, updates the 
 * information panel, and redraws the chart
 * @param {HTMLDivElement} dd - The dropdown object (div)
 */
var focusDropdownChange = function(dd) {
  'use strict';
  // Get the ID associated with this dropdown
  var id = dd.attr("id");

  // Get the current values in the dropdown menu
  var values = dd.dropdown('get value');

  // Split the values in d, sort, then cast back to string
  var choices = _.sortBy(values.split(","), function(x) { return x; });

  // Find all data items in this list
  var allCats = _.map($(dd).find('.item'), function(d) {
    return $(d).attr('data-value');
  });

  // Flag for whether or not all categories are selected
  var all = false;

  // Update the config object and determine if all categories are currently
  // selected
  if (choices.length > 0 && choices[0] !== "") {
    config.selected.focus[id] = choices;

    // If all choices are selected, set the all flag to true (so that we
    // only show 'All' in the information box)
    if (_.isEqual(allCats.sort(), choices.sort())) {
      all = true;
    }
  } else {
    all = true;
    config.selected.focus[id] = allCats;
  }

  // Update the part of the current selections with this information
  // The easiest way to get this is to get the dropdown's parent ID (the 
  // modal menu) and change this string to find the data ID.  If the modal
  // ID is 'focal0-modal', the data ID will be 'focal0-data'
  var modalID = dd.closest(".modal").attr("id");
  var dataID = '#' + (modalID.split('-'))[0] + '-data';
  $(dataID + ' li').remove();
  if (!all) {
    _.each(config.selected.focus[id], function(item) {
      var el = $('<li>').text(item);
      el.appendTo($(dataID));
    });
  } else {
    var el = $('<li>').text('All');
    el.appendTo($(dataID));
  }
  updateView();
};

/**
 * Function to fire when the series dropdown list is changed - this updates
 * the config object, updates the information panel, and redraws the chart
 * @param {HTMLDivElement} dd - The dropdown object (div)
 */
var seriesDropdownChange = function(dd) {
  'use strict';
  var value = dd.dropdown('get value');
  config.selected.series = config.catFields[value]; 
  $('#series-link').text(config.selected.series.alias);
  updateView();
};

/**
 * Function to fire when the variable dropdown list is changed - this updates
 * the config object, updates the information panel, and redraws the chart
 * @param {HTMLDivElement} dd - The dropdown object (div)
 */
var variableDropdownChange = function(dd) {
  'use strict';
  var value = dd.dropdown('get value');
  config.selected.variable = config.contFields[value];
  $('#variable-link').text(config.selected.variable.alias);
  updateView();
};

/** 
 * Function to fire when the year slider is moved - this only updates the
 * text on the slider label and doesn't trigger a redraw
 * @param {event} event - The event that was fired
 * @param {element} ui - The ui element that was operated on
 */
var yearSliderChange = function(event, ui) {
  'use strict';
  var rangeStr = ui.values[0] + " - " + ui.values[1];
  $('#range').text("Range: " + rangeStr);
};

/** 
 * Function to fire when the year slider is stopped - this updates the
 * the config object, updates the information panel, and redraws the chart
 */
var yearSliderStop = function() {
  'use strict';
  var years = $('#year-slider').slider('values');
  var yearRangeStr = years[0] + " - " + years[1];
  config.selected.years[0] = +years[0];
  config.selected.years[1] = +years[1];
  $('#year-link').text(yearRangeStr);
  updateView();
};

/**
 * Function to fire on update of any UI element.  Updates the filtered data,
 * warnings, and charts
 */
var updateView = function() {
  var chartDiv = $('#chart');
  var notShownDiv = $('#not-shown-warning').parents('.row');
  var lowAreaDiv = $('#low-area-warning').parents('.row');
  filteredData = filterData(config);
  updateRecordCount(filteredData.count);
  if (filteredData.count) {
    filteredData.data = updateWarnings(filteredData.data);
    if (filteredData.data.length) {
      chartDiv.show();
      updateChart(filteredData.data);
    } else {
      chartDiv.hide();
    }
  } else {
    notShownDiv.hide();
    lowAreaDiv.hide();
    chartDiv.hide();
  }
};

var downloadFile = function(csvFile) {
  'use strict';
  var uri = convertToCSV(config, filteredData);
  var link = document.createElement('a');
  link.href = uri;
  link.download = csvFile;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Update the count of records that currently figure in to the statistics
 * calculation.  If the count is zero, the information box is triggered
 * to show up as a warning
 * @param {int} count - The currently selected number of records
 */
var updateRecordCount = function(count) {
  'use strict';
  var parameters = $('#parameters');
  var noRecords = $('#no-records');
  if (count === 0) {
    parameters.attr({'class': 'ui negative message'});
    var header = $('<div>').addClass('header').text('Error');
    var text = 'There are no series with this combination of strata';
    var p = $('<p>').text(text);
    noRecords.empty().append(header).append(p).parents('.row').show();
  } else {
    parameters.attr({'class': 'ui info message'});
    noRecords.parents('.row').hide();
  }
};

/**
 *  Update the warning boxes if any series is less than an acceptable threshold
 *  @param {object} data - The data to use to determine threshold
 */
var updateWarnings = function(data) {
  'use strict';
  var WARNING_THRESHOLD = config.warningAreaThreshold;
  var MINIMUM_THRESHOLD = config.minimumAreaThreshold;
  var units = config.selected.area.units;
  var hide = false;
  var warn = false;
  var hideSeries = [];
  var lowSeries = [];
  var removeList = [];
  _.each(data, function(v, k) {
    if (v.minCount < MINIMUM_THRESHOLD) {
      hide = true;
      hideSeries.push({label: v.label, minCount: v.minCount});
      removeList.push(k);
    }
    else if (v.minCount < WARNING_THRESHOLD) {
      warn = true;
      lowSeries.push({label: v.label, minCount: v.minCount});
    }
  });

  var warningText, header, text, p, list;

  var notShownDiv = $('#not-shown-warning');
  if (hide) {
    warningText = 'Warning: Series not shown';
    header = $('<div>').addClass('header').text(warningText);
    notShownDiv.empty().append(header);
    text = 'These series are not shown because they are less than ' +
        'the minimum area threshold (' + MINIMUM_THRESHOLD + ' ' + units + ')';
    p = $('<p>').text(text);
    list = $('<ul>').addClass('list');
    _.each(hideSeries, function (v) {
      var msg = 'Series ' + v.label + ': ' + v.minCount.toFixed(2) + ' ' + units;
      $('<li>').text(msg).appendTo(list);
    });
    notShownDiv.append(p).append(list);
    notShownDiv.parents('.row').show();
  } else {
    notShownDiv.parents('.row').hide();
  }

  var lowAreaDiv = $('#low-area-warning');
  if (warn) {
    warningText = 'Warning: Series have low area';
    header = $('<div>').addClass('header').text(warningText);
    lowAreaDiv.empty().append(header);
    text = 'These series have low areas associated with their strata ' +
      'and are symbolized with dashed lines in the chart below. ' +
      'Use with caution!';
    p = $('<p>').text(text);
    list = $('<ul>').addClass('list');
    _.each(lowSeries, function (v) {
      var msg = 'Series ' + v.label + ': ' + v.minCount.toFixed(2) + ' ' + units;
      $('<li>').text(msg).appendTo(list);
    });
    lowAreaDiv.append(p).append(list)
    lowAreaDiv.parents('.row').show();
  } else {
    lowAreaDiv.parents('.row').hide();
  }

  // Return the (possibly modified) series data
  _.pullAt(data, removeList);
  return data;
};
