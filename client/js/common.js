(function() {
    var common = app.namespace('common');

    var configValues = {

        deckCards: [
            'ACE',
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            'J',
            'Q',
            'K'
        ],

        eachCardCount: 4,

        getfullDeck: function() {
            var newArray = [],
                deck = configValues.deckCards,
                eachCardCount = configValues.eachCardCount;

            for (var i = deck.length - 1; i <= 0; i--) {
                while (eachCardCount--) {
                    newArray.push(deck[i]);
                }
            }
            return newArray;
        },
        blackjack: {
            cards: [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11
            ],
            deckNumbers: 1
        }
    };

    common.configValues = configValues;
}())

//Inheritance
Function.prototype.inherit = function(Parent) {
    var F = function() {};

    F.prototype = Parent.prototype;

    this.prototype = new F();

    this.prototype.constructor = this;

    this.superclass = Parent.prototype;
};

//Prototype
Array.prototype.shuffle = function() {
    var n = this.length;
    while (n--) {
        var i = Math.floor(n * Math.random());
        var tmp = this[i];
        this[i] = this[n];
        this[n] = tmp;
    }
    return this;
};

//#region Window

//Cards
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

function getRandomCardValue(cards) {
    return randomFromValues(cards);
};

function testRandomCardValueFunctionProbability(cards, iteration) {
    var randArray = [],
        randObj = {},
        count = iteration;


    for (var i = count - 1; i >= 0; i--) {
        var number = window.getRandomCardValue(cards);

        randObj[number] = randObj[number] ? ++randObj[number] : 1;
    }

    for (var prop in randObj) {
        randArray.push(prop + ':' + (randObj[prop] / count) * 100 + '%');
    }
    
    console.log(randArray);
    console.log('Iterations: ' + iteration);
}

//Random
function randomIntFromInterval(min, max) {
    return ~~(Math.random() * (max - min + 1) + min);
}

function randomDoubleFromInterval(min, max) {
    return Math.random() * (max - min + 1);
}

function randomFromValues() {
    if (arguments.length > 1) {
        var number = randomIntFromInterval(0, arguments.length - 1)

        return arguments[number];
    }
    else if (arguments.length === 1) {
        var arrayOrObject = arguments[0];
        if (Array.isArray(arrayOrObject)) {
            return arrayOrObject[randomIntFromInterval(0, arrayOrObject.length - 1)];
        }
        else {
            var names = Object.keys(arrayOrObject);

            return arrayOrObject[randomIntFromInterval(0, names.length - 1)]
        }
    }
}

//#endregion