(function (window) {

    function OlofssonView() {
        this._root = $('#olofsson');
        this._checkbox = this._root.find('.ui.checkbox');
        this._checkbox.checkbox('set checked');
    }

    OlofssonView.prototype.bind = function(event, handler) {
        var self = this;
        if (event === 'olofsson-toggle-click') {
            self._checkbox.on('click', function () {
                handler(self._checkbox.checkbox('is checked'));
            });
        }
    };

    OlofssonView.prototype.render = function(data) {
        var parent = this._root.parents('.row');
        if (data) {
            this.renderErrorMatrix(data.error_matrix);
            parent.show();
        } else {
            parent.hide();
        }
    };

    OlofssonView.prototype.renderErrorMatrix = function(errMatrix) {
        var i, j, tr, td;
        var em = errMatrix.data;
        var classes = errMatrix.classes;
        var row_sums = errMatrix.row_sums;
        var col_sums = errMatrix.col_sums;
        var table = $('<table>').addClass('em-table');

        // Header line
        tr = $('<tr>')
            .append($('<td>'))
            .append($('<td>')
                .attr('class', 'observed')
                .attr('colspan', row_sums.length + 2)
                .text('Observed')
            );
        table.append(tr);

        tr = $('<tr>');
        td = $('<td>')
            .attr('rowspan', col_sums.length + 2)
            .append($('<div>')
                .attr('class', 'rotated')
                .text('Predicted'));
        tr.append(td);
        tr.append($('<td>').text(""));
        for (i=0; i<classes.length; i++) {
            td = $('<td>').text(classes[i]);
            tr.append(td);
        }
        td = $('<td>').text('CORRECT');
        tr.append(td);
        table.append(tr);

        // Body of error matrix
        var totalCorrect = 0;
        var total = 0;
        for (i=0; i<em.length; i++) {
            tr = $('<tr>');
            td = $('<td>')
                .attr('class', 'em-data')
                .text(classes[i]);
            tr.append(td);
            for (j=0; j<em.length; j++) {
                total += em[i][j];
                td = $('<td>')
                    .attr('class', 'em-data')
                    .text(em[i][j]);
                if (i === j) {
                    totalCorrect += em[i][j];
                    td.addClass('correct');
                }
                tr.append(td);
            }
            td = $('<td>')
                .attr('class', 'em-data')
                .text((em[i][i] / row_sums[i] * 100.0).toFixed(2));
            tr.append(td);
            table.append(tr);
        }

        // Column totals
        tr = $('<tr>');
        tr.append($('<td>').text("CORRECT"));
        for (i=0; i<col_sums.length; i++) {
            td = $('<td>').text((em[i][i] / col_sums[i] * 100.0).toFixed(2));
            tr.append(td);
        }
        tr.append($('<td>').text((totalCorrect / total * 100.0).toFixed(2)));
        table.append(tr);

        this._root.find('#error-matrix').html(table);
    };

    window.app = window.app || {};
    window.app.OlofssonView = OlofssonView;
}(window));
