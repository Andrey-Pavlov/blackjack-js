importScripts('/Blackjack/node_modules/requirejs/require.js');

requirejs(['../../utils'], function (utils) {
        //self - WebWorker
        self.onmessage = function (ev) {
            var text = ev.data;

            var newText = utils.reverse(text);

            self.postMessage(newText);
        };
    }
);