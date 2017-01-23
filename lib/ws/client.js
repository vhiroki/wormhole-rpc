const SockJS = require('sockjs-client');
const Wormhole = require('../Wormhole');

module.exports = {
    createConnection({name='client', apiToExpose, wsUrl='http://localhost:3000/ws'} = {}) {
        return new Promise((resolve, reject) => {
            const wormhole = new Wormhole({
                name: name,
                onHandshakeEnd(wormhole) {
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
                const sock = new SockJS(wsUrl);

                wormhole.write = (message) => {
                    sock.send(JSON.stringify(message));
                };

                sock.onopen = function() {
                    console.info('[wormhole-rpc] Websocket client has connected successfully!');
                    wormhole.startHandshake();
                };
                sock.onmessage = (message) => {
                    wormhole.onMessage(JSON.parse(message.data));
                };
                sock.onclose = function() {
                    console.warn('[wormhole-rpc] Websocket client has disconnected');
                    console.warn('[wormhole-rpc] Reconnecting...');
                    newConnection(wormhole);
                };
            }
        });
    }
};