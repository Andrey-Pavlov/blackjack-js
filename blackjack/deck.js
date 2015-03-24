var common = require("./common"),
    utils = require('./utils'),
    constants = common.constants;

function Deck(nd) {
    var _this = this,
        isInfinityDeck = false,
        ndecks, // number of decks
        ncards, // number of cards left
        totalCards, // total number of cards
        totalOne, // total number of one type of crad in full deck
        totalTens, // number of tens in full deck
        nc = new Array(11), // card counts ([1] thru [10])
        handHashTable = null;

    //#region Deck: Methods

    _this.getRandomCard = function() {
        var indexes = [];

        nc.forEach(function(item, index) {
            if (item > 0) {
                indexes.push(index);
            }
        });

        return utils.randomFromValues(indexes);
    };

    // remove card(s) (if possible) and return true or false if removed
    _this.remove = function(card1, card2) {
        if (card2) {
            if (!remove(card1)) {
                return false;
            }

            if (!remove(card2)) {
                _this.restore(card1);
                return false;
            }
            return true;
        }
        else {
            return remove(card1);
        }

        function remove(card) {
            if (nc[card] === 0) {
                return false;
            }

            if (!isInfinityDeck) {
                nc[card] --;
                ncards--;
            }

            return true;
        }
    };

    // remove card (if possible), calculate conditional weight assuming dealer
    // does not have blackjack. Return true or false if removed 
    _this.removeAndGetWeight = function(card, wt, dealer) {
        if (nc[card] === 0) {
            return false;
        }

        if (dealer) {
            var upcard = dealer.getUpcard();

            if (upcard === constants.ACE || upcard === constants.TEN) {
                wt.weight = nc[card] / (ncards - 1);
                if (card !== 11 - upcard) {
                    wt.weight *= (ncards - nc[11 - upcard] - 1) / (ncards - nc[11 - upcard]);
                }
            }
            else {
                wt.weight = nc[card] / ncards;
            }
        }
        else {
            wt.weight = nc[card] / ncards;
        }

        if (!isInfinityDeck) {
            nc[card] --;
            ncards--;
        }

        return true;
    };

    // return conditional probablity that the next card is not splitCard
    _this.probNotSplitCard = function(splitCard, dealer) {
        var probSplit;
        var upcard = dealer.getUpcard();

        // get probablity next card is a split card
        if (upcard === constants.ACE || upcard === constants.TEN) { // conditional probability of split given dealer has an ace or a ten
            probSplit = nc[splitCard] / (ncards - 1);
            if (splitCard != 11 - upcard)
                probSplit *= (ncards - nc[11 - upcard] - 1) / (ncards - nc[11 - upcard]);
        }
        else {
            probSplit = nc[splitCard] / ncards;
        }

        // one minus is probablity not a split card
        return 1 - probSplit;
    };

    // Get probability splitting 2, 3, 4 hands
    // assumes at least 1 split card in the deck
    _this.probSplit234 = function(splitCard, dealer, prob) {
        var pns,
            pnm1s,
            pnm3ss,
            pnm2ss,
            pnm1ss,
            upcard = dealer.getUpcard();

        if (upcard === constants.ACE || upcard === constants.TEN) {
            pns = nc[splitCard] / (ncards - 1);
            pnm1s = nc[splitCard] / (ncards - 2);
            pnm1ss = (nc[splitCard] - 1) / (ncards - 2);
            pnm2ss = (nc[splitCard] - 1) / (ncards - 3);
            pnm3ss = (nc[splitCard] - 1) / (ncards - 4);
            if (splitCard != (11 - upcard)) {
                var nmnj = (ncards - nc[11 - upcard]);
                pns *= (nmnj - 1) / nmnj;
                pnm1s *= (nmnj - 2) / (nmnj - 1);
                pnm1ss *= (nmnj - 2) / (nmnj - 1);
                pnm2ss *= (nmnj - 3) / (nmnj - 2);
                pnm3ss *= (nmnj - 4) / (nmnj - 3);
            }
        }
        else {
            pns = nc[splitCard] / ncards;
            pnm1s = nc[splitCard] / (ncards - 1);
            pnm1ss = (nc[splitCard] - 1) / (ncards - 1);
            pnm2ss = (nc[splitCard] - 1) / (ncards - 2);
            pnm3ss = (nc[splitCard] - 1) / (ncards - 3);
        }

        // Let n=nonsplit, s=split, x=any
        prob[0] = (1 - pns) * (1 - pnm1s); // nnxx (4) = P(2)
        var probns = (1 - pns) * pnm1s;
        var probsn = pns * (1 - pnm1ss);
        prob[8] = probsn * (1 - pnm2ss) * (1 - pnm3ss); // snnn (1) = P(3/2)
        prob[9] = probns * (1 - pnm2ss) * (1 - pnm3ss); // nsnn (2) = P(3/1)
        prob[1] = prob[8] + prob[9]; // nsnn + snnn (2) = P(3)
        prob[2] = 1 - prob[0] - prob[1]; // the rest (10) = P(4)

        // partition prob[2] into specific orders
        prob[3] = pns * pnm1ss; // ssxx (4) = P(4/5)
        prob[4] = probsn * pnm2ss; // snsx (2) = P(4/4)
        prob[5] = probsn * (1. - pnm2ss) * pnm3ss; // snns (1) = P(4/3)
        prob[6] = probns * pnm2ss; // nssx (2) = P(4/2)
        prob[7] = probns * (1. - pnm2ss) * pnm3ss; // nsns (1) = P(4/1)

        //cout << " P[4]: " << prob[2] << " summed P[4]: " << (prob[3]+prob[4]+prob[5]+prob[6]+prob[7]) << endl;

    };

    // restore card(s) - assumes they can be restored
    _this.restore = function(card1, card2) {
        if (!isInfinityDeck) {

            restore(card1);

            if (card2) {
                restore(card2);
            }
        }

        function restore(card) {
            nc[card] ++;
            ncards++;
        }
    };

    // compile non-decreasing list of removed cards
    _this.getRemovals = function(maxSave, removed, upcard) {
        // are too many gone
        if (totalCards - ncards - 1 > maxSave) {
            return false;
        }

        // Temporarily reinstate dealer up card 
        if (upcard > 0) {
            nc[upcard] ++;
        }

        // Decribe removed cards in nondecreasing sequence where
        //	card of rank i (ace=1) is called i and non-existent
        //	card is called 0
        var num = 0; // Number removed cards found

        // Special case for 10's to save small amount of time
        var cardStop = totalTens - nc[constants.TEN];
        while (num < cardStop) {
            removed[num++] = constants.TEN;
        }

        // Rest of the ranks
        for (var i = 9; i >= constants.ACE; i--) {
            cardStop = num + totalOne - nc[i];

            while (num < cardStop) {
                removed[num++] = i;
            }
        }

        // Fill remaining card_ids with 0
        while (num < maxSave) {
            removed[num++] = 0;
        }

        // Remove dealer upcard again
        if (upcard > 0) {
            nc[upcard] --;
        }

        return true;
    };

    //#endregion

    //# region Deck::Hand Hash Table

    // initialize hand has table, return false if fails
    _this.initHandHashTable = function(dealer) {
        if (handHashTable != null) {
            return true;
        }

        //var handBytes = dealer.getTj(constants.MAX_HAND_SIZE, 11) * 4;//sizeof(int);
        handHashTable = []; //new Array(handBytes);
        if (handHashTable === null) {
            return false;
        }
        return true;
    };

    // clear the hand hash table
    _this.clearHandHashTable = function(dealer) {
        var length = dealer.getTj(constants.MAX_HAND_SIZE, 11);
        for (var i = 0; i < length; i++) {
            handHashTable[i] = -1;
        }
    };

    // check current hand in the hand hashtable
    _this.getHandAddress = function(dealer, splitCard, endIndex) {
        // temporarily restore the two split cards
        nc[splitCard] ++;
        nc[splitCard] ++;

        // warning - assumes deck will always get removals and will always get valid address
        var removed = new Array(constants.MAX_HAND_SIZE);
        _this.getRemovals(constants.MAX_HAND_SIZE, removed, dealer.getUpcard());
        var address = 0;
        for (var i = 0; i < constants.MAX_HAND_SIZE; i++) {
            address += dealer.Tj[constants.MAX_HAND_SIZE - i - 1][removed[i]];
        }

        // retrieve this hand's index in playable hands list
        var handIndex = handHashTable[address];

        // if first time, store its index
        if (handIndex < 0) {
            handHashTable[address] = endIndex;
            handIndex = endIndex;
        }

        // remove split cards again
        nc[splitCard] --;
        nc[splitCard] --;

        return handIndex;
    };

    //#endregion

    //#region Deck: Accessors

    // reset decks to all cards present
    _this.setDecks = function(nd) {
        if (!isFinite(nd)) {
            isInfinityDeck = true;

            nd = 1;
        }

        ndecks = nd;
        totalOne = 4 * nd;

        for (var i = constants.ACE; i < constants.TEN; i++) {
            nc[i] = totalOne;
        }

        totalTens = nc[constants.TEN] = 16 * nd;
        totalCards = ncards = 52 * nd;
    };

    // return number of decks
    _this.getDecks = function() {
        return ndecks;
    };

    // number of certain denomination
    _this.getNumber = function(value) {
        return nc[value];
    };

    // total number of cards left
    _this.getTotalCards = function() {
        return ncards;
    };

    //#endregion

    //#region Deck: Constructors and Destructors

    if (nd) {
        _this.setDecks(nd);
    }
    else {
        _this.setDecks(1);
    }

    //#endregion
}

module.exports = Deck;