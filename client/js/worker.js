self.onmessage = function(ev) {
    var iterations = ev.data;

    var result = {
        wins: {
            count: 0
        },
        loses: {
            count: 0
        }
    };

    for (var i = 0; i < iterations; i++) {
        var game = playGame();

        if (game.winner === 'player') {
            result.wins.count++;
        }
        else if (game.winner === 'dealer') {
            result.loses.count++;
        }
    }

    self.postMessage(result);
};

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

    while (true) {
        var result = nextStep(dealerCards[0], playersCards, deck);

        if (result.play > result.stay) {
            playersCards.push(getRandomBlackJackCard(deck));

            if (getSumm(playersCards) > 21) {
                gameResulObj.winner = "dealer";

                gameResulObj.moreThanNeed = true;
                break;
            }
            // else {
            //     continue;
            // }
        }
        else {
            break;
        }
    }

    while (getSumm(dealerCards) < 17) {
        dealerCards.push(getRandomBlackJackCard(deck));
    }

    var dealerSumm = getSumm(dealerCards);
    var isDealerBlackJack = dealerSumm === 21 && dealerCards.length === 2;

    var playerSumm = getSumm(playersCards);
    var isPlayerBlackJack = playerSumm === 21 && playersCards.length === 2;

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
            if (isDealerBlackJack && !isPlayerBlackJack) {
                gameResulObj.winner = "dealer";
            }
            else if (isPlayerBlackJack && !isDealerBlackJack) {
                gameResulObj.winner = "player";
            }
            else {
                gameResulObj.winner = "none";
            }
        }
    }
    else {
        gameResulObj.winner = "player";
    }

    return gameResulObj;
}

function nextStep(dealerCard, playerCards, deck) {
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

    var clonedDeckAndPlayerCards = clone({
        clonedDeck: deck,
        playerCards: playerCards,
        clonedHand: AIhand
    });

    result.stay += create(clonedDeckAndPlayerCards).playerScore;

    for (var i = 21 - playerSumm; i >= 1; i--) {
        clonedDeckAndPlayerCards = clone({
            clonedDeck: deck,
            playerCards: playerCards,
            clonedHand: AIhand
        });

        var cardByValue = (i === 1) ? 'A' : i;

        clonedDeckAndPlayerCards.playerCards.push(cardByValue);

        var count1 = clonedDeckAndPlayerCards.clonedDeck[cardByValue];
        count += count1;

        var verCard = count1 / clonedDeckAndPlayerCards.clonedDeck.count;

        getCards([cardByValue], clonedDeckAndPlayerCards.clonedDeck);

        result.play += create(clonedDeckAndPlayerCards).playerScore * verCard;
    }

    var bustExp = count / deck.count - 1;

    result.play += bustExp;

    result.playStayDifference = result.play - result.stay;
    result.playBetterThanStayInPercent = (Math.abs(result.stay) / Math.abs(result.play) - 1) * 100;

    return result;
}

function create(objDeck, playerCards) {
    var objDck = objDeck;
    var playerSumm = getSumm(objDeck.playerCards);
    var currentSumm = null;
    var prevSumm = null;
    var object = null;
    var card = null;

    var verobj = {
        '-1': 0,
        17: 0,
        18: 0,
        19: 0,
        20: 0,
        21: 0
    };

    var nextCard = null;

    recursiveCalculation();

    var playerScore = 0;
    for (var val in verobj) {
        if (verobj.hasOwnProperty(val)) {
            if (parseInt(val, 10) < playerSumm || val === '-1') {
                playerScore += verobj[val].ver;
            }
            else if (parseInt(val, 10) > playerSumm) {
                playerScore -= verobj[val].ver;
            }
        }
    }

    //verobj['startHand'] = objAndDeck.clonedHand.result.join(' ');
    verobj.playerScore = playerScore;

    return verobj;

    function recursiveCalculation() {
        var objDeck = clone(objDck);

        var clonedHand = objDeck.clonedHand;
        var clonedDeck = objDeck.clonedDeck;

        prevSumm = getSumm(clonedHand.result);

        if (nextCard) {
            clonedHand.result.push(nextCard);
            clonedHand.ver = clonedHand.ver * (clonedDeck[nextCard] / clonedDeck.count);

            --clonedDeck[nextCard];
            --clonedDeck.count;
        }

        currentSumm = getSumm(clonedHand.result);

        if (prevSumm < 17) {
            if (currentSumm <= 21) {

                if (currentSumm > 16 && currentSumm < 22) {
                    object = verobj[currentSumm];

                    if (!object) {
                        object = {
                            ver: 0,
                            comb: 0,
                            chain: []
                        };
                    }

                    object.ver = object.ver + clonedHand.ver;
                    object.comb += 1;
                    object.chain.push(clonedHand.result);

                    verobj[currentSumm] = object;

                    // verobj[currentSumm] += clonedHand.ver;
                }

                for (var i = 0; i <= cardsValues.length; i++) {

                    card = cardsValues[i];

                    if (clonedDeck[card] > 0) {
                        nextCard = card;
                        objDck = clone(objDeck);
                        recursiveCalculation();
                    }
                }
            }
            else {
                object = verobj[-1];

                if (!object) {
                    object = {
                        ver: 0,
                        comb: 0,
                        chain: []
                    };
                }

                object.ver = object.ver + clonedHand.ver;
                object.comb += 1;
                object.chain.push(clonedHand.result);

                verobj[-1] = object;

                //verobj[-1] += clonedHand.ver;
            }
        }
    }
}


function getSumm(arr) {
    var aces = [];
    var value = 0;

    for (var i = arr.length - 1; i >= 0; i--) {
        var cardValue = arr[i];

        if (cardValue === 'A') {
            aces.push(cardValue);
        }
        else {
            value += cardValue;
        }
    }

    for (var j = aces.length - 1; j >= 0; j--) {

        value += (value + 11 > 21) ? 1 : 11;
    }

    return value;
}

function getCards(cards, deck) {
    for (var i = 0; i < cards.length; i++) {
        deck[cards[i]] --;
        deck.count--;
    }
}

function getRandomCardValue(cards) {
    return randomFromValues(cards);
}

function randomIntFromInterval(min, max) {
    return ~~(Math.random() * (max - min + 1) + min);
}

function randomFromValues() {
    if (arguments.length > 1) {
        var number = randomIntFromInterval(0, arguments.length - 1);

        return arguments[number];
    }
    else if (arguments.length == 1) {
        var arrayOrObject = arguments[0];
        if (Array.isArray(arrayOrObject)) {
            return arrayOrObject[randomIntFromInterval(0, arrayOrObject.length - 1)];
        }
        else {
            var names = Object.keys(arrayOrObject);

            return arrayOrObject[randomIntFromInterval(0, names.length - 1)];
        }
    }
}

function getRandomBlackJackCard(deck) {
    var card = getRandomCardValue(cardsValues);

    getCards(card, deck);

    return card;
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}