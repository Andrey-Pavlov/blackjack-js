var common = require('./common'),
    utils = common.utils,
    constants = common.constants,
    enums = common.enums,
    Hand = require('./hand');

function Dealer(hits, cacheSize) {
    var _this = this,
        hitsSoft17,
        hand,
        totalWeight = 0,
        ddAfterSplit,
        removable = true,
        removed = new Array(100),
        //Tarray,
        hold = [];

    _this.Tj = [];
    _this.hold = hold;

    // Evaluate Tj function which is equal to N+j-1 things
    // taken j at a time
    _this.getTj = function(j, x) {
        if (x === 0) {
            return 0;
        }

        var tjcalc = 1.;
        for (var i = 1; i <= j; i++) {
            tjcalc = tjcalc * (x - 1 + i) / i;
        }

        return tjcalc;
    };

    // allocate memory for the dealer cache
    _this.initCacheTable = function(size) {
        var i, j;

        // // free previous array
        // if (Tarray != null) {
        //     // 	free(Tarray);
        //     // 	free(Tj);
        //     Tarray = [];
        //     Tj = [];
        //     Tarray = null;
        // }

        // size limits
        if (size > constants.MAX_CACHE_SIZE) {
            size = constants.MAX_CACHE_SIZE;
        }
        else if (size === 0) {
            cacheSize = 0;
        }

        // // allocate memory
        // var tarraySize;
        // while (true) {
        //     tarraySize = size > constants.MAX_HAND_SIZE ? size : constants.MAX_HAND_SIZE;

        //     // full Tarray data
        //     var blen = 11 * tarraySize * 4; //sizeof(unsigned long);
        //     Tarray = new Array(blen);
        //     if (Tarray === null) {
        //         size--;
        //         continue;
        //     }

        //     // pointers into the Tarray
        //     blen = tarraySize * 4; //(size_t)sizeof(long *);
        //     Tj = new Array(blen);

        //     if (Tj == null) {
        //         //free(Tarray);
        //         Tarray = [];
        //         Tarray = null;
        //         size--;
        //         continue;
        //     }

        //     //TODO
        //     var Tjptr = utils.clone(Tarray);

        //     for (i = 0; i < tarraySize; i++) {
        //         Tj[i] = Tjptr;
        //         Tjptr += 11;
        //     }

        //     // dealer probabilities
        //     //TODO
        //     var cacheBytes = _this.GetTj(size, 11) * sizeof(DealerProbs);
        //     hold = new Array(cacheBytes);
        //     if (hold === null) {
        //         //free(Tarray);
        //         Tarray = [];
        //         Tarray = null;
        //         //free(Tj);
        //         Tj = [];
        //         size--;
        //         continue;
        //     }

        //     // memory allocation successful
        //     break;
        // }

        var tarraySize = size > constants.MAX_HAND_SIZE ? size : constants.MAX_HAND_SIZE;


        // fill the Tj[i][j] = T_(i+1)(j) array
        for (i = 0; i < tarraySize; i++) {
            for (j = 0; j < 11; j++) {
                _this.Tj[i] = _this.Tj[i] || [];
                _this.Tj[i][j] = _this.getTj(i + 1, j);
            }
        }

        cacheSize = size;
    };

    //#region Dealer: Methods

    // given dealer upcard and current deck (with the card already removed),
    // calculate player expected values for hand <=16,17,18,19,20,21, expected value of bust is -1
    // the dealer does not have blackjack
    _this.getPlayerExVals = function(deck, probs) {
        var address,
            hasAddress = false,
            i1,
            i2,
            i3,
            i4;

        // see if already done
        if (deck.getRemovals(cacheSize, removed, _this.getRemovableUpcard())) {
            address = 0;
            for (i1 = 0; i1 < cacheSize; i1++) {
                address += _this.Tj[cacheSize - i1 - 1][removed[i1]];
            }

            if (hold[address].p[0] < 4) {
                probs.p = hold[address].p;
                return;
            }
            hasAddress = true;
        }

        // calculate the probabilities
        for (i2 = enums.Prob.Prob17; i2 <= enums.Prob.ProbBust; i2++) {
            probs.p[i2] = 0;
        }

        totalWeight = 1;
        hitDealer(deck, probs);

        // make conditional on no dealer blackjack
        var naturalCard = hand.getNaturalCard();
        if (naturalCard) {
            var probNatural = {
                weight: 0
            };

            if (deck.removeAndGetWeight(naturalCard, probNatural)) {
                probs.p[enums.Prob.Prob21] -= probNatural.weight;
                var norm = 0;
                for (i3 = enums.Prob.Prob17; i3 <= enums.Prob.ProbBust; i3++) {
                    norm += probs.p[i3];
                }
                for (i4 = enums.Prob.Prob17; i4 <= enums.Prob.ProbBust; i4++) {
                    probs.p[i4] /= norm;
                }
                deck.restore(naturalCard);
            }
        }

        // convert to player expectations
        var dlr = utils.clone(probs);
        probs.p[enums.ExVal.ExVal21] = dlr.p[enums.Prob.ProbBust] + dlr.p[enums.Prob.Prob20] + dlr.p[enums.Prob.Prob19] + dlr.p[enums.Prob.Prob18] + dlr.p[enums.Prob.Prob17];
        probs.p[enums.ExVal.ExVal20] = probs.p[enums.ExVal.ExVal21] - dlr.p[enums.Prob.Prob21] - dlr.p[enums.Prob.Prob20];
        probs.p[enums.ExVal.ExVal19] = probs.p[enums.ExVal.ExVal20] - dlr.p[enums.Prob.Prob20] - dlr.p[enums.Prob.Prob19];
        probs.p[enums.ExVal.ExVal18] = probs.p[enums.ExVal.ExVal19] - dlr.p[enums.Prob.Prob19] - dlr.p[enums.Prob.Prob18];
        probs.p[enums.ExVal.ExVal17] = probs.p[enums.ExVal.ExVal18] - dlr.p[enums.Prob.Prob18] - dlr.p[enums.Prob.Prob17];
        probs.p[enums.ExVal.ExVal16] = probs.p[enums.ExVal.ExVal17] - dlr.p[enums.Prob.Prob17];

        // store the results
        if (hasAddress) {
            hold[address] = probs;
        }
    };

    // given dealer upcard and current deck (with the card already removed) and knowlegde that player
    // has kout hole cards known not to be splitCards,  calculate player expected values for
    // hand <=16,17,18,19,20,21, expected value of bust is -1
    // the dealer does not have blackjack
    // Because of conditional weights, cannot use the dealer cache
    _this.getSplitPlayerExVals = function(deck, probs, splitCard, kout) {
        var i1, i2, i3;

        // calculate the probabilities with custom hit method
        for (i1 = enums.Prob.Prob17; i1 <= enums.Prob.ProbBust; i1++) {
            probs.p[i1] = 0;
        }
        totalWeight = 1;

        _this.splitHitDealer(deck, probs, splitCard, kout);

        // make conditional on no dealer blackjack
        var naturalCard = hand.getNaturalCard();
        if (naturalCard) {
            var probNatural = {
                weight: 0
            };
            
            if (deck.removeAndGetWeight(naturalCard, probNatural)) {

                probNatural = _this.conditionalSplitWt(probNatural, naturalCard, deck, splitCard, kout);

                probs.p[enums.Prob.Prob21] -= probNatural.weight;
                var norm = 0;
                for (i2 = enums.Prob.Prob17; i2 <= enums.Prob.ProbBust; i2++) {
                    norm += probs.p[i2];
                }

                for (i3 = enums.Prob.Prob17; i3 <= enums.Prob.ProbBust; i3++) {
                    probs.p[i3] /= norm;
                }

                deck.restore(naturalCard);
            }
        }

        // convert to player expectations
        var dlr = utils.clone(probs);
        probs.p[enums.ExVal.ExVal21] = dlr.p[enums.Prob.ProbBust] + dlr.p[enums.Prob.Prob20] + dlr.p[enums.Prob.Prob19] + dlr.p[enums.Prob.Prob18] + dlr.p[enums.Prob.Prob17];
        probs.p[enums.ExVal.ExVal20] = probs.p[enums.ExVal.ExVal21] - dlr.p[enums.Prob.Prob21] - dlr.p[enums.Prob.Prob20];
        probs.p[enums.ExVal.ExVal19] = probs.p[enums.ExVal.ExVal20] - dlr.p[enums.Prob.Prob20] - dlr.p[enums.Prob.Prob19];
        probs.p[enums.ExVal.ExVal18] = probs.p[enums.ExVal.ExVal19] - dlr.p[enums.Prob.Prob19] - dlr.p[enums.Prob.Prob18];
        probs.p[enums.ExVal.ExVal17] = probs.p[enums.ExVal.ExVal18] - dlr.p[enums.Prob.Prob18] - dlr.p[enums.Prob.Prob17];
        probs.p[enums.ExVal.ExVal16] = probs.p[enums.ExVal.ExVal17] - dlr.p[enums.Prob.Prob17];
    };

    // Recursive routine to hit dealer until done and accumulate the probablitiles
    // with knownledege that player has kout (!=0) hole cards known not to be splitCard
    _this.splitHitDealer = function(deck, probs, splitCard, kout) {
        var wt = {
            weight: 0
        };

        for (var i = constants.ACE; i <= constants.TEN; i++) {
            if (!deck.removeAndGetWeight(i, wt)) {
                continue;
            }

            wt = _this.conditionalSplitWt(wt, i, deck, splitCard, kout);

            // increase weight and adjust totals
            var oldWeight = totalWeight;
            totalWeight *= wt.weight;
            hand.hit(i);
            var sum = hand.getTotal();

            // hit again or add to probabilities
            if (sum < 17 || (hand.isSoft17() && hitsSoft17)) {
                _this.splitHitDealer(deck, probs, splitCard, kout);
            }
            else {
                var index = sum > 21 ? enums.Prob.ProbBust : sum - 17;
                probs.p[index] += totalWeight;
            }

            // restore card and weight
            hand.unhit(i, deck);
            totalWeight = oldWeight;
        }
    };

    // Convert dealer weight for card i to conditional weight given kout (!=0) cards of type splitCard known to be in player's hand
    _this.conditionalSplitWt = function(wt, i, deck, splitCard, kout) {
        var ntot = deck.getTotalCards() + 1; // number before card i was removed
        wt.weight *= ntot / (ntot - kout); // input wt = n(i)/ntot, now wt = n(i)/(ntot-k)
        if (i != splitCard) {
            var nj = deck.getNumber(splitCard);
            wt.weight *= (ntot - nj - kout) / (ntot - nj);
        }
        return wt;
    };

    //#endregion

    //#region Dealer: Accessors

    // change up card and remove from deck - caller is responsible for restoring to deck
    _this.setUpcard = function(card, deck) {
        hand.reset(card, deck);
        _this.clearCache();
    };

    _this.getUpcard = function() {
        return hand.getFirstCard();
    };
    
    _this.getHand = function() {
        return hand;
    };

    // for Griffin tables, convert to nonremovable upcard
    _this.makeUnremovable = function(deck) {
        removable = false;
        deck.restore(_this.getUpcard());
    };

    _this.getRemovableUpcard = function() {
        return removable ? hand.getFirstCard() : 0;
    };

    // clear dealer cache (whenever upcard changes)
    _this.clearCache = function() {
        if (cacheSize == 0) {
            return;
        }

        hold = [];
        var length = _this.getTj(cacheSize, 11);

        for (var i = 0; i < length; i++) {
            hold[i] = {};
            hold[i].p = [];
            hold[i].p[0] = 5;
        }
    };

    _this.getCacheSize = function() {
        return cacheSize;
    };
    // _this.getCacheBytes = function() {
    //     return _this.GetTj(cacheSize, 11) * utils.roughSizeOfObject(new common.Dealerprobs());
    // };

    // hitting of soft 17
    _this.getHitsSoft17 = function() {
        return hitsSoft17;
    };

    _this.setHitsSoft17 = function(hits) {
        hitsSoft17 = hits;
    };

    // return DD after split option
    _this.getDDAfterSplit = function() {
        return ddAfterSplit;
    };

    _this.setDDAfterSplit = function(ddOption) {
        ddAfterSplit = ddOption;
    };
    
    _this.getTotal = function() {
        return hand.getTotal();
    };
    
    _this.hit = function(card) {
        return hand.hit(card);
    };

    //#pragma endregion

    // Recursive routine to hit dealer until done and accumulate the probablitiles
    function hitDealer(deck, probs) {
        var wt = {
            weight: 0
        };

        for (var i = constants.ACE; i <= constants.TEN; i++) {
            if (!deck.removeAndGetWeight(i, wt)) {
                continue;
            }

            // increase weight and adjust totals
            var oldWeight = totalWeight;
            totalWeight *= wt.weight;
            hand.hit(i);
            var sum = hand.getTotal();

            // hit again or add to probabilities
            if (sum < 17 || (hand.isSoft17() && hitsSoft17))
                hitDealer(deck, probs);
            else {
                var index = sum > 21 ? enums.Prob.ProbBust : sum - 17;
                probs.p[index] += totalWeight;
            }

            // restore card and weight
            hand.unhit(i, deck);
            totalWeight = oldWeight;
        }
    }
    
    

    //#region Dealer: Constructors and Destructors

    // Constructors
    if (hits != null && cacheSize != null) {
        hitsSoft17 = hits;
        ddAfterSplit = enums.DD.none;
        hand = new Hand();
        //Tarray = null;
        _this.initCacheTable(cacheSize);
    }
    else {
        hitsSoft17 = false;
        ddAfterSplit = enums.DD.none;
        hand = new Hand();
        //Tarray = null;
        _this.initCacheTable(0);
    }
}

module.exports = Dealer;