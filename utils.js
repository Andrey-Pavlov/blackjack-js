//region Random
exports.randomIntFromInterval = function(min, max) {
    return ~~(Math.random() * (max - min + 1) + min);
}

exports.randomDoubleFromInterval = function(min, max) {
    return Math.random() * (max - min + 1);
}

exports.randomFromValues = function() {
    if (arguments.length > 1) {
        var number = exports.randomIntFromInterval(0, arguments.length - 1);

        return arguments[number];
    }
    else if (arguments.length === 1) {
        var arrayOrObject = arguments[0];
        if (Array.isArray(arrayOrObject)) {
            return arrayOrObject[exports.randomIntFromInterval(0, arrayOrObject.length - 1)];
        }
        else {
            var names = Object.keys(arrayOrObject);

            return arrayOrObject[exports.randomIntFromInterval(0, names.length - 1)]
        }
    }
}
//endregion