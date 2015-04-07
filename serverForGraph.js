var path = require('path');
var _ = require('lodash');
var express = require('express');
var utils = require('./blackjack/utils.js');
var app = express();

var server = app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0");
var io = require('socket.io').listen(server);

app.use(express.static(__dirname));
app.use('/game', express.static('game'));

var Game = require('./game').Game;

io.on('connection', function(socket) {
    var gamesCount = 1;
    var balance = 5000;
    var oldBalance = 5000;
    var timer = 500;

    var log = new Log();

    socket.emit('balanceChanged', {
        balance: balance,
        count: 0
    });

    socket.on('getData', function() {
        var bet = 5;
        oldBalance = balance;
        balance -= bet;
        var game = new Game(bet);

        while (utils.notNullOrUndefined(game.getCurrentHand())) {
            var hand = game.getCurrentHand();

            var action = hand.getCals()[0].strategy;

            switch (action) {
                case 'D':
                    var dd = hand.doubleDown();
                    balance -= hand.bet;

                    hand.bet = hand.bet * 2;
                    break;
                case 'H':
                    var hit = hand.hit();
                    break;
                case 'P':
                    var splitCard = hand.split();
                    break;
                case 'S':
                    var stand = hand.stand();
                    break;
                case 'R':
                    var surrender = hand.surrender();

                    balance += 0.5 * hand.bet;
                    break;
                default:
                    throw new Error('Action missed?');
            }

            if (hand.winLoseDraw !== null && hand.winLoseDraw !== undefined) {
                socket.emit('balanceChanged', {
                    balance: balance,
                    count: gamesCount
                });
                
                log.createLog(game, hand);
            }

            if ((hand.winLoseDraw === null || hand.winLoseDraw === undefined) && !game.getCurrentHand()) {

                var bet = hand.bet;

                var hands = game.stand();
                _.each(hands, function(playerHand) {
                    if (playerHand.winLoseDraw === 'win') {
                        if (playerHand.dealerOrPlayerBlackjack === 'player') {
                            balance += 1.5 * bet + bet;
                        }
                        else {
                            balance += bet + bet;
                        }
                    }
                    else if (playerHand.winLoseDraw === 'lose') {

                    }
                    else if (playerHand.winLoseDraw === 'draw') {
                        balance += bet;
                    }
                    else {
                        throw new Error('ERROR');
                    }

                    log.createLog(game, playerHand);

                    socket.emit('balanceChanged', {
                        balance: balance,
                        count: gamesCount
                    });
                });
            }
        }

        gamesCount++;
    });

    function Log() {
        var _this = this;

        _this.createLog = function(game, logHand) {
            //[ToDo] save to Db and emit
            socket.emit('log', {
                winLoseDraw: logHand.winLoseDraw,
                oldBalance: oldBalance,
                newBalance: balance,
                dealerCards: game.dealerCards,
                playerCards: logHand.playerCards,
                firstProbs: logHand.firstProbs,
                actionsTrace: logHand.actionsTrace,
                dealerCount: game.getDealerCount(),
                playerCount: logHand.getPlayerCount(),
                bet: logHand.bet,
                gamesCount: gamesCount
            });
        };
    }

    socket.on('error', function(err) {
        console.log(err);
        console.log(err.stack);
        console.error(err.stack); // TODO, cleanup 
    });
});