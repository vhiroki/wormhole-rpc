'use strict';

var SockJS = require('sockjs-client');
var Wormhole = require('../Wormhole');

module.exports = {
    createConnection: function createConnection() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$name = _ref.name,
            name = _ref$name === undefined ? 'client' : _ref$name,
            apiToExpose = _ref.apiToExpose,
            _ref$wsUrl = _ref.wsUrl,
            wsUrl = _ref$wsUrl === undefined ? 'http://localhost:3000/ws' : _ref$wsUrl;

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
                var sock = new SockJS(wsUrl);

                wormhole.write = function (message) {
                    sock.send(JSON.stringify(message));
                };

                sock.onopen = function () {
                    console.info('[wormhole-rpc] Websocket client has connected successfully!');
                    wormhole.startHandshake();
                };
                sock.onmessage = function (message) {
                    wormhole.onMessage(JSON.parse(message.data));
                };
                sock.onclose = function () {
                    console.error('[wormhole-rpc] Websocket client has disconnected');
                    console.info('[wormhole-rpc] Reconnecting...');
                    newConnection(wormhole);
                };
            }
        });
    }
};