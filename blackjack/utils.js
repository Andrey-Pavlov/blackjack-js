/**
 * Created by Andrey on 28.02.2015.
 */
var utils = {};

utils.clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};