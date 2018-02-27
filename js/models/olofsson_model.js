(function (window) {
    // function ErrorMatrix(arr2d, classes) {
    //     this.data = arr2d;
    // }
    //
    // ErrorMatrix.prototype.sum = function(axis) {
    //     if (axis === 0) {
    //         _.reduce(this.data, function(b, a) {
    //             _.map(a, function(x, i) {
    //                 return x + b[i];
    //             });
    //         }, []);
    //     }
    //     if (axis === 1) {
    //         return _.map(this.data, function(d) {
    //             return _.reduce(d, function(rowSum, i) {
    //                 return rowSum + i;
    //             }, 0.0);
    //         });
    //     } else if (axis === 2) {
    //         return _.reduce(this.data, function(totalSum, d) {
    //             return totalSum + _.reduce(d, function(rowSum, i) {
    //                 return rowSum + i;
    //             }, 0.0)
    //         }, 0.0);
    //     }
    // };

    function OlofssonModel() {
        this.data = null;
        this.fields = {};
    }

    OlofssonModel.prototype.initialize = function(configData, callback){
        callback = callback || function() {};
        var self = this;
        self.load(configData.olofsson.fn, function() {
            // Determine which fields should have error matrices built
            // Specified in the configuration object
            _.forEach(configData.olofsson.fields, function(d) {
                self.fields[d] = [];
            });
            callback();
        });
    };

    OlofssonModel.prototype.load = function(csvFn, callback) {
        callback = callback || function () {};
        var self = this;
        d3.csv(csvFn, function(error, data) {
            if (error) throw error;
            self.data = data;
            callback.call(self, data);
        });
    };

    OlofssonModel.prototype.filterRecordsFromConfig = function(configModel,
            data, callback) {
        callback = callback || function () {};
        var self = this;
        var series =  configModel.selected.seriesField.key;

        // Short circuit the condition where data is empty
        if (!data.length) {
            callback(null);
        } else if (_.includes(_.keys(self.fields), series)) {
            // For all but the series field, filter down the records based
            // on the currently selected categories in all other strata
            var series_obs = series + '_OBS';
            var series_prd = series + '_PRD';
            var conds = {};
            _.forEach(configModel.selected.strataFields, function (s) {
                if (s.key === series) {
                    var stratum = configModel.stratum(s.key);
                    var cats = self.filterStratum(stratum);
                    conds[series_obs] = cats;
                    conds[series_prd] = cats;
                } else {
                    // Other fields that will have _OBS and _PRD fields
                    // Only keep the observed value
                    if (_.includes(_.keys(self.fields), s.key)) {
                        var field = s.key + '_OBS';
                        conds[field] = self.filterStratum(s);
                    } else {
                        conds[s.key] = self.filterStratum(s);
                    }
                }
            });

            // Get the raw data associated with this filtered columns
            var out_data = [];
            for (var i = 0; i < self.data.length; i++) {
                var d = self.data[i];
                var all_in = true;
                for (var key in conds) {
                    if (conds.hasOwnProperty(key)) {
                        var val = d[key];
                        var arr = conds[key];
                        var here = false;
                        for (var j = 0; j < arr.length; j++) {
                            if (val === arr[j]) {
                                here = true;
                                break;
                            }
                        }
                        if (here === false) {
                            all_in = false;
                            break;
                        }
                    }
                }
                if (all_in === true) {
                    out_data.push(d);
                }
            }

            // Create error matrix
            var error_matrix = [];
            var classes = _.union(conds[series_obs], conds[series_prd]);
            for (i = 0; i < classes.length; i++) {
                error_matrix.push([]);
                for (j = 0; j < classes.length; j++) {
                    error_matrix[i].push(0);
                }
            }
            for (i = 0; i < out_data.length; i++) {
                var obs_value = out_data[i][series_obs];
                var prd_value = out_data[i][series_prd];
                var obs_index = _.indexOf(classes, obs_value);
                var prd_index = _.indexOf(classes, prd_value);
                error_matrix[prd_index][obs_index] += 1;
            }

            // Calculate row/column sums for error matrix
            var row_sums = [];
            var col_sums = [];
            for (i = 0; i < error_matrix.length; i++) {
                row_sums.push(0);
                for (j = 0; j < error_matrix.length; j++) {
                    if (i === 0) {
                        col_sums.push(0);
                    }
                    row_sums[i] += error_matrix[i][j];
                    col_sums[j] += error_matrix[i][j];
                }
            }

            // Adjust error matrix if there are no observed records
            // in a class
            var remove = [];
            for (j = 0; j < col_sums.length; j++)
            {
                if (col_sums[j] === 0) {
                    remove.push(j);
                }
            }
            for (i = remove.length - 1; i >= 0; i--) {
                classes.splice(remove[i], 1);
                error_matrix.splice(remove[i], 1);
                col_sums.splice(remove[i], 1);
                row_sums.splice(remove[i], 1);
                for (j = 0; j < error_matrix.length; j++)
                    error_matrix[j].splice(remove[i], 1);
            }

            // Create a standardized version of the error matrix where
            // each element is standardize by its row (predicted) totals
            var n_ij = [];
            for (i = 0; i < error_matrix.length; i++)
                n_ij[i] = error_matrix[i].slice();

            for (i = 0; i < error_matrix[0].length; i++) {
                total = 0.0;
                for (j = 0; j < error_matrix.length; j++) {
                    total += error_matrix[i][j];
                }
                if (total) {
                    for (j = 0; j < error_matrix.length; j++) {
                        n_ij[i][j] = error_matrix[i][j] / total;
                    }
                } else {
                    for (j = 0; j < error_matrix.length; j++) {
                        n_ij[i][j] = 0.0;
                    }
                }
            }

            // Get weights for all series and store as a 2D-array
            // These will be in the same order as classes array
            var start = configModel.selected.minTime;
            var end = configModel.selected.maxTime;
            var weightMatrix = [];
            var keys = _.map(data, function(d) { return d.label; });
            _.forEach(classes, function(c, j) {
                var index = _.indexOf(keys, c);
                if (index !==  -1) {
                    var d = data[index];
                    var times = _.map(d.seriesData, function(arr) {
                        return +arr[0];
                    });
                    var weights = _.map(d.seriesData, function(arr) {
                        return arr[1];
                    });
                    weightMatrix.push([]);
                    for (i = start; i <= end; i++) {
                        var tIndex = _.indexOf(times, i);
                        weightMatrix[j].push(weights[tIndex]);
                    }
                } else {
                    weightMatrix.push([]);
                    for (i = start; i <= end; i++) {
                        weightMatrix[j].push(0.0);
                    }
                }
            });

            // Sum weights over columns and standardize
            var colSums = [];
            for (j = 0; j < weightMatrix[0].length; j++) {
                var total = 0.0;
                for (i = 0; i < weightMatrix.length; i++) {
                    total += weightMatrix[i][j];
                }
                colSums.push(total);
            }

            // For confidence intervals, we need row sums to be at
            // least two to avoid divide by zero errors
            var row_sums_min_2 = [];
            for (i = 0; i < row_sums.length; i++) {
                row_sums_min_2[i] = row_sums[i] < 2 ? 2 : row_sums[i];
            }

            // Run over time periods
            var k;
            var ea_weights = [];
            var ci_ea = [];
            for (i = 0; i < weightMatrix[0].length; i++) {
                var areas = _.map(weightMatrix, function(d) { return d[i]; });
                var w = _.map(areas, function(d, i) { return d / colSums[i]; });
                var p_ij = [];
                for (j = 0; j < n_ij.length; j++)
                    p_ij[j] = n_ij[j].slice();
                for (j = 0; j < p_ij.length; j++) {
                    for (k = 0; k < p_ij[j].length; k++) {
                        p_ij[j][k] = n_ij[j][k] * w[j];
                    }
                }
                var total_area = _.reduce(areas, function(sum, n) {
                    return sum + n;
                }, 0.0);

                var pij_col_totals = [];
                for (k = 0; k < p_ij[0].length; k++ ) {
                    total = 0.0;
                    for (j = 0; j < p_ij.length; j++) {
                        total += p_ij[j][k];
                    }
                    pij_col_totals.push(total);
                }

                var ea = [];
                for (j = 0; j < pij_col_totals.length; j++) {
                    ea.push(pij_col_totals[j] * total_area);
                }
                ea_weights.push(ea);

                function get_ci(n_ij, row_sums, w, total_area) {
                    var row, col, value, total;
                    var ci = [];
                    for (col = 0; col < n_ij[0].length; col++) {
                        total = 0.0;
                        for (row = 0; row < n_ij.length; row++) {
                            value = (n_ij[row][col] * (1.0 - n_ij[row][col])) /
                                (row_sums[row] - 1);
                            value *= w[row] * w[row];
                            total += value;
                        }
                        ci.push(2.0 * Math.sqrt(total) * total_area);
                    }
                    return ci;
                }
                ci_ea.push(get_ci(n_ij, row_sums_min_2, w, total_area));
            }

            // Put these data into view-ready series (SeriesAndErrorsModel)
            // Classes are added only if they are represented in the current data
            // even though all classes appear in the error matrix
            var series_data = [];
            for (i=0; i<classes.length; i++) {
                var s_data = [];
                for (j=0; j < ea_weights.length; j++) {
                    var time = (start + j).toString();
                    var weight = ea_weights[j][i];
                    var ci_weight = ci_ea[j][i];
                    s_data.push([time, weight, weight - ci_weight, weight + ci_weight]);
                }
                var color = _.find(data, function(x) {
                    return x.label === classes[i];
                }).color;
                var s = new window.app.SeriesAndErrorsModel(
                    classes[i] + '-EA',
                    color,
                    _.min(_.map(s_data, function(d) { return d[1]; })),
                    s_data
                );
                series_data.push(s);
            }

            error_matrix = {
                data: error_matrix,
                classes: classes,
                row_sums: row_sums,
                col_sums: col_sums
            };
            callback({error_matrix: error_matrix, series_data: series_data});
        } else {
            callback(null);
        }
    };

    /**
     *
     * @param {StratumField} s - the stratum to filter
     * @returns {Array}
     */
    OlofssonModel.prototype.filterStratum = function(s) {
        var cats = _.map(s.categories, function(c) { return c.key; });
        var groups = _.map(s.groups, function(g) { return g.items; });
        return _.uniq(_.union(cats, _.flatten(groups)));
    };

    window.app = window.app || {};
    window.app.OlofssonModel = OlofssonModel;
}(window));
