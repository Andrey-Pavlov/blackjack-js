var path = require('path');
var utils = require('./blackjack/utils');
var express = require('express');
var app = express();

var server = app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0");
var io = require('socket.io').listen(server);

app.use(express.static(__dirname));
app.use('/game', express.static('game'));

var Game = require('./game').Game;

io.on('connection', function(socket) {
    var log = new Log();

    var game = new Game(),
        balance = 5000,
        bet = 0,
        isEnded = false,
        initObject = game.initObject;

    socket.emit('betBalanceChanged', {
        balance: balance,
        bet: bet
    });

    socket.on('placeBet', function(data) {
        isEnded = false;

        bet = parseInt(data.bet, 10);
        balance -= bet;

        socket.emit('betBalanceChanged', {
            balance: balance,
            bet: bet
        });

        game = new Game();
        initObject = game.initObject;
        socket.emit('start', initObject);
    });

    socket.on('action', function(data) {
        switch (data.action) {
            case 'D':
                var dd = game.doubleDown();
                dd.winLoseDraw = game.winLoseDraw;

                isEnded = true;

                if (dd.winLoseDraw === 'win') {
                    balance += 1.5 * 2 * bet;
                }
                else if (dd.winLoseDraw === 'lose') {

                }
                else if (dd.winLoseDraw === 'draw') {
                    balance += 2 * bet;
                }
                else {
                    throw err;
                }

                log.createLog();
                socket.emit('dd', dd);
                break;
            case 'H':
                var hit = game.hit();
                hit.winLoseDraw = game.winLoseDraw;

                if (hit.winLoseDraw === 'lose') {
                    isEnded = true;

                    log.createLog();
                }

                socket.emit('hit', hit);
                break;
            case 'P':
                break;
            case 'S':
                var stand = game.stand();
                stand.winLoseDraw = game.winLoseDraw;

                isEnded = true;

                if (stand.winLoseDraw === 'win') {
                    balance += 1.5 * bet;
                }
                else if (stand.winLoseDraw === 'lose') {

                }
                else if (stand.winLoseDraw === 'draw') {
                    balance += bet;
                }
                else {
                    throw err;
                }

                socket.emit('betBalanceChanged', {
                    balance: balance,
                    bet: bet
                });

                log.createLog();
                socket.emit('stand', stand);
                break;
            case 'R':
                var surrender = game.surrender();
                surrender.winLoseDraw = game.winLoseDraw;

                isEnded = true;

                balance += 0.5 * bet;

                socket.emit('betBalanceChanged', {
                    balance: balance,
                    bet: bet
                });

                log.createLog();
                socket.emit('surrender', surrender);
                break;
            case 'restart':
                bet = 0;
                socket.emit('betBalanceChanged', {
                    balance: balance,
                    bet: bet
                });

                socket.emit('restart');
                break;
            default:
        }
    });

    socket.on('getCalcs', function() {
        var calcs = game.getCals();

        socket.emit('calcs', calcs);
    });


    function Log() {
        var _this = this;

        _this.createLog = function() {
            //[ToDo] save to Db and emit


            socket.emit('log', {
                balance: balance,
                bet: bet,
                dealerCards: game.getDealerCards(),
                playerCards: game.getPlayerCards(),
                winLoseDraw: game.winLoseDraw,
                actionsTrace: game.actionsTrace
            });
        }
    }


    //Bot
    socket.on('getBotCommand', function() {
        var action = null;

        if (isEnded) {
            action = 'restart';
        }
        else {
            var calcs = game.getCals();

            action = calcs[0].strategy;

            if (action === 'P') {
                action = calcs[1].strategy;
            }
        }

        socket.emit('botCommand', action);
    });
});