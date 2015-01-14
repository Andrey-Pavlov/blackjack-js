(function() {
    var blackjack = app.namespace('blackjack'),
        config = app.common.configValues,
        blackjackConfig = config.blackjack;

    var workers = [];
    workers.push(new Worker('js/worker.js'));
    workers.push(new Worker('js/worker.js'));
    workers.push(new Worker('js/worker.js'));
    workers.push(new Worker('js/worker.js'));

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

        var games = [];
        var game = null;
        var worker = null;

        for (var i = 0; i < 4; i++) {
            worker = workers[i];

            games.push(new Promise(function(resolve, reject) {

                worker.postMessage(iterations / 4);

                worker.onmessage = function(ev) {
                    globalResult.wins.count += ev.data.wins.count;
                    globalResult.loses.count += ev.data.loses.count;

                    resolve();
                }
            }));
        }

        Promise.all(games).then(function() {
            console.log(globalResult.wins.count);
            console.log(globalResult.games - globalResult.wins.count - globalResult.loses.count);
            console.log('//');
            console.log(globalResult.loses.count);
        });
    }
}());