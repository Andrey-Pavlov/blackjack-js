(function() {
    var blackjack = app.namespace('blackjack'),
        config = app.common.configValues,
        blackjackConfig = config.blackjack;

    var workers = []

    for (var i = 0; i < 10; i++) {
        workers.push(new Worker('js/worker.js'));
    }


    var n = 1; //decks count

    var cardsValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'A']; //cards in deck

    var deck1 = {
        count: 52 * n
    };
    for (var i = 0; i < cardsValues.length; i++) {
        if (cardsValues[i] !== 10) {
            deck1[cardsValues[i]] = 4 * n;
        }
        else {
            deck1[cardsValues[i]] = 16 * n;
        }
    }

    blackjack.init = function(iterations) {
        if (!iterations) {
            iterations = 1;
        }

        var globalResult = {
            games: 0,
            wins: {
                gamesLog: [],
                count: 0
            },
            loses: {
                gamesLog: [],
                count: 0
            }
        };

        globalResult.games = iterations;


        var x = new Promise(function(resolve, reject) {
            var i = 0;
            var games = [];

            (function startGame() {
                i++;

                playGame().then(function(val) {
                    if (val.winner === 'player') {
                        globalResult.wins.count++;
                        globalResult.wins.gamesLog.push(val);
                    }
                    else if (val.winner === 'dealer') {
                        globalResult.loses.count++;
                        globalResult.loses.gamesLog.push(val);
                    }
                }).then(function() {
                    if (i < iterations) {
                        startGame();
                    }
                    else {
                        resolve();
                    }
                });
            }());

        }).then(function() {
            console.log(globalResult.wins.count);
            console.log(globalResult.games - globalResult.wins.count - globalResult.loses.count);
            console.log('//');
            console.log(globalResult.loses.count);

            // workers.forEach(function(element) {
            //     element.terminate();
            //     element = undefined;
            // })
        })
    }

    function playGame() {
        var deck = clone(deck1);

        deck[9] --;
        deck[10] --;
        deck[6] --;
        deck.count--;
        deck.count--;
        deck.count--;

        var dealerCards = [9 /*getRandomBlackJackCard(deck)*/ ],
            playersCards = [10, 6 /*getRandomBlackJackCard(deck), getRandomBlackJackCard(deck)*/ ];

        var gameResulObj = {
            startDealerCard: dealerCards[0],
            startPlayersCards: playersCards
        };

        while (getSumm(playersCards) <= 11) {
            playersCards.push(getRandomBlackJackCard(deck));
        }

        gameResulObj.dealerCards = dealerCards;
        gameResulObj.playerCards = playersCards;

        var myRes = new Promise(function(resolve, reject) {
            (function f() {
                nextStep(dealerCards[0], playersCards, deck).then(function(val) {
                    if (val.play > val.stay) {
                        playersCards.push(getRandomBlackJackCard(deck));

                        if (getSumm(playersCards) > 21) {
                            gameResulObj.winner = "dealer";

                            gameResulObj.moreThanNeed = true;
                            resolve();
                        }
                        else {
                            f();
                        }
                    }
                    else {
                        resolve();
                    }
                })
            }());
        }).then(function() {
            while (getSumm(dealerCards) < 17) {
                dealerCards.push(getRandomBlackJackCard(deck));
            }

            var dealerSumm = getSumm(dealerCards);
            var playerSumm = getSumm(playersCards);

            if (dealerSumm < 22) {

                gameResulObj.dealerCardsSumm = dealerSumm;
                gameResulObj.playerSumm = playerSumm;

                if (dealerSumm > playerSumm) {
                    gameResulObj.winner = "dealer";
                }
                else if (dealerSumm < playerSumm) {
                    gameResulObj.winner = "player";
                }
                else {
                    gameResulObj.winner = "none";
                }
            }
            else {
                gameResulObj.winner = "player";

            }

            return gameResulObj;
        });

        return myRes;
    }

    function nextStep(dealerCard, playerCards, deck) {
        var promises = [];
        var count = 0;

        var result = {
            stay: 0,
            play: 0,
            playBetterThanStayInPercent: null,
            playStayDifference: null
        };

        var playerSumm = getSumm(playerCards);

        var aiCards = [dealerCard];
        var AIhand = {
            result: aiCards,
            ver: 1
        };


        promises.push(new Promise(function(resolve, reject) {
            var worker = workers[0];
            worker.onmessage = function(ev) {
                resolve(ev);
            };

            worker.postMessage({
                objDeck: {
                    clonedHand: AIhand,
                    clonedDeck: deck
                },
                playerCards: playerCards,
                cardValues: cardsValues
            });
        }).then(function(val) {
            result.stay += val.data.playerScore;
        }));

        for (var i = 21 - playerSumm; i >= 1; i--) {
            var clonedDeckAndPlayerCards = clone({
                clonedDeck: deck,
                playerCards: playerCards,
                clonedHand: AIhand
            });

            promises.push(new Promise(function(resolve, reject) {
                var cardByValue = (i === 1) ? 'A' : i;

                clonedDeckAndPlayerCards.playerCards.push(cardByValue);

                var count1 = clonedDeckAndPlayerCards.clonedDeck[cardByValue];
                count += count1;

                var verCard = count1 / clonedDeckAndPlayerCards.clonedDeck.count;

                getCards([cardByValue], clonedDeckAndPlayerCards.clonedDeck);

                var webworker = workers[i];

                webworker.onmessage = function(ev) {
                    ev.data.verCard = verCard;

                    resolve(ev);
                };

                webworker.postMessage({
                    objDeck: clonedDeckAndPlayerCards,
                    cardValues: cardsValues,
                    playerCards: clonedDeckAndPlayerCards.playerCards
                });
            }).then(function(val) {
                result.play += val.data.playerScore * val.data.verCard;
            }));
        }
        return Promise.all(promises).then(function() {
            var bustExp = count / deck.count - 1;

            result.play += bustExp;

            result.playStayDifference = result.play - result.stay;
            result.playBetterThanStayInPercent = (Math.abs(result.stay) / Math.abs(result.play) - 1) * 100;

            return result;
        });
    }

    function getCards(cards, deck) {
        for (var i = 0; i < cards.length; i++) {
            deck[cards[i]] --;
            deck.count--;
        }
    }

    //     function create(objAndDeck, playerSumm, newCard) {

    //         var objDeck = clone(objAndDeck);

    //         var currentSumm = null;
    //         var prevSumm = null;
    //         var cloned = objDeck.clonedHand;
    //         var clonedDeck = objDeck.clonedDeck;
    //         var object = null;
    //         var i = null;
    //         var card = null;

    //         var verobj = {
    //             '-1': 0,
    //             17: 0,
    //             18: 0,
    //             19: 0,
    //             20: 0,
    //             21: 0
    //         };

    //         var nextCard = newCard;

    //         prevSumm = getSumm(cloned.result);

    //         if (nextCard) {
    //             cloned.result.push(nextCard);
    //             cloned.ver = cloned.ver * (clonedDeck[nextCard] / clonedDeck.count);

    //             --clonedDeck[nextCard];
    //             --clonedDeck.count;
    //         }

    //         currentSumm = getSumm(cloned.result);

    //         if (prevSumm < 17) {
    //             if (currentSumm <= 21) {

    //                 if (currentSumm > 16 && currentSumm < 22) {
    //                     object = verobj[currentSumm];

    //                     if (!object) {
    //                         object = {
    //                             ver: 0,
    //                             comb: 0,
    //                             chain: []
    //                         };
    //                     }

    //                     object.ver = object.ver + cloned.ver;
    //                     object.comb += 1;
    //                     object.chain.push(cloned.result);

    //                     verobj[currentSumm] = object;
    //                 }

    //                 for (i = 0; i <= cardsValues.length; i++) {

    //                     card = cardsValues[i];

    //                     if (clonedDeck[card] > 0) {
    //                         objDeck = clone(objDeck);
    //                         nextCard = card;

    // recursiveCalculation();
    //                     }
    //                 }
    //             }
    //             else {
    //                 object = verobj[-1];

    //                 if (!object) {
    //                     object = {
    //                         ver: 0,
    //                         comb: 0,
    //                         chain: []
    //                     };
    //                 }

    //                 object.ver = object.ver + cloned.ver;
    //                 //object.comb += 1;
    //                 //object.chain.push(cloned.result);

    //                 verobj[-1] = object;
    //             }
    //         };

    //             var playerScore = 0;
    //             for (var val in verobj) {
    //                 if (verobj.hasOwnProperty(val)) {
    //                     if (parseInt(val, 10) < playerSumm || val === '-1') {
    //                         playerScore += verobj[val].ver;
    //                     }
    //                     else if (parseInt(val, 10) > playerSumm) {
    //                         playerScore -= verobj[val].ver;
    //                     }
    //                 }
    //             }

    //             //verobj['startHand'] = objAndDeck.clonedHand.result.join(' ');
    //             verobj.playerScore = playerScore;

    //             return verobj;

    //         function recursiveCalculation() {
    //             cloned = objDeck.clonedHand;
    //             clonedDeck = objDeck.clonedDeck;

    //             prevSumm = getSumm(cloned.result);

    //             if (nextCard) {
    //                 cloned.result.push(nextCard);
    //                 cloned.ver = cloned.ver * (clonedDeck[nextCard] / clonedDeck.count);

    //                 --clonedDeck[nextCard];
    //                 --clonedDeck.count;
    //             }

    //             currentSumm = getSumm(cloned.result);

    //             if (prevSumm < 17) {
    //                 if (currentSumm <= 21) {

    //                     if (currentSumm > 16 && currentSumm < 22) {
    //                         object = verobj[currentSumm];

    //                         if (!object) {
    //                             object = {
    //                                 ver: 0,
    //                                 comb: 0,
    //                                 chain: []
    //                             };
    //                         }

    //                         object.ver = object.ver + cloned.ver;
    //                         object.comb += 1;
    //                         object.chain.push(cloned.result);

    //                         verobj[currentSumm] = object;
    //                     }

    //                     for (i = 0; i <= cardsValues.length; i++) {

    //                         card = cardsValues[i];

    //                         if (clonedDeck[card] > 0) {
    //                             objDeck = clone(objDeck);
    //                             nextCard = card;

    //                             var obj = {
    //                                 '-1': 0,
    //                                 17: 0,
    //                                 18: 0,
    //                                 19: 0,
    //                                 20: 0,
    //                                 21: 0
    //                             };

    //                             var objWorker = workers[i](objDeck, nextCard);

    //                             for (var prop in obj) {
    //                                 obj[prop] += objWorker[prop];
    //                             }
    //                         }
    //                     }
    //                 }
    //                 else {
    //                     object = verobj[-1];

    //                     if (!object) {
    //                         object = {
    //                             ver: 0,
    //                             comb: 0,
    //                             chain: []
    //                         };
    //                     }

    //                     object.ver = object.ver + cloned.ver;
    //                     //object.comb += 1;
    //                     //object.chain.push(cloned.result);

    //                     verobj[-1] = object;
    //                 }
    //             };
    //         }
    //     }

    function getRandomBlackJackCard(deck) {
        var card = getRandomCardValue(cardsValues)

        getCards(card, deck);

        return card;
    }
}());
