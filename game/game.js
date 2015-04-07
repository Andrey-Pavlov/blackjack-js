$(function() {
    var namespace = app.namespace('game');

    namespace.init = function(chart) {

        var $dealer = $('#Dealer'),
            $player = null,
            hands = [],
            $playerTemplate = $('#PlayerTemplate'),
            $playerContainer = $('#PlayerContainer'),
            $cheats = $('#Cheats'),
            cardTemplate = $('#CardTemplate').html(),
            $result = $('#Result'),
            $win = $('#Win').hide(),
            $lose = $('#Lose').hide(),
            $draw = $('#Draw').hide(),
            $balance = $('#Balance'),
            $bet = $('#CurrentBet'),
            $dealerCount = $('#DealerCount'),
            $playerCount = $('#PlayerCount'),
            $startButtons = $('.start button'),
            $gameActions = $('.game-action:not(.not-available)'),
            $logTemplate = $('#LogTemplate'),
            $log = $('#Log'),
            $splitHand = null,
            $gameActionsNotRestart = $gameActions.not('#Restart'),
            handIndex = 0;

        $gameActions.prop('disabled', true);

        var utils = app.utils,
            socket = io();

        // var cards = ['jack', 'queen', 'king', 'ace', 2, 3, 4, 5, 6, 7, 8, 9, 10],
        var tenCards = ['jack', 'queen', 'king', 10],
            suits = ['spades', 'diamonds', 'clubs', 'hearts'];

        $gameActions.click(function() {
            var val = $(this).val();

            if (val === 'S') {
                handIndex++;
            }

            socket.emit('action', {
                action: val
            });
        });

        $startButtons.click(function() {
            socket.emit('placeBet', {
                bet: $(this).data('bet')
            });
        });

        socket.on('betBalanceChanged', function(betBalance) {
            $balance.text(betBalance.balance);
            $bet.text(betBalance.bet);
        });

        socket.on('restart', function() {
            $startButtons.prop('disabled', false);

            $playerContainer.html('');
            $dealer.html('');
            $cheats.html('');
            $result.hide();
            $win.hide();
            $lose.hide();
            $draw.hide();

            hands = [];
            handIndex = 0;
            //$gameActions.prop('disabled', true);
        });

        socket.on('start', function(startResult) {
            $startButtons.prop('disabled', true);
            $gameActions.prop('disabled', false);

            var playerCards = startResult.playerCards,
                dealerCard = startResult.dealerCard;

            var pc1 = cardTemplate.format(getCardClass(playerCards[0]), utils.randomFromValues(suits), 'enable');
            var pc2 = cardTemplate.format(getCardClass(playerCards[1]), utils.randomFromValues(suits), 'enable');
            var dc1 = cardTemplate.format(getCardClass(dealerCard), utils.randomFromValues(suits), 'enable');
            var dc2 = cardTemplate.format('', '', 'enable');

            $player = $($playerTemplate.html());
            $player.append(pc1);
            $player.append(pc2);
            $playerContainer.html($player);
            hands.push($player);

            $dealer.append(dc1);
            $dealer.append(dc2);
        });

        socket.on('split', function(splitResult) {
            var $player = hands[handIndex];

            //Split
            $splitHand = $($playerTemplate.html());

            var pc1 = $player.find('.card-container').last();
            $splitHand.append(pc1);

            var splc2 = cardTemplate.format(getCardClass(splitResult.splitCard), utils.randomFromValues(suits), 'enable');
            $splitHand.append(splc2);

            $splitHand.appendTo($playerContainer);

            hands.push($splitHand);
            //
            var pc2 = cardTemplate.format(getCardClass(splitResult.playerCard), utils.randomFromValues(suits), 'enable');
            $player.append(pc2);
        });

        socket.on('hit', hit);
        socket.on('dd', function(ddResult) {
            hit(ddResult);
        });

        function hit(hitResult) {
            var $player = hands[handIndex];

            var pc1 = cardTemplate.format(getCardClass(hitResult.card), utils.randomFromValues(suits), 'enable');
            $player.append(pc1);

            if (hitResult.winLoseDraw === 'lose') {
                $result.show();
                $lose.show();
                $dealerCount.html(hitResult.dealerCount);
                $playerCount.html(hitResult.playerCount);

                //$gameActionsNotRestart.prop('disabled', true);

                handIndex++;

                $cheats.html('');
            }
        }

        socket.on('surrender', function(surrenderResult) {
            var $player = hands[handIndex];

            $dealerCount.html('');
            $playerCount.html('');

            if (surrenderResult.winLoseDraw === 'lose') {
                $lose.show();
                handIndex++;
            }
            else {
                throw err;
            }
            $result.show();

            $cheats.html('');
            //$gameActionsNotRestart.prop('disabled', true);
        });

        socket.on('log', function(log) {
            var logText = $logTemplate.html().format(log.bet, log.balance, log.dealerCount, log.playerCount, log.dealerCards.join(', '), log.playerCards.join(', '), log.winLoseDraw, log.actionsTrace.join(' - '));

            $log.prepend(logText);
        });

        socket.on('graph', function(chartData) {
            chart.addData([chartData.balance], chartData.gamesCount % 50 === 0 ? chartData.gamesCount : '');

            if (chart.datasets[0].points.length === 100) {
                chart.removeData();
            }
        });

        socket.on('stand', function(standResult) {
            for (var i = 2; i < standResult.dealerCards.length; i++) {
                var card = cardTemplate.format(getCardClass(standResult.dealerCards[i]), utils.randomFromValues(suits), 'enable');

                $dealer.append(card);
            }

            var $frontCard = $($dealer.find('.card.front')[1]),
                $backCard = $($dealer.find('.card.back')[1]);

            $backCard.addClass(getCardClass('' + standResult.dealerCards[1]));
            $backCard.addClass(utils.randomFromValues(suits));
            $backCard.removeClass('back').addClass('front');
            $frontCard.removeClass('front').addClass('back');

            $dealerCount.html(standResult.dealerCount);

            _.each(standResult.playerHands, function(hand) {

                $playerCount.html(hand.playerCount);

                if (hand.winLoseDraw === 'win') {
                    $win.show();
                }
                else if (hand.winLoseDraw === 'lose') {
                    $lose.show();
                }
                else {
                    $draw.show();
                }
                $result.show();

                $cheats.html('');
                //$gameActionsNotRestart.prop('disabled', true);
            });
        });

        socket.on('calcs', function(calcs) {
            $cheats.html('');

            for (var i = 0; i < calcs.length; i++) {
                $cheats.append('<p><strong>' + calcs[i].name + ' : ' + calcs[i].value + '</strong></p>');
            }
        });

        function getCardClass(cardValue) {
            if (cardValue === 1) {
                return 'ace';
            }
            else if (cardValue === 10) {
                return utils.randomFromValues(tenCards);
            }
            else if (cardValue !== null && cardValue !== undefined) {
                return cardValue;
            }
            else {
                return 'shirt';
            }
        }
    };
});