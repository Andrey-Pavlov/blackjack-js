var path = require('path');
var express = require('express');
var app = express();

var server = app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0");
var io = require('socket.io').listen(server);

app.use(express.static(__dirname));
app.use('/game', express.static('game'));

var Game = require('./game').Game;

io.on('connection', function(socket) {

    var game = new Game(),
        initObject = game.start();

    socket.emit('start', initObject);

    socket.on('action', function(data) {
        switch (data.action) {
            case 'dd':
                break;
            case 'hit':
                var hit = game.hit();
                socket.emit('hit', hit);
                break;
            case 'split':
                break;
            case 'stand':
                var stand = game.stand();
                socket.emit('stand', stand);
                break;
            case 'surrender':
                break;
            case 'restart':
                    game = new Game(),
                    initObject = game.start();

                socket.emit('start', initObject);
                break;
            default:
        }
    });

    socket.on('getCalcs', function() {
        var calcs = game.getCals();

        socket.emit('calcs', calcs);
    });
});