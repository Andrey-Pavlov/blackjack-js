"use strict";

var common = require('./common.js'),
    enums = common.enums,
    constants = common.constants,
    stdout = process.stdout,
    PlayHand = require('./playHand.js');

function Hand() {
    var total = 0,
        aces = 0,
        cards = 0,
        cardsValues = [],
        firstCard,
        doubled,
        order,
        _this = this;

    _this.getLength = function() {
        return cards;
    };

    _this.reset = function(card1, card2, deck) {
        if (card2 instanceof Object) {
            deck = card2;
            card2 = null;
        }

        reset(card1, card2);

        if (deck) {
            deck.remove(card1, card2);
        }

        function reset(card1, card2) {
            if (card1) {
                firstCard = card1;
                aces = 0;
                doubled = 1;

                if (card1 === 1) {
                    aces++;
                }

                if (card2) {
                    total = card1 + card2;

                    if (card2 === 1) {
                        aces++;
                    }

                    cards = 2;

                }
                else {
                    total = card1;

                    cards = 1;
                }
            }
            else {
                total = aces = cards = firstCard = 0;
            }
        }
    };

    _this.hit = function(card) {
        total += card;

        if (card === 1) {
            aces++;
        }

        cards++;
        
        return card;
    };

    _this.unhit = function(card, deck) {
        total -= card;

        if (card === 1) {
            aces--;
        }

        cards--;

        if (deck) {
            deck.restore(card);
        }
        
        return card;
    };

    //Expected values

    _this.standExval = function(deck, dealer) {
        // loss if busted
        var index = _this.getPlayerIndex();

        if (index > enums.ExVal.ExVal21) {
            return -1;
        }

        // get expected values from dealer probablities
        var probs = new common.DealerProbs();
        dealer.getPlayerExVals(deck, probs);
        return probs.p[index];
    };

    _this.hitExval = function(deck, dealer) {
        var exval = 0,
            wt = {
                weight: 0
            };

        for (var i = constants.ACE; i <= constants.TEN; i++) {
            if (!deck.removeAndGetWeight(i, wt, dealer)) {
                continue;
            }

            // add card
            _this.hit(i);

            // hit again or add to probabilities
            if (_this.basicHit(deck, dealer)) {

                exval += wt.weight * _this.hitExval(deck, dealer);

            }
            else {
                exval += wt.weight * _this.standExval(deck, dealer);
            }

            // remove from hand and restore to deck
            _this.unhit(i, deck);
        }

        return exval;
    };

    _this.doubleExval = function(deck, dealer) {
        var exval = 0,
            wt = {
                weight: 0
            };

        for (var i = constants.ACE; i <= constants.TEN; i++) {
            if (!deck.removeAndGetWeight(i, wt, dealer)) {
                continue;
            }

            // add card
            _this.hit(i);

            // add expected value
            exval += wt.weight * _this.standExval(deck, dealer);

            // remove from hand and restore to deck
            _this.unhit(i, deck);
        }

        // double for expected value
        return 2 * exval;
    };

    _this.splitStandExval = function(deck, dealer, kout) {
        // loss if busted
        var index = _this.getPlayerIndex();

        if (index > enums.ExVal.ExVal21) {
            return -1;
        }

        // normal dealer probabilites if none out or if all are out
        var probs = new common.DealerProbs();
        if (kout === 0 || deck.getNumber(firstCard) === 0) {
            dealer.getPlayerExVals(deck, probs);
        }
        else {
            dealer.getSplitPlayerExVals(deck, probs, firstCard, kout);
        }

        return probs.p[index];
    };

    //Splitting
    _this.splitCalcs = function(deck, dealer, replitFlags, ddFlags, results) {
        var i;

        for (i = 0; i < 6; i++) results[i] = 0;

        // replit options
        for (i = 1; i <= 2; i++) { // skip if this replitting option not selected
            if (!(i & replitFlags)) {
                continue;
            }

            var resplit = (i === enums.resplit.allowed);
            var base = resplit ? 3 : 0;

            // do DD not allowed
            if (ddFlags & enums.DD.none) {
                dealer.setDDAfterSplit(enums.DD.none);
                results[base] = _this.approxSplitPlay(deck, dealer, resplit);
            }

            // do DD any allowed
            if (ddFlags & enums.DD.any) {
                if (ddFlags & enums.DD.none && (firstCard === constants.TEN || firstCard === constants.ACE))
                    results[base + 1] = results[base];
                else {
                    dealer.setDDAfterSplit(enums.DD.any);
                    results[base + 1] = _this.approxSplitPlay(deck, dealer, resplit);
                }
            }

            // do DD 10 or 11 only allowed
            if (ddFlags & enums.DD.l0OR11) {
                if (ddFlags & enums.DD.any && (dealer.getUpcard() === 1 || dealer.getUpcard() >= 7 || firstCard >= 9 || firstCard === constants.ACE))
                    results[base + 2] = results[base + 1];
                else {
                    dealer.setDDAfterSplit(enums.DD.l0OR11);
                    results[base + 2] = _this.approxSplitPlay(deck, dealer, resplit);
                }
            }
        }
    };

    _this.approxSplitPlay = function(deck, dealer, resplit) {
        var explay = null;
        if (resplit) {
            // expected value with two split cards removed and conditioned
            // on second card of hand not being a split card
            var ex2 = _this.approxSplitExval(deck, dealer, resplit, 1);

            // remove another and repeat expected value
            var ex3 = 0,
                ex4 = 0;
                
            if (deck.remove(firstCard)) {
                ex3 = _this.approxSplitExval(deck, dealer, resplit, 2);

                // last hand with no resplit
                if (deck.remove(firstCard)) {
                    ex4 = _this.approxSplitExval(deck, dealer, false, 0);
                    //ex4 = ex3+(ex3-ex2);
                    deck.restore(firstCard);
                }
                else {
                    ex4 = 0;
                }

                deck.restore(firstCard);

                var prob = [];
                deck.probSplit234(firstCard, dealer, prob);
                explay = 2 * prob[0] * ex2 + 3 * prob[8] * ex3 + (ex2 + 2 * ex3) * prob[9];

                if (deck.getNumber(firstCard) > 1) {
                    explay += prob[3] * 4 * ex4 + prob[4] * (ex3 + 3 * ex4) + prob[5] * 2 * (ex3 + ex4) + prob[6] * (ex2 + 3 * ex4) + prob[7] * (ex2 + ex3 + 2 * ex4);
                }
                // Griffin analysis
                //explay = 2*prob[0]*ex2 + 3*prob[1]*ex3 + 4*prob[2]*ex4;
            }
            else {
                explay = 2 * ex2;
            }
        }
        else {
            explay = 2 * _this.approxSplitExval(deck, dealer, resplit, 0);
        }

        return explay;
    };

    _this.approxSplitExval = function(deck, dealer, resplit, kout) {
        var exval = 0,
            wt = {
                weight: 0
            },
            pns;

        // probability not a split card
        if (resplit && cards === 1) {
            pns = deck.probNotSplitCard(firstCard, dealer);
        }

        for (var i = constants.ACE; i <= constants.TEN; i++) {
            // If resplitting, skip another split card or calculate prob not split card
            if (resplit && cards === 1 && i === firstCard) 
            {
                continue;
            }

            // get weight and adjust if resplitting
            if (!deck.removeAndGetWeight(i, wt, dealer)) {
                continue;
            }

            if (resplit && cards === 1) {
                wt.weight /= pns;
            }

            // add card
            _this.hit(i);

            // hit again or add to probabilities
            if (_this.basicSplitHit(deck, dealer)) {
                exval += wt.weight * _this.approxSplitExval(deck, dealer, resplit, kout);
            }
            else {
                exval += doubled * wt.weight * _this.splitStandExval(deck, dealer, kout);
            }

            // remove from hand and restore to deck
            _this.unhit(i, deck);
        }

        return exval;
    };

    _this.exactSplitCalcs = function(deck, dealer, maxSplitHands, ddFlags, results) {
        var hands = new Array(maxSplitHands);
        var i;

        for (i = 0; i < 3; i++) {
            results[i] = 0;
        }

        // zero is this base hand
        hands[0] = _this;
        hands[0].setOrder(0);
        _this.unhit(firstCard);

        // create first new hand
        hands[1] = new Hand(firstCard);
        hands[1].setOrder(1);
        var numSplitHands = 2;

        // do DD not allowed
        if (ddFlags & enums.DD.none) {
            dealer.setDDAfterSplit(enums.DD.none);
            results[0] = _this.exactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands);
        }

        // do DD any allowed
        if (ddFlags & enums.DD.any) {
            if (ddFlags & enums.DD.none && (firstCard === constants.TEN || firstCard === constants.ACE))
                results[1] = results[0];
            else {
                dealer.setDDAfterSplit(enums.DD.any);
                results[1] = _this.exactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands);
            }
        }

        // do DD 10 or 11 only allowed
        if (ddFlags & enums.DD.l0OR11) {
            if (ddFlags & enums.DD.none && (firstCard === constants.TEN || firstCard === constants.ACE))
                results[2] = results[0];
            else if (ddFlags & enums.DD.any && (dealer.getUpcard() === 1 || dealer.getUpcard() >= 7 || firstCard >= 9 || firstCard === constants.ACE))
                results[2] = results[1];
            else {
                dealer.setDDAfterSplit(constants.DD.l0OR11);
                results[2] = _this.exactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands);
            }
        }

        // delete the second hand
        //delete hands[1];
        hands[1] = null;
    };

    _this.exactSplitExval = function(deck, dealer, hands, numSplitHands, maxSplitHands) {
        var exval = 0,
            wt = {
                weight: 0
            },
            newHand;

        for (var i = constants.TEN; i >= constants.ACE; i--) {
            if (!deck.removeAndGetWeight(i, wt, dealer)) {
                continue;
            }

            // add new hand or new card
            if (i === firstCard && cards === 1 && numSplitHands < maxSplitHands) {
                hands[numSplitHands] = new Hand(firstCard);
                hands[numSplitHands].setOrder(numSplitHands);
                numSplitHands++;
                newHand = true;
            }
            else {
                _this.hit(i);
                newHand = false;
            }

            // hit again, move on to next hand, or add to probabilities
            if (_this.basicSplitHit(deck, dealer)) {
                exval += wt.weight * _this.exactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands);
            }
            else if (this != hands[numSplitHands - 1]) {
                exval += wt.weight * hands[order + 1].exactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands);
            }
            else { // if just finished last hand then add up expected values for all hands
                var probs = new common.DealerProbs();

                dealer.getPlayerExVals(deck, probs);

                var totalVal = 0.;

                for (var j = 0; j < numSplitHands; j++) {
                    var index = hands[j].getPlayerIndex();
                    if (index > enums.ExVal.ExVal21) {
                        totalVal -= hands[j].getDoubled();
                    }
                    else {
                        totalVal += hands[j].getDoubled() * probs.p[index];
                    }
                }
                exval += wt.weight * totalVal;
            }

            // remove from hand and restore to deck or remove new hand and restore to deck
            if (newHand) {
                numSplitHands--;

                //delete hands[numSplitHands];
                hands[numSplitHands] = null;
                deck.restore(i);
            }
            else
                _this.unhit(i, deck);
        }

        return exval;
    };

    _this.handExactSplitCalcs = function(deck, dealer, maxSplitHands, ddFlags, results) {
        var playHands = null;

        var hands = new Array(maxSplitHands);

        for (var i = 0; i < 3; i++) {
            results[i] = 0;
        }

        // zero is this base hand
        hands[0] = _this;
        hands[0].setOrder(0);
        _this.unhit(firstCard);

        // create first new hand
        hands[1] = new Hand(firstCard);
        hands[1].setOrder(1);
        var numSplitHands = 2;

        // do DD not allowed
        if (ddFlags & enums.DD.none) {
            playHands = [];
            dealer.setDDAfterSplit(enums.DD.none);
            _this.collectHands(deck, dealer, playHands); // find list of possible hands
            results[0] = _this.handExactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands, playHands);
            playHands = null;
        }

        // do DD any allowed
        if (ddFlags & enums.DD.any) {
            playHands = [];
            if ((ddFlags & enums.DD.none) && (firstCard === constants.TEN || firstCard === constants.ACE))
                results[1] = results[0];
            else {
                dealer.setDDAfterSplit(enums.DD.any);
                _this.collectHands(deck, dealer, playHands); // find list of possible hands
                results[1] = _this.handExactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands, playHands);
                playHands = null;
            }
        }

        // do DD 10 or 11 only allowed
        if (ddFlags & enums.DD.l0OR11) {
            playHands = [];
            if (ddFlags & enums.DD.none && (firstCard === constants.TEN || firstCard === constants.ACE)) {
                results[2] = results[0];
            }
            else if (ddFlags & enums.DD.any && (dealer.getUpcard() === 1 || dealer.getUpcard() >= 7 || firstCard >= 9 || firstCard === constants.ACE)) {
                results[2] = results[1];
            }
            else {
                dealer.setDDAfterSplit(enums.DD.l0OR11);
                _this.collectHands(deck, dealer, playHands); // find list of possible hands
                results[2] = _this.handExactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands, playHands);
                playHands = null;
            }
        }

        // delete the second hand
        hands[1] = null;
    };

    _this.handExactSplitExval = function(deck, dealer, hands, numSplitHands, maxSplitHands, handList) {
        var exval = 0,
            probs,
            wt = {
                weight: 0
            };

        // check for resplitting
        if (numSplitHands < maxSplitHands) {
            if (deck.removeAndGetWeight(firstCard, wt, dealer)) {
                hands[numSplitHands] = new Hand(firstCard);
                hands[numSplitHands].setOrder(numSplitHands);
                numSplitHands++;
                exval += wt.weight * _this.handExactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands, handList);
                numSplitHands--;
                hands[numSplitHands] = null;
                deck.restore(firstCard);
            }
        }

        for (var i = 0; i < handList.length; i++) {
            if (numSplitHands < maxSplitHands && handList[i].isSplitable()) { // only use the non-split hands
                if (!handList[i].removeAndGetNonsplitWeight(deck, dealer, wt)) {
                    continue;
                }

                handList[i].fillNonsplitHand(_this);
            }
            else {
                if (!handList[i].removeAndGetWeight(deck, dealer, wt)) {
                    continue;
                }
                handList[i].fillHand(_this);
            }

            if (_this === hands[numSplitHands - 1]) { // if just finished last hand then add up expected values for all hands
                probs = new common.DealerProbs();
                dealer.getPlayerExVals(deck, probs);
                var totalVal = 0.;
                for (var j = 0; j < numSplitHands; j++) {
                    var index = hands[j].getPlayerIndex();
                    if (index > enums.ExVal.ExVal21) {
                        totalVal -= 1; // doubled hands are never a bust
                    }
                    else {
                        totalVal += hands[j].getBetPerHand() * probs.p[index];
                    }
                }
                exval += wt.weight * totalVal;
            }
            else { // if not last hand, move on to the next hand in the list
                exval += wt.weight * hands[order + 1].handExactSplitExval(deck, dealer, hands, numSplitHands, maxSplitHands, handList);
            }

            // remove all cards from hand (except the first) and restore to the deck
            handList[i].removeHand(_this, deck);
        }

        return exval;
    };

    //#region Collect Possible Hands

    // collect all possible hands for current split situation
    _this.collectHands = function(deck, dealer, handList) {
        var cds = new Array(20);
        deck.clearHandHashTable(dealer);
        cds[0] = 0;
        _this.enumerateHands(deck, dealer, cds, handList);
    };

    // clear objects in a handset
    // _this.clearHands = function(handList) {
    //     for (var j = 0; j < handList.length; j++) {
    //         handList[j] = null;
    //     }
    //     //handList.clear();
    // };

    // calculate the expected value to hit this hand and then finish using
    _this.enumerateHands = function(deck, dealer, cds, handList) {
        for (var i = constants.TEN; i >= constants.ACE; i--) {
            // get weight and adjust if resplitting
            if (!deck.remove(i)) {
                continue;
            }

            // add card
            _this.hit(i);
            cds[0] ++;
            cds[cds[0]] = i;

            // hit again or add to probabilities
            if (_this.basicSplitHit(deck, dealer))
                _this.enumerateHands(deck, dealer, cds, handList);
            else {
                var index = deck.getHandAddress(dealer, firstCard, handList.length);
                if (index === handList.length) {
                    handList.push(new PlayHand(cds, firstCard, doubled));
                }
                else {
                    handList[index].incrementRepeat(cds[1] === firstCard, doubled);
                }
            }

            // remove from hand and restore to deck
            cds[0] --;
            _this.unhit(i, deck);
        }
    };

    //#endregion

    //#region Basic strategy

    _this.basicSplitHit = function(deck, dealer) {
        if (cards === 1) {
            doubled = 1.;
            return true;
        }

        else if (cards === 2) { // split aces receive one card
            if (firstCard === constants.ACE) {
                return false;
            }

            // check on double down, if yes return from for a hit,  but set double to no future hits
            if (_this.basicDD(deck, dealer)) {
                doubled = 2;
                return true;
            }
            else
                doubled = 1;

            // two card exceptions
            var exception = {
                isThrown: null
            };
            var hit = _this.twoCardException(deck, dealer, exception);
            if (exception.isThrown) {
                return hit;
            }
        }

        // if doubled, then no more hits
        if (doubled > 1.5) {
            return false;
        }

        // all the rest use basicHit
        return _this.basicHit(deck, dealer);
    };

    _this.basicHit = function(deck, dealer) {
        var ndecks = deck.getDecks();
        var upcard = dealer.getUpcard();

        if (_this.isSoft()) {
            switch (upcard) {
                case constants.ACE:
                    if (ndecks === 1 && !dealer.getHitsSoft17() && total === 8) {
                        return false;
                    }
                case 9:
                    return total < 9;
                case constants.TEN:
                    return total < 9;
                default:
                    return total < 8;
            }
        }
        else { // default hard hitting
            switch (upcard) {
                case 2:
                case 3:
                    return total < 13;
                case 4:
                case 5:
                case 6:
                    return total < 12;
                case constants.TEN:
                    // stand 3 or more card 16s with one deck
                    if (total === 16 && ndecks === 1 && cards >= 3) {
                        return false;
                    }
                default:
                    return total < 17;
            }
        }
    };

    _this.twoCardException = function(deck, dealer, exception) {
        // only meant for 2 card hands
        if (cards != 2) {
            exception.isThrown = false;
            return false;
        }

        // get variables
        var ndecks = deck.getDecks();
        var upcard = dealer.getUpcard();
        var hits17 = dealer.getHitsSoft17();
        exception.isThrown = true;

        // check soft and hard hands
        if (!_this.isSoft()) {
            switch (ndecks) {
                case 1:
                    // Agrees with Griffin, Theory of Blackjack, page 20 (but only for !hits17)
                    if (upcard === 2) {
                        if (_this.handIs(10, 3) && !hits17) {
                            return true;
                        }
                    }
                    else if (upcard === 3) {
                        if (_this.handIs(8, 4)) {
                            return false;
                        }
                        if (_this.handIs(7, 5)) {
                            return false;
                        }
                        if (_this.handIs(6, 6)) {
                            return false; // not in Griffin because it is split instead
                        }
                    }
                    else if (upcard === 4) {
                        if (_this.handIs(constants.TEN, 2)) {
                            return true;
                        }
                    }
                    else if (upcard === 6) {
                        if (_this.handIs(10, 2) && !hits17) {
                            return true;
                        }
                    }
                    else if (upcard === constants.TEN) {
                        if (_this.handIs(7, 7)) {
                            return false;
                        }
                    }
                    break;

                case 2:
                    if (upcard === 3 && hits17) {
                        if (_this.handIs(8, 4)) {
                            return false;

                        }

                        if (_this.handIs(7, 5)) {
                            return false;
                        }

                        if (_this.handIs(6, 6)) {
                            return false;
                        }
                    }
                    else if (upcard === 4) {
                        if (_this.handIs(10, 2)) {
                            return true;
                        }
                    }
                    break;

                default:
                    if (upcard === 4 && !hits17) {
                        if (_this.handIs(10, 2)) {
                            return true;
                        }
                    }
                    break;
            }
        }

        // not an exception
        exception.isThrown = false;

        return false;
    };

    _this.basicDD = function(deck, dealer) {
        var ddOption = dealer.getDDAfterSplit();

        if (ddOption === enums.DD.none) {
            return false;
        }

        var ndecks = deck.getDecks();
        var upcard = dealer.getUpcard();
        var hits17 = dealer.getHitsSoft17();

        if (_this.isSoft()) { // no if 10/11 only
            if (ddOption === enums.DD.l0OR11) {
                return false;
            }

            // exceptions
            if (ndecks === 2) {
                if (upcard === 2) {
                    if (total === 7) {
                        return false;
                    }
                    if (total === 8 && hits17) {
                        return true;
                    }
                }
                else if (upcard === 4) {
                    if (total === 3) {
                        return false;
                    }
                    if (total === 4 && !hits17) {
                        return false;
                    }
                }
                else if (upcard === 6) {
                    if (total === 9 && !hits17) {
                        return false;
                    }
                }
            }
            else if (ndecks > 2) {
                if (upcard === 2) {
                    if (total === 7) {
                        return false;
                    }

                    if (total === 8 && hits17) {
                        return true;
                    }
                }
                else if (upcard === 4) {
                    if (total === 3) {
                        return false;
                    }
                    if (total === 4) {
                        return false;
                    }
                }
                else if (upcard === 6) {
                    if (total === 9 && !hits17) {
                        return false;
                    }
                }
            }

            // basic strategy
            switch (upcard) {
                case 2:
                    return total === 7;
                case 3:
                    if (total === 7 || total === 8) {
                        return true;
                    }
                    else {
                        return false;
                    }

                case 4:
                    return !(total >= 9 || total === 2);

                case 5:
                    return total < 9;

                case 6:
                    if (total >= 10) {
                        return false;
                    }
                    else {
                        return true;
                    }

                default:
                    return false;
            }
        }
        else {
            if (total > 11) {
                return false;
            }

            if (total < 10 && ddOption === enums.DD.l0OR11) {
                return false;
            }

            // exceptions
            if (ndecks === 1) { // Agrees with Griffin, Theory of Blackjack, page 20 (but only for !hits17)
                // No exception on 5 when hits17 is new here and it is very close (.13002 DD vs .129947 Hit)
                if (_this.handIs(6, 2)) {
                    if (upcard === 6 || (upcard === 5 && !hits17)) {
                        return false;
                    }
                }
            }
            else if (ndecks === 2) {
                if (total === 8 && (upcard === 5 || upcard === 6)) {
                    return false;
                }
                if (upcard === constants.ACE && !hits17) {
                    if (_this.handIs(9, 2)) {
                        return false;
                    }

                    if (_this.handIs(8, 3)) {
                        return false;
                    }

                }
            }
            else if (ndecks > 2) {
                if (total === 9 && upcard === 2) {
                    return false;
                }

                if (total === 8 && (upcard === 5 || upcard === 6)) {
                    return false;
                }

                if (upcard == constants.ACE && total == 11 && !hits17) {
                    return false;
                }
            }

            switch (upcard) {
                case 2:
                case 3:
                case 4:
                    if (total < 9) {
                        return false;
                    }
                    return true;

                case 5:
                case 6:
                    return total >= 8;

                case 7:
                case 8:
                case 9:
                    if (total < 10) {
                        return false;
                    }
                    else {
                        return true;
                    }

                    // T and A
                default:
                    if (total < 11) {
                        return false;
                    }
                    else {
                        return true;
                    }
            }
        }
    };

    _this.twoCardHit = function(deck, dealer) {
        var exception = {
            isThrown: null
        };
        var hit = _this.twoCardException(deck, dealer, exception);
        if (exception.isThrown) {
            return hit;
        }

        return _this.basicHit(deck, dealer);
    };

    //#endregion

    //#region Accessors

    // total for hand, accounting for if it is soft
    _this.getTotal = function() {
        return _this.isSoft() ? total + 10 : total;
    };

    // index into dealerplayer expected values arrays array (>ExVal21 means busted)
    _this.getPlayerIndex = function() {
        var sum = _this.getTotal();

        return sum < 16 ? enums.ExVal.ExVal16 : sum - 16;
    };

    // is it a soft hand
    _this.isSoft = function() {
        return (total < 12 && aces > 0);
    };

    // check if hand is soft 17 (for dealer use)
    _this.isSoft17 = function() {
        return total === 7 && aces > 0;
    };

    // has split hand been doubled
    _this.getDoubled = function() {
        return doubled;
    };

    _this.setDoubled = function(bet) {
        doubled = bet;
    };

    _this.getBetPerHand = function() {
        return doubled;
    };
    
    // return card required to make this hand a natural (or zero if none)
    _this.getNaturalCard = function() {
        if (cards > 1) {
            return 0;
        }
        
        if (total === constants.ACE || total === constants.TEN) {
            return 11 - total;
        }

        return 0;
    };

    // check if 2-card 21 or natural
    _this.isNatural = function() {
        return _this.getTotal() === 21 && cards === 2;
    };

    // return first card
    _this.getFirstCard = function() {
        return firstCard;
    };

    // check two card hand (only valid for 2-card hands)
    _this.handIs = function(c1, c2) {
        return total === c1 + c2 && (firstCard === c1 || firstCard === c2);
    };

    // set order of hands in exact splitting
    _this.setOrder = function(num) {
        order = num;
    };

    // display hand info
    _this.display = function() {
        stdout.write("(");
        if (cards === 1) {
            stdout.write(_this.cardChar(firstCard));
        }
        else if (cards === 2) {
            stdout.write(_this.cardChar(firstCard) + "," + _this.cardChar(total - firstCard));
        }
        else {
            stdout.write("cards=" + cards + ", 1st=" + firstCard);
        }

        if (_this.isSoft()) {
            stdout.write(" soft ");
        }
        else {
            stdout.write(" hard ");
        }

        stdout.write(_this.getTotal());
        if (doubled > 1.1) {
            stdout.write(", dbled");
        }

        stdout.write(")");
    };

    // display card character
    _this.cardChar = function(num) {
        if (num === 1) {
            return 'A';
        }
        else if (num === 10) {
            return 'T';
        }
        else {
            return '0' + num;
        }
    };

    //#endregion
}

module.exports = Hand;