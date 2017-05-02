const SocketIO = require('socket.io');
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
            const io = SocketIO({
                path: wsUrlPrefix
            });

            io.on('connect', (socket) => {
                const wormhole = new Wormhole({
                    name: 'server',
                    write(message) {
                        socket.emit('message', message);
                    },
                    onHandshakeEnd(wormhole) {
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

                socket.on('message', (message) => {
                    wormhole.onMessage(message)
                });

                socket.on('disconnect', () => {
                    onClientDisconnect && onClientDisconnect({connection: ws});
                });
            });

            io.listen(wsPort, resolve);
        });
    }
};