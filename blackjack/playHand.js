var stdout = process.stdout,
common = require('./common'),
constants = common.constants;

function PlayHand(cds, firstCard, betsize) {
    var _this = this,
        cards = new Array(constants.MAX_HAND_SIZE + 1), // 0 is # of cards, cards then follow
        repeat,
        splits,
        bet,
        splitBet,
        splitCard;

    if (cds && firstCard && betsize) {
        cards[0] = cds[0];
        for (var i = 1; i <= cds[0]; i++) cards[i] = cds[i];
        repeat = 1;
        splitCard = firstCard;
        bet = betsize;
        if (cds[1] === splitCard) {
            splits = 1;
            splitBet = betsize;
        }
        else {
            splits = 0;
            splitBet = 0.;
        }
    }
    else {
        cards[0] = 0;
        repeat = 0;
        bet = 0.;
        splitBet = 0.;
        splitCard = 0;
    }

    //#region PlayHand: Methods

    // add 1 to repeat counter
    _this.incrementRepeat = function(splitable, betsize) {
        repeat++;
        bet += betsize;
        if (splitable) {
            splits++;
            splitBet += betsize;
        }
    };

    // print hand to standard output
    _this.display = function()
    {	
        stdout.write(splitCard + " ");
    	for(var j=1;j<=cards[0];j++) 
    	{
    	    stdout.write(cards[j] + " ");
    	}
    	
    	var isSoft = { is: null };
    	var total=_this.getTotal(isSoft);
    	
    	stdout.write(" ");
    	
    	if(isSoft.is)
    	{
    		stdout.write("soft ");
    	}
    	else
    	{
    		stdout.write("hard ");
    	}
    	
    	stdout.write(total);
    	stdout.write(", cards=" + cards[0]);
    	stdout.write(", repeats=" + repeat);
    	stdout.write(", splits=" + splits);
    	stdout.write(", bet=" + bet);
    	stdout.write(", split_bet=" + splitBet);
    	stdout.write(")" + '\n');
    };

    // remove all cards and get its weight, return false if any now missing
    _this.removeAndGetWeight = function(deck, dealer, wt) {
        var cardwt = {
            weight: 0
        },
            totalwt = 1;

        // get weights for each card
        for (var i = 1; i <= cards[0]; i++) {
            if (!deck.removeAndGetWeight(cards[i], cardwt, dealer)) { // weight is zero, restore removed cards
                for (var j = 1; j < i; j++) {
                    deck.restore(cards[j]);
                }

                return false;
            }
            totalwt *= cardwt;
        }

        // acceptable hand
        wt.weight = totalwt * repeat;
        
        return true;
    };

    // remove and get weight for non-split portion of this hand
    // Code duplicates much of removeAndGetWeight() to save one floating point calculation
    _this.removeAndGetNonsplitWeight = function(deck, dealer, wt) {
        if (splits === repeat) {
            return false; // all hands are splits
        }

        // get weights for each card
        var cardwt,
            totalwt = 1;

        for (var i = 1; i <= cards[0]; i++) {
            if (!deck.removeAndGetWeight(cards[i], cardwt, dealer)) {
                // weight is zero, restore removed cards
                for (var j = 1; j < i; j++) {
                    deck.restore(cards[j]);
                }

                return false;
            }
            totalwt *= cardwt;
        }

        // acceptable hand
        wt.weight = totalwt * (repeat - splits);
        return true;
    };

    // hit this hand with the actual hand
    _this.fillHand = function(hand) {
        for (var i = 1; i <= cards[0]; i++) {
            hand.hit(cards[i]);
            hand.setDoubled(bet / repeat); // bet per hand
        }
    };

    // hit this hand with actual hand and get bet size from non-split fraction
    // Warning: never call if repeat==splits
    _this.fillNonsplitHand = function(hand) {
        for (var i = 1; i <= cards[0]; i++) {
            hand.hit(cards[i]);
        }
        hand.setDoubled((bet - splitBet) / (repeat - splits)); // nonsplit bet per hand
    };

    // remove cards in this hand and restore to deck (leave initial card intact)
    _this.removeHand = function(hand, deck) {
        for (var i = 1; i <= cards[0]; i++) {
            hand.unhit(cards[i], deck);
        }
    };

    //#endregion

    //#region PlayHand: Accessors

    _this.getNumberOfCards = function() {
        return cards[0];
    };

    _this.isSplitable = function() {
        return splits > 0;
    };

    _this.getTotal = function(isSoft) {
        var total = splitCard;
        var aces = total === 1 ? 1 : 0;
        for (var i = 1; i <= cards[0]; i++) {
            total += cards[i];
            if (cards[1] === 1) {
                aces++;
            }
        }

        if (total < 12 && aces > 0) {
            total += 10;
            isSoft.is = true;
        }
        else {
            isSoft.is = false;
        }

        return total;
    };

    //#endregion
}

module.exports = PlayHand;