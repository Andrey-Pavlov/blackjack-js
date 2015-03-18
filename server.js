var path = require('path');
var express = require('express');
var app = express();

var server = app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0");
var io = require('socket.io').listen(server);

app.configure(function(){
    app.use(express.static(path.resolve(__dirname, 'game')));
});

io.on('connection', function (socket) {
    var dealer1 = 0,
        dealer2 = 0,
        player1 = 0,
        player2 = 0;

    socket.on('action', function (data) {
        switch (data.action){
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
            dealer1: dealer1,
            dealer2: dealer2,
            player1: player1,
            player2: player2
        });
    });
});

var requirejs = require('requirejs');
requirejs.config({
    nodeRequire: require
});