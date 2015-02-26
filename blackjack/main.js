"use strict";

var stdout = process.stdout,
    stderr = process.stderr,
    common = require('./common.js'),
    enums = common.enums,
    constants = common.constants,
    Dealer = require('./dealer.js'),
    Deck = require('./deck.js'),
    Hand = require('./hand.js'),
    fs = require('fs'),
    rules = require('./blackjackRules.json'),
    options = require('./blackjackOptions.json');

// global defaults
var hitsSoft17 = false,
    ddFlag = enums.DD.any,
    ddAfterSplit = true,
    resplitting = false,
    outfile = null,
    ndecks = 1,
    upstart = constants.ACE,
    upend = constants.TEN,
    cacheCards = 0,
    verbose = false,
    standCalcs = false,
    hitCalcs = false,
    doubleCalcs = false,
    comboCalcs = false,
    approxSplitCalcs = false,
    exactSplitCalcs = false,
    exactRecursiveSplitCalcs = false,
    residCalcs = enums.griffin.noGriffin,
    maxSplitHands = 2,
    maxRecursiveSplitHands = 2;

(function main() {
    var numopt, num,
        handParm;

    //options
    // output file name
    if (options.filename) {
        outfile = options.filename;
    }

    if (options.verbose === 'true') {
        verbose = true;
    }

    if (options.dealerCache) {

        cacheCards = parseInt(options.dealerCache, 10);

        if (cacheCards < 0 || cacheCards > constants.MAX_CACHE_SIZE) {
            stderr.write("Dealer cache size is out of range (0-" + constants.MAX_CACHE_SIZE + ")\n");
            return enums.error.BadOptionErr;
        }
    }

    if (options.initialDealerCard) {
        numopt = options.initialDealerCard;
        num = (numopt === 'T' || numopt === 't') ? constants.TEN : (parseInt(numopt, 10));
        if (num < constants.ACE || num > constants.TEN) {
            stderr.write("Invalid dealer up card (1-9 or T) or number of decks (1-8) setting\n");
            return enums.error.BadOptionErr;
        }

        upstart = num;
    }

    if (options.finalDealerCard) {
        numopt = options.finalDealerCard;
        num = (numopt === 'T' || numopt === 't') ? constants.TEN : (parseInt(numopt, 10));
        if (num < constants.ACE || num > constants.TEN) {
            stderr.write("Invalid dealer up card (1-9 or T) or number of decks (1-8) setting\n");
            return enums.error.BadOptionErr;
        }

        upend = num;
    }

    if (options.decksNumber) {
        numopt = parseInt(options.decksNumber, 10);
        num = (numopt === 'T' || numopt === 't') ? constants.TEN : (parseInt(numopt, 10));
        if (num < constants.ACE || num > constants.TEN || num > 8) {
            stderr.write("Invalid dealer up card (1-9 or T) or number of decks (1-8) setting\n");
            return enums.error.BadOptionErr;
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

    //Action
    var actions = process.env['action'],
        param = process.env['param'];

    for (var i = 0; i < actions.length; i++) {
        switch (actions[i]) {
            case '?':
                usage();
                return enums.error.noErr;
                break;
            case 'S':
                standCalcs = true;
                break;
            case 'H':
                hitCalcs = true;
                break;
            case 'D':
                doubleCalcs = true;
                break;
            case 'A':
                approxSplitCalcs = true;
                break;
            case 'C':
                comboCalcs = true;
                break;
            case 'G':
                residCalcs = enums.griffin.fullDeckGriffin;
                break;
            case 'g':
                residCalcs = enums.griffin.upcardRemovedGriffin;
                break;
            case 'E':
                exactSplitCalcs = true;

                handParm = parseInt(param, 10);
                if (handParm < 2 || handParm > 9) {
                    stderr.write("Maximum number of exact split hands must be 2 to 9\n");
                    return enums.error.BadOptionErr;
                }

                maxSplitHands = handParm;
                break;
            case 'R':
                exactRecursiveSplitCalcs = true;

                handParm = parseInt(param, 10);
                if (handParm < 2 || handParm > 9) {
                    stderr.write("Maximum number of exact split hands must be 2 to 9\n");
                    return enums.error.BadOptionErr;
                }

                maxRecursiveSplitHands = handParm;
                break;
            default:
                stderr.write("Unknown Blackjack option '" + actions[i] + "' was used\n");
                return enums.error.BadOptionErr;
        }
    }

    // need something
    if (!standCalcs && !hitCalcs && !doubleCalcs && !approxSplitCalcs && !exactSplitCalcs &&
        !exactRecursiveSplitCalcs && !comboCalcs && residCalcs === enums.griffin.noGriffin) {

        stderr.write("No calculation options were selected\n");

        return enums.error.BadOptionErr;
    }

    // output file
    var os = fs.createWriteStream(outfile);
    if (outfile != null) {
        os.on('error', function(err) {
            stderr.write("Output file '" + outfile + "' could not be created\n");
            stderr.write(err);
            return enums.error.FileAccessErr;
        });
    }
    else {
        verbose = false;
    }

    // get the stream
    os = (outfile != null) ? os : stdout;

    // create the dealer
    var theDealer = new Dealer(hitsSoft17, cacheCards);
    stdout.write("Dealer cache size = " + theDealer.getCacheSize() + " in " + '??' /*theDealer.getCacheBytes()*/ + " bytes\n");

    // get the table
    var startTicks = Date.now();
    produceTable(os, theDealer);
    var clockTime = (Date.now() - startTicks) / 1000;
    stdout.write("Calculation time " + clockTime + " secs\n");

    return enums.error.noErr;
})();

// table of standing, hitting, and doubling down expected values
function produceTable(os, dealer) {
    var c1,
        c2,
        upcard,
        hand = new Hand(),
        results = null,
        mean = null,
        exval = null;

    // intialize
    var theDeck = new Deck(ndecks);

    var step = (upstart <= upend) ? 1 : -1;
    for (upcard = upstart; upcard != upend + step; upcard += step) {
        dealer.setUpcard(upcard, theDeck);

        if (verbose) {
            stdout.write("Dealer Up Card " + upcard + '\n');
        }

        os.write("\nDealer Up Card " + upcard + '\n');
        os.write("Number of Decks: " + ndecks + '\n');

        if (dealer.getHitsSoft17()) {
            os.write("Dealer hits soft 17\n");
        }
        else {
            os.write("Dealer stands soft 17\n");
        }

        if (upcard === constants.ACE || upcard === constants.TEN) {
            os.write("Results conditioned on dealer not having blackjack\n");
        }

        // expected values for standing
        if (standCalcs) {
            if (verbose) {
                stdout.write("... standing\n");
            }
            os.write("\nSTANDING\n");
            os.write("hand\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10\n");
            for (c1 = 1; c1 <= 10; c1++) {
                os.write(c1);

                for (c2 = 1; c2 <= c1; c2++) { // standing expected values
                    hand.reset(c1, c2, theDeck);
                    if (hand.isNatural()) {
                        os.write("\t1.5");
                    }
                    else {
                        os.write("\t" + hand.standExval(theDeck, dealer));
                    }

                    theDeck.restore(c1, c2);
                }
                os.write('\n');
            }
        }

        // expected value for hitting and then following basic strategy
        if (hitCalcs) {
            if (verbose) {
                stdout.write("... hitting\n");
            }
            os.write("\nHITTING\n");
            os.write("hand\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10\n");

            for (c1 = 1; c1 <= 10; c1++) {
                os.write(c1);
                for (c2 = 1; c2 <= c1; c2++) { // hitting expected values
                    hand.reset(c1, c2, theDeck);
                    os.write("\t" + hand.hitExval(theDeck, dealer));
                    theDeck.restore(c1, c2);
                }
                os.write('\n');
            }
        }

        // expected value for hitting and then following basic strategy
        if (doubleCalcs) {
            if (verbose) {
                stdout.write("... doubling down\n");
            }
            os.write("\nDOUBLING DOWN\n");
            os.write("hand\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10\n");
            for (c1 = constants.ACE; c1 <= constants.TEN; c1++) {
                os.write(c1);
                for (c2 = 1; c2 <= c1; c2++) { // standing expected values
                    hand.reset(c1, c2, theDeck);
                    os.write("\t" + hand.doubleExval(theDeck, dealer));
                    theDeck.restore(c1, c2);
                }
                os.write('\n');
            }
        }

        /* Combo calcs - max expected value among stand, hit, DD, split according to rules setting
			Use (l)as vegas or (r)eno to set DD any two or just 10 & 11
			Default is DD after split (on hands allowed in previous setting), Use (n)o for no DD after split
			Default is no replitting, use (m)ultiple hands for replitting to 4 hands allowed
			Set cache size
		*/
        if (comboCalcs) {
            if (verbose) {
                stdout.write("... maximum of hit, stand, double\n");
            }
            os.write("\nOPTIMAL STRATEGY: (H)it, (S)tand, (D)ouble, or S(P)lit (DD ");
            if (ddFlag === enums.DD.any) {
                os.write("any two cards, ");
            }
            else {
                os.write("10&11 only, ");
            }

            if (ddAfterSplit) {
                os.write("DD after split, ");
                dealer.setDDAfterSplit(ddFlag);
            }
            else {
                os.write("no DD after split, ");
                dealer.setDDAfterSplit(enums.DD.none);
            }
            if (resplitting) {
                os.write("resplitting allowed");
            }
            else {
                os.write("no resplitting");
            }

            os.write(")\n");
            os.write("hand\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10\n");
            for (c1 = 1; c1 <= 10; c1++) {
                os.write(c1);
                for (c2 = 1; c2 <= c1; c2++) {
                    var standVal = 1.5,
                        hitVal,
                        ddVal,
                        splitVal;

                    hand.reset(c1, c2, theDeck);
                    if (!hand.isNatural()) {
                        standVal = hand.standExval(theDeck, dealer);
                    }
                    hitVal = hand.hitExval(theDeck, dealer);
                    if (ddFlag === enums.DD.l0OR11 && (hand.isSoft() || (hand.getTotal() != 10 && hand.getTotal() != 11))) {
                        ddVal = -5;
                    }
                    else {
                        ddVal = hand.doubleExval(theDeck, dealer);
                    }

                    if (c1 === c2) {
                        hand.unhit(c1);
                        splitVal = hand.approxSplitPlay(theDeck, dealer, resplitting && c1 != 1);
                        hand.hit(c1);
                    }
                    else {
                        splitVal = -5;
                    }

                    // get the maximum
                    var strategy = 'S';
                    if (hitVal > standVal) {
                        standVal = hitVal;
                        strategy = 'H';
                    }

                    if (ddVal > standVal) {
                        standVal = ddVal;
                        strategy = 'D';
                    }

                    if (splitVal > standVal) {
                        standVal = splitVal;
                        strategy = 'P';
                    }
                    os.write("\t" + standVal + " " + strategy);

                    theDeck.restore(c1, c2);
                }
                os.write('\n');
            }
        }

        // approximate splitting
        if (approxSplitCalcs) {
            if (verbose) {
                stdout.write("... approximate splitting\n");
            }
            os.write("\nAPPROXIMATE SPLITTING\n");
            os.write("RS\tNo\tNo\tNo\tYes\tYes\tYes\n");
            os.write("DD\tNo\tAny\t10&11\tNo\tAny\t10&11\n");
            for (c1 = constants.ACE; c1 <= constants.TEN; c1++) {
                os.write(c1 + "," + c1);

                // hand with one card, but remove second one too
                hand.reset(c1, theDeck);
                theDeck.remove(c1);

                // calculations ResplitNONE+ResplitALLOWED,DDNone+DDAny+DD10OR11
                results = new Array(6);
                hand.splitCalcs(theDeck, dealer, enums.resplit.none + enums.resplit.allowed, enums.DD.none + enums.DD.any + enums.DD.l0OR11, results);
                for (var i1 = 0; i1 < 6; i1++) {
                    os.write("\t" + results[i1]);
                }

                theDeck.restore(c1, c1);

                os.write('\n');
            }
        }

        // exact splitting
        if (exactRecursiveSplitCalcs) {
            if (verbose) {
                stdout.write("... exact splitting\n");
            }
            os.write("\nEXACT SPLITTING (Recursive Method)\n");
            os.write("MH\t" + maxRecursiveSplitHands + "\t" + maxRecursiveSplitHands + "\t" + maxRecursiveSplitHands + '\n');
            os.write("DD\tNo\tAny\t10&11\n");
            for (c1 = constants.ACE; c1 <= constants.TEN; c1++) {
                os.write(c1 + "," + c1);

                hand.reset(c1, c1, theDeck);

                // calculations
                results = new Array(3);
                hand.exactSplitCalcs(theDeck, dealer, maxRecursiveSplitHands, enums.DD.none + enums.DD.any + enums.DD.l0OR11, results);
                for (var i2 = 0; i2 < 3; i2++) {
                    os.write("\t" + results[i2]);
                }

                theDeck.restore(c1, c1);

                os.write('\n');
            }
        }

        // new exact splitting
        if (exactSplitCalcs) {
            if (verbose) {
                stdout.write("... exact splitting\n");
            }
            os.write("\nEXACT SPLITTING (Unique Hands Method)\n");
            os.write("MH\t" + maxSplitHands + "\t" + maxSplitHands + "\t" + maxSplitHands + '\n');
            os.write("DD\tNo\tAny\t10&11\n");

            if (!theDeck.initHandHashTable(dealer)) {
                os.write("Out of memory creating hand hash table for exact splitting calculations\n");
                return;
            }

            for (c1 = constants.ACE; c1 <= constants.TEN; c1++) {
                os.write(c1 + "," + c1);

                hand.reset(c1, c1, theDeck);

                // calculations
                results = new Array(3);
                hand.handExactSplitCalcs(theDeck, dealer, maxSplitHands, enums.DD.none + enums.DD.any + enums.DD.l0OR11, results);
                for (var i3 = 0; i3 < 3; i3++) {
                    os.write("\t" + results[i3]);
                }

                theDeck.restore(c1, c1);

                os.write('\n');
            }
        }

        /* residuals for counting
			Does Griffin tables, where dealer up card and player cards are NOT removed. Also hard hitting
			compares taking one card to standing.
			The hard hitting results are identical. Griffin states doubling and splitting are approximate, based
			on adjusted infinite deck results. Here doubling is exact.
			Griffin not clear on soft hitting. Here exact and compares playing to completion to standing
			Splitting is not clear. because cards need to be removed to correctly find P(2), P(3), and P(4).
			Here removed player cards (but not dealer up card) and used approximate splitting method. Results
			differ from Griffin, but may either be do to removal strategy or to approxiamte splitting methods
			Uses Combo table settings to control splitting section rules
			
			Expected Value = mean + (52*d-r-1)/(52*d-r-R) Sum(i=1,R) E(c_i)/d
				r = # cards removed in table calcs = 0 for G and 1 for g or 2 for G and 3 for g when splitting
				R = # cards removed in addition to the base cards
				d = # of decks
				E(c_i) is effect on mean on removing card c_i in the table normalized to 1 deck
		*/
        if (residCalcs !== enums.griffin.noGriffin) {
            var hit = null,
                alt = null;

            if (verbose) {
                stdout.write("... card removal effects\n");
            }

            var minExval = -.25;
            if (residCalcs === enums.griffin.fullDeckGriffin) {
                stdout.write("Split pair (for splitting only) removed\n");
            }
            else {
                stdout.write("Dealer up card and split pair (for splitting only) removed\n");
            }
            os.write("\nhand\tmean\tA\t2\t3\t4\t5\t6\t7\t8\t9\tT\n");

            // restore upcard to reproduce Giffin tables
            if (residCalcs === enums.griffin.fullDeckGriffin) {
                dealer.makeUnremovable(theDeck);
            }

            os.write("HITTING HARD HANDS\n");
            for (c1 = 17; c1 >= 12; c1--) { // mean
                hand.reset(10, c1 - 10); // fill hand, but do not remove from theDeck
                mean = 0.5 * hand.doubleExval(theDeck, dealer) - hand.standExval(theDeck, dealer);
                os.write(c1 + "\t" + 100 * mean);

                for (c2 = constants.ACE; c2 <= constants.TEN; c2++) { // remove one card
                    theDeck.remove(c2);
                    exval = 0.5 * hand.doubleExval(theDeck, dealer) - hand.standExval(theDeck, dealer);
                    os.write("\t" + 100 * (exval - mean) * ndecks);
                    theDeck.restore(c2);
                }

                os.write('\n');
            }

            os.write("HITTING SOFT HANDS\n");
            for (c1 = 19; c1 >= 17; c1--) { // mean
                hand.reset(1, c1 - 11);
                mean = hand.hitExval(theDeck, dealer) - hand.standExval(theDeck, dealer);
                if (mean < minExval) continue;
                os.write(c1 + "\t" + 100 * mean);

                for (c2 = constants.ACE; c2 <= constants.TEN; c2++) { // remove one card
                    theDeck.remove(c2);
                    exval = hand.hitExval(theDeck, dealer) - hand.standExval(theDeck, dealer);
                    os.write("\t" + 100 * (exval - mean) * ndecks);
                    theDeck.restore(c2);
                }

                os.write('\n');
            }

            os.write("HARD DOUBLING DOWN\n");
            for (c1 = 11; c1 >= 7; c1--) { // mean
                hand.reset(5, c1 - 5);
                mean = hand.doubleExval(theDeck, dealer) - hand.hitExval(theDeck, dealer);
                if (mean < minExval) {
                    continue;
                }

                os.write(c1 + "\t" + 100 * mean);

                for (c2 = constants.ACE; c2 <= constants.TEN; c2++) { // remove one card
                    theDeck.remove(c2);
                    exval = hand.doubleExval(theDeck, dealer) - hand.hitExval(theDeck, dealer);
                    os.write("\t" + 100 * (exval - mean) * ndecks);
                    theDeck.restore(c2);
                }

                os.write('\n');
            }

            os.write("SOFT DOUBLING DOWN\n");
            for (c1 = 20; c1 >= 13; c1--) { // mean
                hand.reset(1, c1 - 11);
                hit = hand.twoCardHit(theDeck, dealer);
                alt = hit ? hand.hitExval(theDeck, dealer) : hand.standExval(theDeck, dealer);
                mean = hand.doubleExval(theDeck, dealer) - alt;

                if (mean < minExval) {
                    continue;
                }

                var temp1 = c1 - 11;
                os.write("A," + temp1 + "\t" + 100 * mean);

                for (c2 = constants.ACE; c2 <= constants.TEN; c2++) { // remove one card
                    theDeck.remove(c2);
                    alt = hit ? hand.hitExval(theDeck, dealer) : hand.standExval(theDeck, dealer);
                    exval = hand.doubleExval(theDeck, dealer) - alt;
                    os.write("\t" + 100 * (exval - mean) * ndecks);
                    theDeck.restore(c2);
                }

                os.write('\n');
            }

            os.write("SPLITTING (");
            if (ddAfterSplit) {
                os.write("DD after split ");
                dealer.setDDAfterSplit(ddFlag);
                if (ddFlag === enums.DD.any) {
                    os.write("any two cards, ");
                }
                else {
                    os.write("10and 11 only, ");
                }
            }
            else {
                os.write("no DD after split, ");
                dealer.setDDAfterSplit(enums.DD.none);
            }

            if (resplitting) {
                os.write("resplitting allowed, except aces)\n");
            }
            else {
                os.write("no resplitting)\n");
            }

            for (c1 = constants.TEN; c1 >= constants.ACE; c1--) {
                var handResplit = (c1 === constants.ACE) ? false : resplitting;

                // mean
                hand.reset(c1, c1, theDeck); // remove from deck too
                hit = hand.twoCardHit(theDeck, dealer);
                alt = hit ? hand.hitExval(theDeck, dealer) : hand.standExval(theDeck, dealer);
                hand.unhit(c1);

                mean = hand.approxSplitPlay(theDeck, dealer, handResplit) - alt;
                if (-Math.abs(mean) < minExval) {
                    continue;
                }

                os.write(c1 + "," + c1 + "\t" + 100 * mean);

                for (c2 = constants.ACE; c2 <= constants.TEN; c2++) { // remove one card
                    theDeck.remove(c2);
                    hand.hit(c1);
                    alt = hit ? hand.hitExval(theDeck, dealer) : hand.standExval(theDeck, dealer);
                    hand.unhit(c1);
                    exval = hand.approxSplitPlay(theDeck, dealer, handResplit) - alt;
                    os.write("\t" + 100 * (exval - mean) * ndecks);
                    theDeck.restore(c2);
                }

                os.write('\n');
                theDeck.restore(c1, c1);
            }

            // remove to balance subsequent restore
            if (residCalcs === enums.griffin.fullDeckGriffin)
                theDeck.remove(upcard);
        }

        // return upcard to the deck
        theDeck.restore(upcard);
    }
}

// print help and user message
function usage() {
    stdout.write("\nBlackjack (version 1.0)\n");

    stdout.write("\nUsage:\n" + "   Blackjack [-options]\n\n" + "This program calculates expected values for the game of blackjack.\n" + "The table of results can include various expected values and can be\n" + "written to standard output or diverted to a file.\n\n" + "Calculation Options (can be grouped and '-' is optional):\n" + "    -S                 Expected values for standing all hands\n" + "    -H                 Expected values for hitting all hands and following\n" + "                          basic strategy to completion\n" + "    -D                 Expected values for doubling down all hands\n" + "    -C                 Combo table show maximum of S, H, and D tables\n" + "    -A                 Approximate pair splitting expected values\n" + "    -E2                Exact pair splitting expected values to given number of hands\n" + "                          (immediately after, 2-9)\n" + "    -R2                Exact pair splitting expected values to given number of hands\n" + "                          (immediately after, 2-9, uses recursive algorithm)\n" + "    -G                 Griffin effect of card removal using a full decks\n" + "    -g                 Griffin effect of card removal with dealer upcard removed\n" + "\nSetting Options (can be grouped and '-' is optional):\n" + "    -o fname           Write table to tab-delimited text file\n" + "    -d2                Number of decks (immediately after, 1-8)\n" + "    -h                 Dealer hits soft 17\n" + "    -s                 Dealer stands soft 17\n" + "    -i4                Initial dealer up card (immediately after, 1-9 or T)\n" + "    -fT                Final dealer up card (immediately after, 1-9 or T)\n" + "    -c num             Dealer cache size (0 to 23)\n" + "    -l                 Double down any two cards (Las Vegas rules, Combo/Griffin tables only)\n" + "    -r                 Double down 10 & 11 only (Reno rules, Combo/Griffin tables only)\n" + "    -n                 No double down after splitting (Combo/Griffin tables only)\n" + "    -m                 Replitting allowed (Combo/Griffin tables only)\n" + "    -v                 Verbose to list progress to std out\n" + "                          (only applies when -o is active)\n" + "    -?                 Print this help information\n" + "\nDefaults:\n" + "   No expected values, std out, 1 deck, stand soft 17, dealer up card range\n" + "       1 to 10, dealer cache size 0, and not verbose\n" + "\nExample: complete tables using approximate splitting methods\n" + "   Blackjack SHDAo bjtable.txt\n");
}