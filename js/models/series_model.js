(function (window) {
    function SeriesModel(label, color, minWeight, seriesData) {
        this.label = label;
        this.color = color;
        this.minWeight = minWeight;
        this.seriesData = seriesData;
    }
    SeriesModel.prototype.getSeriesViewData = function() {
        return _.map(this.seriesData, function(d) {
            return {
                x: d[0],
                y: d[1],
                min: d[1],
                max: d[1]
            };
        })
    };

    function SeriesAndErrorsModel(label, color, minWeight, seriesData) {
        SeriesModel.call(this, label, color, minWeight, seriesData);
    }
    SeriesAndErrorsModel.prototype = Object.create(SeriesModel.prototype);
    SeriesAndErrorsModel.prototype.constructor = SeriesAndErrorsModel;

    SeriesAndErrorsModel.prototype.getSeriesViewData = function() {
        return _.map(this.seriesData, function(d) {
            return {
                x: d[0],
                y: d[1],
                min: d[2],
                max: d[3]
            };
        })
    };

    window.app = window.app || {};
    window.app.SeriesModel = SeriesModel;
    window.app.SeriesAndErrorsModel = SeriesAndErrorsModel;
})(window);