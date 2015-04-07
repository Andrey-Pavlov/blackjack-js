var shareExports = {};

//region Random
shareExports.randomIntFromInterval = function(min, max) {
    return ~~(Math.random() * (max - min + 1) + min);
};

shareExports.randomDoubleFromInterval = function(min, max) {
    return Math.random() * (max - min + 1);
};

shareExports.randomFromValues = function() {
    if (arguments.length > 1) {
        var number = shareExports.randomIntFromInterval(0, arguments.length - 1);

        return arguments[number];
    }
    else if (arguments.length === 1) {
        var arrayOrObject = arguments[0];
        if (Array.isArray(arrayOrObject)) {
            return arrayOrObject[shareExports.randomIntFromInterval(0, arrayOrObject.length - 1)];
        }
        else {
            var names = Object.keys(arrayOrObject);

            return arrayOrObject[shareExports.randomIntFromInterval(0, names.length - 1)];
        }
    }
};
//endregion

shareExports.clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};

shareExports.notNullOrUndefined = function(value) {
    return !(value === undefined || value === null);
};

shareExports.extend = function(booleanOrout) {

    if (typeof booleanOrout === 'boolean') {
        return deepExtend(arguments[1]);
    }
    else {
        var out = booleanOrout || {};

        for (var i = 1; i < arguments.length; i++) {
            if (!arguments[i])
                continue;

            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key))
                    out[key] = arguments[i][key];
            }
        }

        return out;
    }

    function deepExtend(out) {
        out = out || {};

        for (var i = 1; i < arguments.length; i++) {
            var obj = arguments[i];

            if (!obj)
                continue;

            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'object')
                        deepExtend(out[key], obj[key]);
                    else
                        out[key] = obj[key];
                }
            }
        }

        return out;
    }
};

(function() {
    if (typeof module !== "undefined") {
        module.exports = shareExports;
    }
    else {
        app['utils'] = app.utils.extend({}, app['utils'], shareExports);
    }
}())