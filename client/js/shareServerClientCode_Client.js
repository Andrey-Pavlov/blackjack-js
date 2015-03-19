    var webworker = new Worker('js/worker.js');

    webworker.onmessage = function(ev) {
        console.log("Im worker. I revert your string: " + ev.data + ". HA HA HA!")
    };