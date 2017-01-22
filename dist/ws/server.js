'use strict';

var http = require('http');
var sockjs = require('sockjs');

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
            wsBindAddress = _ref$wsBindAddress === undefined ? '0.0.0.0' : _ref$wsBindAddress;

        return new Promise(function (resolve, reject) {
            var echo = sockjs.createServer();
            httpServer = httpServer || http.createServer();

            echo.on('connection', function (conn) {
                var wormhole = new Wormhole({
                    name: 'server',
                    write: function write(message) {
                        conn.write(JSON.stringify(message));
                    }
                });

                wormhole.expose(apiToExpose);

                conn.on('data', function (message) {
                    wormhole.onMessage(JSON.parse(message));
                });

                conn.on('close', function () {});
            });

            echo.installHandlers(httpServer, { prefix: wsUrlPrefix });

            httpServer.listen(wsPort, wsBindAddress, 511, resolve);
        });
    }
};