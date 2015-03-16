var mongoose = require('../mongoose.js');

var cardsSchema = mongoose.Schema({
    dealerCard: 'Number',
    decksNumber: 'Number',
    dealerStandOn17: 'Bool',
    ddAnyNot10Or11: 'Bool',
    ddAfterSplitRestricted: 'Bool',
    resplitAllowed: 'Bool',
    probsAndActions: [{card1: 'Number', card2: 'Number', action: String}]
});
cardsSchema.index({
    dealerCard: 1,
    decksNumber: 1,
    dealerStandOn17: 1,
    ddAnyNot10Or11: 1,
    ddAfterSplitRestricted: 1,
    resplitAllowed: 1
}, { dropDups: true});

module.exports = mongoose.model('BjAction', cardsSchema);