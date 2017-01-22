const SockJS = require('sockjs-client');
const Wormhole = require('../Wormhole');

module.exports = {
    createConnection({name='client', apiToExpose, wsUrl='http://localhost:3000/ws'} = {}) {
        return new Promise((resolve, reject) => {
            const sock = new SockJS(wsUrl);
            const wormhole = new Wormhole({
                name: name,
                write(message) {
                    sock.send(JSON.stringify(message));
                },
                onHandshakeEnd(wormhole) {
                    resolve({
                        methods: wormhole.remoteMethods,
                        publish: wormhole.publish,
                        subscribe: wormhole.subscribe
                    });
                },
                exposedMethods: apiToExpose
            });

            sock.onopen = function() {
                wormhole.startHandshake();
            };
            sock.onmessage = (message) => {
                wormhole.onMessage(JSON.parse(message.data));
            };
            sock.onclose = function() {

            };
        });
    }
};