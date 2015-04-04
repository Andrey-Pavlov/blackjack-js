var common = require('./blackjack/common.js'),
    enums = common.enums,
    Dealer = require('./blackjack/dealer.js'),
    Deck = require('./blackjack/deck.js'),
    Hand = require('./blackjack/hand.js'),
    rules = require('./blackjack/blackjackRules.json');

var utils = require('./blackjack/utils.js');
var _ = require('lodash');

// global defaults
var hitsSoft17 = false,
    ddFlag = enums.DD.any,
    ddAfterSplit = true,
    resplitting = false,
    ndecks = 1,
    cacheCards = 2,
    num = null;

if (rules.decksNumber) {
    num = parseInt(rules.decksNumber, 10);

    if (isNaN(num)) {
        num = parseFloat(rules.decksNumber, 10);

        if (isNaN(num)) {
            throw 'err'
        }
    }

    ndecks = num;
}

//rules
hitsSoft17 = rules.dealerStandOn17 !== 'true';

if (rules.ddAnyNot10Or11 === 'true') {
    ddFlag = enums.DD.any;
}
else {
    ddFlag = enums.DD.l0OR11;
}

if (rules.ddAfterSplitRestricted === 'true') {
    ddAfterSplit = false;
}

if (rules.resplitAllowed === 'true') {
    resplitting = true;
}

