var common = require('./blackjack/common.js'),
    enums = common.enums,
    Dealer = require('./blackjack/dealer.js'),
    Deck = require('./blackjack/deck.js'),
    Hand = require('./blackjack/hand.js'),
    rules = require('./blackjack/blackjackRules.json');

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

function Game() {
    var _this = this,
        dealer = new Dealer(hitsSoft17, cacheCards),
        dealerHand = dealer.getHand(),
        player = new Hand(),
        theDeck = new Deck(ndecks),
        playerCards = [],
        dealerCards = [],
        pc1 = null,
        pc2 = null;

    if (ddAfterSplit) {
        dealer.setDDAfterSplit(ddFlag);
    }
    else {
        dealer.setDDAfterSplit(enums.DD.none);
    }

    _this.initObject = null;

    _this.actionsTrace = [];

    _this.winLoseDraw = null;

    _this.hit = function() {
        _this.actionsTrace.push('H');

        var card = playerGetCard();

        if (player.getTotal() > 21) {
            _this.winLoseDraw = 'lose';
        }

        var result = {
            card: card,
            playerCount: player.getTotal(),
            dealerCount: dealerHand.getTotal()
        };

        return result;
    };

    function playerGetCard() {
        var card = theDeck.getRandomCard();

        theDeck.remove(card);
        player.hit(card);

        playerCards.push(card);

        return card;
    }

    function dealerGetCard() {
        var card = theDeck.getRandomCard();

        theDeck.remove(card);
        dealerHand.hit(card);

        dealerCards.push(card);

        return card;
    }

    _this.stand = function() {
        _this.actionsTrace.push('S');

        var cards = [];

        recursive(cards);

        var dealerCount = dealerHand.getTotal();
        var playerCount = player.getTotal();

        if (dealerCount > 21 || playerCount > dealerCount) {
            _this.winLoseDraw = 'win';
        }
        else if (dealerCount === playerCount) {
            _this.winLoseDraw = 'draw';
        }
        else {
            _this.winLoseDraw = 'lose';
        }

        var result = {
            cards: cards,
            dealerCount: dealerCount,
            playerCount: playerCount
        };

        return result;

        function recursive(cards) {
            var card = dealerGetCard();
            cards.push(card);

            if (dealerHand.getTotal() < 17 || (dealerHand.isSoft17() && hitsSoft17)) {
                recursive(cards);
            }
        }
    };

    _this.doubleDown = function() {
        _this.actionsTrace.push('D');

        var hit = _this.hit();
        if (hit.winLoseDraw !== 'lose') {
            var stand = _this.stand();

            stand.card = hit.card;

            return stand;
        }

        return hit;
    };

    _this.surrender = function() {
        _this.actionsTrace.push('R');

        _this.winLoseDraw = 'lose';

        return {
            winLoseDraw: _this.winLoseDraw
        };
    };

    _this.getCals = function() {
        var strategyCalcs = [],
            standVal = 1.5,
            hitVal,
            ddVal,
            splitVal;

        if (!player.isNatural()) {
            standVal = player.standExval(theDeck, dealer);
        }

        hitVal = player.hitExval(theDeck, dealer);
        if (ddFlag === enums.DD.l0OR11 && (player.isSoft() || (player.getTotal() != 10 && dealerHand.getTotal() != 11))) {
            ddVal = -5;
        }
        else {
            ddVal = player.doubleExval(theDeck, dealer);
        }

        if (player.getLength() === 2 && pc1 === pc2) {
            player.unhit(pc1);
            splitVal = player.approxSplitPlay(theDeck, dealer, resplitting && pc1 != 1);
            player.hit(pc1);
        }
        else {
            splitVal = -5;
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

        if (player.getLength() == 2) {
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

    _this.getDealerCards = function() {
        return dealerCards;
    };

    _this.getPlayerCards = function() {
        return playerCards;
    };

    _this.reset = function() {
        theDeck = new Deck(ndecks);
    };

    (function() {
        pc1 = playerGetCard();
        pc2 = playerGetCard();

        var dealerCount = dealerHand.getTotal(),
            playerCount = dealerHand.getTotal(),
            dc1 = theDeck.getRandomCard();

        dealer.setUpcard(dc1, theDeck);
        dealerCards.push(dc1);

        var calcs = _this.getCals();

        _this.initObject = {
            player: {
                cards: [pc1, pc2],
                count: dealerCount
            },
            dealer: {
                cards: [dc1, null],
                count: playerCount
            },
            calcs: calcs
        };
    }());
}

exports.Game = Game;