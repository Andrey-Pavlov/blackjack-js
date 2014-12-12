//self - WebWorker
self.addEventListener('message', function(e) {
        var currentSumm = null;
        var prevSumm = null;
        var objDeck = e.data.objDeck;
        var cloned = objDeck.clonedHand;
        var clonedDeck = objDeck.clonedDeck;
        var object = null;
        var i = null;
        var nextCard = e.data.nextCard;
        var card = null;
        var cardsValues = e.data.cardValues;
    
    var verobj = {};
    
    //recursiveCalculation();
    
  self.postMessage({
          playerScore: 1
  });
  
//   function recursiveCalculation() {

//     prevSumm = getSumm(cloned.result);

//         cloned.result.push(nextCard);
//         cloned.ver = cloned.ver * (clonedDeck[nextCard] / clonedDeck.count);

//         --clonedDeck[nextCard];
//         --clonedDeck.count;

//     currentSumm = getSumm(cloned.result);

//     if (prevSumm < 17) {
//         if (currentSumm <= 21) {

//             if (currentSumm > 16 && currentSumm < 22) {
//                 object = verobj[currentSumm];

//                 if (!object) {
//                     object = {
//                         ver: 0,
//                         comb: 0,
//                         chain: []
//                     };
//                 }

//                 object.ver = object.ver + cloned.ver;
//                 object.comb += 1;
//                 object.chain.push(cloned.result);

//                 verobj[currentSumm] = object;
//             }

//             for (i = 0; i <= cardsValues.length; i++) {

//                 card = cardsValues[i];

//                 if (clonedDeck[card] > 0) {
//                     objDeck = clone(objDeck);
//                     nextCard = card;

//                     recursiveCalculation();
//                 }
//             }
//         }
//         else {
//             object = verobj[-1];

//             if (!object) {
//                 object = {
//                     ver: 0,
//                     comb: 0,
//                     chain: []
//                 };
//             }

//             object.ver = object.ver + cloned.ver;
//             //object.comb += 1;
//             //object.chain.push(cloned.result);

//             verobj[-1] = object;
//         }
//     };
// }
}, false);