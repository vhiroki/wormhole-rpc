'use strict';

var SocketIO = require('socket.io');
var Wormhole = require('../Wormhole');

module.exports = {
    createServer: function createServer() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            apiToExpose = _ref.apiToExpose,
            httpServer = _ref.httpServer,
            _ref$wsUrlPrefix = _ref.wsUrlPrefix,
            wsUrlPrefix = _ref$wsUrlPrefix === undefined ? '/ws' : _ref$wsUrlPrefix,
            _ref$wsPort = _ref.wsPort,
            wsPort = _ref$wsPort === undefined ? 3000 : _ref$wsPort,
            _ref$wsBindAddress = _ref.wsBindAddress,
            wsBindAddress = _ref$wsBindAddress === undefined ? '0.0.0.0' : _ref$wsBindAddress,
            onNewClient = _ref.onNewClient,
            onClientDisconnect = _ref.onClientDisconnect;

        return new Promise(function (resolve, reject) {
            var io = SocketIO({
                path: wsUrlPrefix
            });

            io.on('connect', function (socket) {
                var wormhole = new Wormhole({
                    name: 'server',
                    write: function write(message) {
                        socket.emit('message', message);
                    },
                    onHandshakeEnd: function onHandshakeEnd(wormhole) {
                        onNewClient && onNewClient({
                            connection: ws,
                            methods: wormhole.remoteMethods,
                            publish: wormhole.publish.bind(wormhole),
                            subscribe: wormhole.subscribe.bind(wormhole)
                        });
                    },

                    exposedMethods: apiToExpose
                });

                wormhole.startHandshake();

                socket.on('message', function (message) {
                    wormhole.onMessage(message);
                });

                socket.on('disconnect', function () {
                    onClientDisconnect && onClientDisconnect({ connection: ws });
                });
            });

            io.listen(wsPort, resolve);
        });
    }
};