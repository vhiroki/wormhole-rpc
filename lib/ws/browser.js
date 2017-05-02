const io = require('socket.io-client');
const Wormhole = require('../Wormhole');

module.exports = {
    createConnection({name='client', apiToExpose, wsUrl='http://localhost:3000', wsPath='/socket.io'} = {}) {
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
                const socket = io(wsUrl, {path: wsPath});

                wormhole.write = (message) => {
                    socket.emit('message', message);
                };

                socket.on('connect', () => {
                    console.info('[wormhole-rpc] Websocket client has connected successfully!');
                    wormhole.startHandshake();
                });

                socket.on('message', (message) => {
                    wormhole.onMessage(message);
                });

                socket.on('disconnect', () => {
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