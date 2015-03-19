var requirejs = require('requirejs');
requirejs.config({
    nodeRequire: require
});

var path = require('path');
var express = require('express');
var app = express();

var server = app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0");
var io = require('socket.io').listen(server);

app.use(express.static(path.resolve(__dirname, 'game')));

io.on('connection', function(socket) {
    var dealer1 = 0,
        dealer2 = 0,
        player1 = 0,
        player2 = 0;

    socket.on('action', function(data) {
        switch (data.action) {
            case 'dd':
                dealer1++;
                break;
            case 'hit':
                player1++;
                break;
            case 'split':
                player2++;
                break;
            case 'stand':
                dealer2++;
                break;
            case 'surrender':
                break;
            default:
        }

        socket.emit('action', {
            dealer: {
                card1: dealer1,
                card2: dealer2
            },
            player: {
                card1: player1,
                card2: player2
            }
        });
    });
});