function Game(bet) {
    var _this = this,
        theDeck = new Deck(ndecks),
        dealer = new Dealer(hitsSoft17, cacheCards),
        dealerHand = dealer.getHand(),
        dealerCards = dealerHand.dealerCards = [],
        playerHands = [],
        dc1 = null,
        dc2 = null;

    //init
    if (ddAfterSplit) {
        dealer.setDDAfterSplit(ddFlag);
    }
    else {
        dealer.setDDAfterSplit(enums.DD.none);
    }

    (function() {
        dc1 = theDeck.getRandomCard();

        dealer.setUpcard(dc1, theDeck);
        dealerCards.push(dc1);

        dc2 = dealerGetCard();
        
        playerHands.push(new Player(bet));
    }());
    //

    _this.playerHands = playerHands;
    _this.dealerHand = dealerHand;
    _this.dealerCards = dealerCards;

    _this.getCurrentHand = function() {
        var hand = _.find(playerHands, function(playerHand) {
            return playerHand.isEnded === false;
        });

        return hand;
    };

    _this.checkIsEnded = function() {
        var playerHand = _.find(playerHands, function(playerHand) {
            return playerHand.isEnded === false;
        });

        if (utils.notNullOrUndefined(playerHand)) {
            return false;
        }
        else {
            return true;
        }
    };

    _this.getDealerCount = function() {
        return dealerHand.getTotal();
    };

    function dealerGetCard() {
        var card = theDeck.getRandomCard();

        theDeck.remove(card);
        dealerHand.hit(card);

        dealerCards.push(card);

        return card;
    }


    _this.stand = function() {
        recursive();

        var dealerCount = dealerHand.getTotal();
        var dealerNatural = dealerHand.isNatural();

        _.each(playerHands, function(hand) {
            hand.isEnded = true;
            var playerCount = hand.getPlayerCount();
            var playerNatural = hand.isNatural();

            if (dealerCount === playerCount) {
                if (!dealerNatural && playerNatural) {
                    hand.winLoseDraw = 'win';
                    hand.dealerOrPlayerBlackjack = 'player';
                }
                else if (dealerNatural && !playerNatural) {
                    hand.winLoseDraw = 'lose';
                    hand.dealerOrPlayerBlackjack = 'dealer';
                }
                else if (!dealerNatural && !playerNatural) {
                    hand.winLoseDraw = 'draw';
                }
                else {
                    throw 'ex';
                }
            }
            else if (playerCount > dealerCount || dealerCount > 21) {
                hand.winLoseDraw = 'win';
            }
            else if (playerCount < dealerCount) {
                hand.winLoseDraw = 'lose';
            }
            else {
                throw 'ex';
            }
        });

        return playerHands;

        function recursive() {
            if (dealerHand.getTotal() < 17 || (dealerHand.isSoft17() && hitsSoft17)) {
                dealerGetCard();
                recursive();
            }
        }
    };

    // _this.reset = function() {
    //     theDeck = new Deck(ndecks);
    // };

    function Player(bet, newSplitCard) {
        var _thisPlayer = this,
            hand = new Hand();

        _thisPlayer.bet = bet;

        _thisPlayer.actionsTrace = [];

        _thisPlayer.winLoseDraw = null;

        _thisPlayer.dealerOrPlayerBlackjack = null;

        _thisPlayer.isEnded = false;

        _thisPlayer.playerCards = [];


        //initHand
        (function() {
            var card1 = newSplitCard || theDeck.getRandomCard();
            _thisPlayer.playerCards.push(card1);
            hand.hit(card1);
            theDeck.remove(card1);

            var card2 = theDeck.getRandomCard();
            _thisPlayer.playerCards.push(card2);
            hand.hit(card2);
            theDeck.remove(card2);

            if (!!newSplitCard) {
                hand.reset(card1, card2, theDeck);
            }
        }());

        _thisPlayer.getCard = getCard;

        _thisPlayer.isNatural = function() {
            return hand.isNatural;
        };

        function getCard() {
            var card = theDeck.getRandomCard();

            theDeck.remove(card);
            hand.hit(card);

            _thisPlayer.playerCards.push(card);

            return card;
        }

        _thisPlayer.getPlayerCount = function() {
            return hand.getTotal();
        };

        _thisPlayer.stand = function() {
            _thisPlayer.actionsTrace.push('S');

            _thisPlayer.isEnded = true;
        };

        _thisPlayer.hit = function() {
            _thisPlayer.actionsTrace.push('H');

            var card = getCard();

            if (hand.getTotal() > 21) {
                _thisPlayer.winLoseDraw = 'lose';
                _thisPlayer.isEnded = true;
            }

            var result = {
                winLoseDraw: _thisPlayer.winLoseDraw,
                card: card,
                playerCount: hand.getTotal()
            };

            return result;
        };

        _thisPlayer.doubleDown = function() {
            _thisPlayer.actionsTrace.push('D');

            var hit = _thisPlayer.hit();
            // if (hit.winLoseDraw !== 'lose') {
            //     var stand = _thisPlayer.stand();

            //     stand.card = hit.card;
            //     return stand;
            // }
            _thisPlayer.isEnded = true;

            _thisPlayer.bet *= 2;

            return hit;
        };

        _thisPlayer.split = function() {
            _thisPlayer.actionsTrace.push('P');
            var unhitCard = hand.unhit(_thisPlayer.playerCards.splice(1, 1)[0]);

            var newHand = new Player(_thisPlayer.bet, unhitCard);
            playerHands.push(newHand);

            var playerCard = getCard();

            return {
                splitCard: newHand.playerCards[1],
                playerCard: playerCard
            };
        };

        _thisPlayer.surrender = function() {
            _thisPlayer.actionsTrace.push('R');

            _thisPlayer.winLoseDraw = 'lose';

            _thisPlayer.isEnded = true;

            return {
                winLoseDraw: _thisPlayer.winLoseDraw
            };
        };

        _thisPlayer.getCals = function() {
            var strategyCalcs = [],
                standVal = 1.5,
                hitVal,
                ddVal,
                splitVal;

            //deck for calcs
            dealerHand.unhit(dc2);
            theDeck.restore(dc2);
            //

            if (!hand.isNatural()) {
                standVal = hand.standExval(theDeck, dealer);
            }

            hitVal = hand.hitExval(theDeck, dealer);
            if (ddFlag === enums.DD.l0OR11 && (hand.isSoft() || (hand.getTotal() != 10 && dealerHand.getTotal() != 11))) {
                ddVal = -2;
            }
            else {
                ddVal = hand.doubleExval(theDeck, dealer);
            }

            if (hand.getLength() === 2 && _thisPlayer.playerCards[0] === _thisPlayer.playerCards[1]) {
                hand.unhit(_thisPlayer.playerCards[0]);
                splitVal = hand.approxSplitPlay(theDeck, dealer, resplitting && _thisPlayer.playerCards[0] != 1);
                hand.hit(_thisPlayer.playerCards[0]);
            }
            else {
                splitVal = -2;
            }

            // get the maximum
            var strategy = 'S';
            strategyCalcs.push({
                name: 'Stand',
                strategy: strategy,
                value: standVal
            });

            strategy = 'H';
            strategyCalcs.push({
                name: 'Hit',
                strategy: strategy,
                value: hitVal
            });

            if (hand.getLength() == 2) {
                strategy = 'P';
                strategyCalcs.push({
                    name: 'Split',
                    strategy: strategy,
                    value: splitVal
                });

                strategy = 'D';
                strategyCalcs.push({
                    name: 'Double Down',
                    strategy: strategy,
                    value: ddVal
                });

                strategy = 'R';
                strategyCalcs.push({
                    name: 'Surrender',
                    strategy: strategy,
                    value: -0.5
                });
            }

            strategyCalcs.sort(compareCards);
            strategyCalcs.reverse();

            //Restore original deck
            theDeck.remove(dc2);
            dealerHand.hit(dc2);
            //

            return strategyCalcs;

            function compareCards(a, b) {
                if (a.value < b.value) {
                    return -1;
                }
                if (a.value > b.value) {
                    return 1;
                }
                return 0;
            }
        };
    }
}

exports.Game = Game;