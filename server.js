var path = require('path');
var express = require('express');
var app = express();

var server = app.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0");
var io = require('socket.io').listen(server);

app.use(express.static(path.resolve(__dirname, 'game')));


var utils = require('utils');
var cards = ['jack', 'queen', 'king', 'ace', 2, 3, 4, 5, 6, 7, 8, 9, 10],
    suits = ['spades', 'diamonds', 'clubs', 'hearts'];

function getCardValue(value){
    switch(value) {
        case 'jack':
        case 'king':
        case 'queen':
            return 10;
            break;
        case 'ace':
            return 1;
            break;
        default:
            return value;
            break;
    }
}

function PlayerBaseModel(card1, card2){
    var _this = this,
        summ = 0;


    var card1Value = getCardValue(card1);
    summ += getCardValue(card1) === 1 ? 11 : getCardValue(card1);


}

io.on('connection', function(socket) {

    socket.emit('start', (function() {
        var dealerValue = utils.randomFromValues(cards),
            dealer = {
                summ: getCardValue(dealerValue),
                card1: {
                    value: dealerValue,
                    suit: utils.randomFromValues(suits)
                },
                card2: null
            },
playerCard1 = utils.randomFromValues(cards),
            playerCard2 = utils.randomFromValues(cards);




        return {
            dealer: dealer,
            player: {

                card1: {
                    suit: utils.randomFromValues(suits),
                    value: utils.randomFromValues(cards)
                },
                card2: {
                    suit: utils.randomFromValues(suits),
                    value: utils.randomFromValues(cards)
                }
            }
    }}()));

    socket.on('action', function(data) {
        switch (data.action) {
            case 'dd':
                break;
            case 'hit':
                player1++;
                break;
            case 'split':
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