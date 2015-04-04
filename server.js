var path = require('path');
var _ = require('lodash');
var express = require('express');
var app = express();

var server = app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0");
var io = require('socket.io').listen(server);

app.use(express.static(__dirname));
app.use('/game', express.static('game'));

var Game = require('./game').Game;

io.on('connection', function(socket) {
    var log = new Log(),
        gamesCount = 0;

    var game = null,
        hand = null,
        balance = 5000;

    socket.emit('betBalanceChanged', {
        balance: balance,
        bet: 0
    });

    socket.on('placeBet', function(data) {
        if (gamesCount === 0) {
            socket.emit('graph', {
                gamesCount: gamesCount,
                balance: balance
            });
        }

        gamesCount++;

        var bet = parseInt(data.bet, 10);
        balance -= bet;

        socket.emit('betBalanceChanged', {
            balance: balance,
            bet: bet
        });

        game = new Game(bet);
        hand = game.getCurrentHand();
        socket.emit('start', {
            playerCards: hand.playerCards,
            dealerCard: game.dealerCards[0]
        });

        socket.emit('calcs', hand.getCals());
    });

    socket.on('error', function(err) {
        console.error(err.stack); // TODO, cleanup 
    });

    socket.on('action', function(data) {
        hand = game.getCurrentHand();

        if (hand) {
            switch (data.action) {
                case 'D':
                    var dd = hand.doubleDown();
                    var bet = hand.bet;
                    balance -= bet;

                    socket.emit('betBalanceChanged', {
                        balance: balance,
                        bet: bet
                    });

                    if (hand.winLoseDraw === 'lose') {
                        dd.dealerCount = game.getDealerCount();

                        log.createLog();
                    }

                    socket.emit('calcs', hand.getCals());

                    socket.emit('dd', dd);
                    break;
                case 'H':
                    var hit = hand.hit();

                    if (hand.winLoseDraw === 'lose') {
                        hit.dealerCount = game.getDealerCount();

                        log.createLog();
                    }

                    socket.emit('calcs', hand.getCals());
                    socket.emit('hit', hit);
                    break;
                case 'P':
                    var splitCard = hand.split();

                    socket.emit('calcs', hand.getCals());
                    socket.emit('split', splitCard);
                    break;
                case 'S':
                    var stand = hand.stand();

                    socket.emit('calcs', hand.getCals());
                    break;
                case 'R':
                    var surrender = hand.surrender();

                    balance += 0.5 * hand.bet;

                    socket.emit('betBalanceChanged', {
                        balance: balance,
                        bet: hand.bet
                    });

                    log.createLog();
                    socket.emit('surrender', surrender);
                    break;
                case 'restart':
                    socket.emit('betBalanceChanged', {
                        balance: balance,
                        bet: 0
                    });

                    game = new Game();
                    socket.emit('restart');
                    break;
                default:
                    throw 'ex';
            }

            if (hand.winLoseDraw !== null && hand.winLoseDraw !== undefined) {
                socket.emit('graph', {
                    gamesCount: gamesCount,
                    balance: balance
                });
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
                        throw 'err';
                    }

                    socket.emit('betBalanceChanged', {
                        balance: balance,
                        bet: bet
                    });

                    log.createLog(playerHand);

                    playerHand.playerCount = playerHand.getPlayerCount();
                });

                socket.emit('graph', {
                    gamesCount: gamesCount,
                    balance: balance
                });

                socket.emit('stand', {
                    dealerCards: game.dealerCards,
                    dealerCount: game.getDealerCount(),
                    playerHands: hands
                });
            }
        }
        else {
            socket.emit('betBalanceChanged', {
                balance: balance,
                bet: 0
            });

            game = new Game();
            socket.emit('restart');
        }
    });


    function Log() {
        var _this = this;

        _this.createLog = function(playerHand) {
            var logHand = playerHand || hand;

            //[ToDo] save to Db and emit
            socket.emit('log', {
                balance: balance,
                bet: logHand.bet,
                gamesCount: gamesCount,
                dealerCount: game.getDealerCount(),
                playerCount: logHand.getPlayerCount(),
                dealerCards: game.dealerCards,
                playerCards: logHand.playerCards,
                winLoseDraw: logHand.winLoseDraw,
                actionsTrace: logHand.actionsTrace
            });
        };
    }


    //Bot
    socket.on('getBotCommand', function() {
        var action = null;

        if (!game.checkIsEnded()) {
            var calcs = game.getCurrentHand().getCals();

            action = calcs[0].strategy;
        }
        else {
            action = 'restart';
        }

        socket.emit('botCommand', action);
    });
});