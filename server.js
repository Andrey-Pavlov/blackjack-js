var path = require('path');

var express = require('express');
var app = express();

var requirejs = require('requirejs');
requirejs.config({
    nodeRequire: require
});

app.use(express.static(path.resolve(__dirname, 'game')));
app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0");