var mongoose = require('mongoose'), 
    options = require('../blackjackOptions.json');

// intialize
mongoose.set('debug', true);
mongoose.connect(options.db);

var db = mongoose.connection;
db.on('error', function (err) {
    console.error(err);
});

module.exports = mongoose;