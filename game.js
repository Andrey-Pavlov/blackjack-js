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
        pc1 = playerGetCard(),
        pc2 = playerGetCard();

    if (ddAfterSplit) {
        dealer.setDDAfterSplit(ddFlag);
    }
    else {
        dealer.setDDAfterSplit(enums.DD.none);
    }

    _this.start = function() {
        var dealerCount = dealerHand.getTotal(),
            playerCount = dealerHand.getTotal(),
            dc1 = dealerGetCard(),
            dc2 = dealer.setUpcard(dc1, theDeck);

        var calcs = _this.getCals();

        return {
            player: {
                cards: [pc1, pc2],
                count: dealerCount
            },
            dealer: {
                cards: [dc1, dc2],
                count: playerCount
            },
            calcs: calcs
        };
    };

    _this.hit = function() {
        var card = playerGetCard();

        return {
            card: card,
            playerCount: player.getTotal(),
            dealerCount: dealerHand.getTotal()
        };
    };

    function playerGetCard() {
        var card = theDeck.getRandomCard();

        if (card) {
            theDeck.remove(card);
            player.hit(card);
        }

        return card;
    }

    function dealerGetCard() {
        var card = theDeck.getRandomCard();

        if (card) {
            theDeck.remove(card);
            dealerHand.hit(card);
        }

        return card;
    }

    _this.stand = function() {
        var cards = [];

        recursive(cards);

        return {
            cards: cards,
            dealerCount: dealerHand.getTotal(),
            playerCount: player.getTotal()
        };

        function recursive(cards) {
            var card = dealerGetCard();
            cards.push(card);

            // hit again or add to probabilities
            if (dealerHand.getTotal() < 17 || (dealerHand.isSoft17() && hitsSoft17)) {
                recursive(cards);
            }
        }
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
            strategy: strategy,
            value: standVal
        });

        strategy = 'H';
        strategyCalcs.push({
            strategy: strategy,
            value: hitVal
        });

        strategy = 'D';
        strategyCalcs.push({
            strategy: strategy,
            value: ddVal
        });

        strategy = 'P';
        strategyCalcs.push({
            strategy: strategy,
            value: splitVal
        });

        strategy = 'R';
        strategyCalcs.push({
            strategy: strategy,
            value: -0.5
        });

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

    _this.reset = function() {
        theDeck = new Deck(ndecks);
    };
}

exports.Game = Game;