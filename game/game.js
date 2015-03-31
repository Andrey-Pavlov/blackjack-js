$(function() {
    var namespace = app.namespace('game');

    namespace.init = function(options) {

        var $dealer = $('#Dealer'),
            $player = $('#Player'),
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
            $gameActionsNotRestart = $gameActions.not('#Restart');

        $gameActions.prop('disabled', true);

        var utils = app.utils,
            socket = io();

        // var cards = ['jack', 'queen', 'king', 'ace', 2, 3, 4, 5, 6, 7, 8, 9, 10],
        var tenCards = ['jack', 'queen', 'king', 10],
            suits = ['spades', 'diamonds', 'clubs', 'hearts'];

        $gameActions.click(function() {
            socket.emit('action', {
                action: $(this).val()
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

            $player.html('');
            $dealer.html('');
            $cheats.html('');
            $result.hide();
            $win.hide();
            $lose.hide();
            $draw.hide();

            $gameActions.prop('disabled', true);
        });

        socket.on('start', function(startResult) {
            $startButtons.prop('disabled', true);
            $gameActions.prop('disabled', false);

            var playerCards = startResult.player.cards,
                dealerCards = startResult.dealer.cards;

            var pc1 = cardTemplate.format(getCardClass(playerCards[0]), utils.randomFromValues(suits), 'enable');
            var pc2 = cardTemplate.format(getCardClass(playerCards[1]), utils.randomFromValues(suits), 'enable');
            var dc1 = cardTemplate.format(getCardClass(dealerCards[0]), utils.randomFromValues(suits), 'enable');
            var dc2 = cardTemplate.format(getCardClass(dealerCards[1]), '', 'enable');

            $player.append(pc1);
            $player.append(pc2);

            $dealer.append(dc1);
            $dealer.append(dc2);

            socket.emit('getCalcs');
        });

        socket.on('hit', hit);

        function hit(hitResult) {
            var pc1 = cardTemplate.format(getCardClass(hitResult.card), utils.randomFromValues(suits), 'enable');
            $player.append(pc1);

            if (hitResult.winLoseDraw === 'lose') {
                $result.show();
                $lose.show();
                $dealerCount.html(hitResult.dealerCount);
                $playerCount.html(hitResult.playerCount);

                $gameActionsNotRestart.prop('disabled', true);
            }
            else {
                socket.emit('getCalcs');
            }
        }

        socket.on('dd', function(ddResult) {
            hit(ddResult);

            if (ddResult.cards) {
                stand(ddResult);
            }
        });

        socket.on('surrender', function(surrenderResult) {
            $dealerCount.html('');
            $playerCount.html('');

            if (surrenderResult.winLoseDraw === 'lose') {
                $lose.show();
            }
            else {
                throw err;
            }
            $result.show();

            $cheats.html('');
            $gameActionsNotRestart.prop('disabled', true);
        });

        socket.on('log', function(log) {
            var log = $logTemplate.html().format(log.bet, log.balance, log.dealerCards.join(', '), log.playerCards.join(', '), log.winLoseDraw, log.actionsTrace.join(' - '));
            
            $log.prepend(log);
        });

        socket.on('stand', stand);

        function stand(standResult) {

            for (var i = 1; i < standResult.cards.length; i++) {
                var card = cardTemplate.format(getCardClass(standResult.cards[i]), utils.randomFromValues(suits), 'enable');

                $dealer.append(card);
            }

            var $frontCard = $($dealer.find('.card.front')[1]),
                $backCard = $($dealer.find('.card.back')[1]);

            $backCard.addClass(getCardClass('' + standResult.cards[0]));
            $backCard.addClass(utils.randomFromValues(suits));
            $backCard.removeClass('back').addClass('front');
            $frontCard.removeClass('front').addClass('back');

            $dealerCount.html(standResult.dealerCount);
            $playerCount.html(standResult.playerCount);


            if (standResult.winLoseDraw === 'win') {
                $win.show();
            }
            else if (standResult.winLoseDraw === 'lose') {
                $lose.show();
            }
            else {
                $draw.show();
            }
            $result.show()

            $cheats.html('');
            $gameActionsNotRestart.prop('disabled', true);
        }

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