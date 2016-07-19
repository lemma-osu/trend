var initDocumentation = function() {
    var docDiv = $('#documentation');
    docDiv.load("documentation.html", function() {
        $('.ui.accordion').accordion({
            onOpen: function() {
                $('.ui.modal').modal('refresh');
            }
        });
        docDiv.modal({
            onHidden: function() {
                $('.dimmer').fadeOut();
            }
        }).modal('show');
    });
};

var pitfalls = function() {
    $('.ui.accordion').accordion('open', 3);
};