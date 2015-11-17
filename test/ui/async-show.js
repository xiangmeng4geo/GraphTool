!function() {
    var $ = Core.$;
    module.exports = function() {
        var $div = $('<div>').css({
            position: 'absolute',
            left: 1,
            top: 1
        }).appendTo('body');
        function run() {
            $div.html(new Date().getTime());
            setTimeout(run, 50);
        }

        setTimeout(run, 50);
    }
}()
