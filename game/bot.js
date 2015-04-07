$(function() {
    var socket = io(),
        $bet = $('#Bet'),
        $hit = $('#Hit'),
        $stand = $('#Stand'),
        $dd = $('#DD'),
        $split = $('#Split'),
        $surrender = $('#Surrender'),
        $restart = $('#Restart');

    var launched = false;

    var speed = 1000;
    
    window.startBot = function() {
        if (launched === false) {
            launched = true;
            
            socket.on('botCommand', function(command) {
                var $element = null;

                switch (command) {
                    case 'H':
                        $element = $hit;
                        break;
                    case 'S':
                        $element = $stand;
                        break;
                    case 'D':
                        $element = $dd;
                        break;
                    case 'R':
                        $element = $surrender;
                        break;
                    case 'P':
                        $element = $split;
                        break;
                    case 'restart':
                        $element = $restart;
                        break;
                    case 'bet':
                        $element = $bet;
                    default:
                        throw 'err';
                }

                $element.click();

                if (command !== 'restart') {
                    setTimeout(function() {
                        socket.emit('getBotCommand');
                    }, speed);
                }
            });

            socket.on('restart', function() {
                f();
            });

            function f() {
                $bet.click();
                setTimeout(function() {
                    socket.emit('getBotCommand');
                }, speed);
            }

            return f();
        }
    }
});