'use strict';

var io = require('socket.io-client');
var Wormhole = require('../Wormhole');

module.exports = {
    createConnection: function createConnection() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$name = _ref.name,
            name = _ref$name === undefined ? 'client' : _ref$name,
            apiToExpose = _ref.apiToExpose,
            _ref$wsUrl = _ref.wsUrl,
            wsUrl = _ref$wsUrl === undefined ? 'http://localhost:3000' : _ref$wsUrl,
            _ref$wsPath = _ref.wsPath,
            wsPath = _ref$wsPath === undefined ? '/socket.io' : _ref$wsPath;

        return new Promise(function (resolve, reject) {
            var wormhole = new Wormhole({
                name: name,
                onHandshakeEnd: function onHandshakeEnd(wormhole) {
                    resolve({
                        methods: wormhole.remoteMethods,
                        publish: wormhole.publish,
                        subscribe: wormhole.subscribe
                    });
                },

                exposedMethods: apiToExpose
            });

            newConnection(wormhole);

            function newConnection(wormhole) {
                var socket = io(wsUrl, { path: wsPath });

                wormhole.write = function (message) {
                    socket.emit('message', message);
                };

                socket.on('connect', function () {
                    console.info('[wormhole-rpc] Websocket client has connected successfully!');
                    wormhole.startHandshake();
                });

                socket.on('message', function (message) {
                    wormhole.onMessage(message);
                });

                socket.on('disconnect', function () {
                    console.error('[wormhole-rpc] Websocket client has disconnected');
                    console.info('[wormhole-rpc] Reconnecting...');
                    /*
                    setTimeout(() => {
                        newConnection(wormhole);
                    }, 1000);
                    */
                });
            }
        });
    }
};