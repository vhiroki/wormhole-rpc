'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
            var sock = new SockJS(wsUrl);
            var wormhole = new Wormhole({
                name: name,
                write: function write(message) {
                    sock.send(JSON.stringify(message));
                },
                onRemoteExpose: function onRemoteExpose(exposed) {
                    resolve(exposed);
                }
            });

            sock.onopen = function () {
                (typeof apiToExpose === 'undefined' ? 'undefined' : _typeof(apiToExpose)) === 'object' && apiToExpose !== null && wormhole.expose(apiToExpose);
            };
            sock.onmessage = function (message) {
                wormhole.onMessage(JSON.parse(message.data));
            };
            sock.onclose = function () {};
        });
    }
};