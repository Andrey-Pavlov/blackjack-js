var requirejs = require('requirejs');

requirejs.config({
    nodeRequire: require
});

requirejs(['utils'], function(utils){
    console.log(utils.reverse("ASD"));
});