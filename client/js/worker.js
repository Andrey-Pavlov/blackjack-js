//self - WebWorker
self.onmessage = function(e) {
        var objDck = e.data.objDeck;
        var cardsValues = e.data.cardValues;
        var currentSumm = null;
        var prevSumm = null;
        var playerSumm = getSumm(e.data.playerCards);
        var clonedHand = objDck.clonedHand;
        var clonedDeck = objDck.clonedDeck;
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

            return self.postMessage(verobj);
        
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
};

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
    
        function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }