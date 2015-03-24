var shareExports = {};

//region Random
shareExports.randomIntFromInterval = function(min, max) {
    return ~~(Math.random() * (max - min + 1) + min);
}

shareExports.randomDoubleFromInterval = function(min, max) {
    return Math.random() * (max - min + 1);
}

shareExports.randomFromValues = function() {
        if (arguments.length > 1) {
            var number = this.randomIntFromInterval(0, arguments.length - 1);

            return arguments[number];
        }
        else if (arguments.length === 1) {
            var arrayOrObject = arguments[0];
            if (Array.isArray(arrayOrObject)) {
                return arrayOrObject[this.randomIntFromInterval(0, arrayOrObject.length - 1)];
            }
            else {
                var names = Object.keys(arrayOrObject);

                return arrayOrObject[this.randomIntFromInterval(0, names.length - 1)]
            }
        }
    }
    //endregion

shareExports.clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};

(function() {
    if (typeof module !== "undefined") {
        module.exports = shareExports;
    }
    else {
        app['utils'] = app.utils.extend({}, app['utils'], shareExports);
    }
}())