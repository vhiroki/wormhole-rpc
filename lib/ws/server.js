const http = require('http');
const sockjs = require('sockjs');

const Wormhole = require('../Wormhole');

module.exports = {
    createServer({
        apiToExpose,
        httpServer,
        wsUrlPrefix='/ws',
        wsPort=3000,
        wsBindAddress='0.0.0.0',
        onNewClient,
        onClientDisconnect
    } = {}) {
        return new Promise((resolve, reject) => {
            const echo = sockjs.createServer();
            httpServer = httpServer || http.createServer();

            echo.on('connection', (conn) => {
                const wormhole = new Wormhole({
                    name: 'server',
                    write(message) {
                        conn.write(JSON.stringify(message));
                    },
                    onHandshakeEnd(wormhole) {
                        onNewClient && onNewClient({
                            connection: conn,
                            methods: wormhole.remoteMethods,
                            publish: wormhole.publish.bind(wormhole),
                            subscribe: wormhole.subscribe.bind(wormhole)
                        });
                    },
                    exposedMethods: apiToExpose
                });

                wormhole.startHandshake();

                conn.on('data', (message) => {
                    wormhole.onMessage(JSON.parse(message))
                });

                conn.on('close', () => {
                    onClientDisconnect && onClientDisconnect({connection: conn});
                });
            });

            echo.installHandlers(httpServer, { prefix: wsUrlPrefix });

            httpServer.listen(wsPort, wsBindAddress, 511, resolve);
        });
    }
};