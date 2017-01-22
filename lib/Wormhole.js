const uuidV1 = require('uuid/v1');
const {EventEmitter} = require('fbemitter');

const CALLBACK_TIMEOUT = 10000;

class Wormhole {
    constructor({name, write, exposedMethods, onHandshakeEnd}) {
        this.name = name;
        this.write = write;
        this.onHandshakeEnd = onHandshakeEnd;
        this.exposedMethods = exposedMethods;
        this.callbacksMap = {};
        this.remoteMethods = {};
        this.eventEmitter = new EventEmitter();

        this.publish = this.publish.bind(this);
        this.subscribe = this.subscribe.bind(this);
        this.call = this.call.bind(this);
        this.startHandshake = this.startHandshake.bind(this);
        this.onMessage = this.onMessage.bind(this);
    }
    onMessage(message) {
        if (message) {
            switch (message.type) {
                case 'method_call':
                    this._onMethod(message.payload);
                    break;
                case 'method_callback':
                    this._onCallback(message.payload);
                    break;
                case 'handshake_start':
                    this._onHandshakeStart(message.payload);
                    break;
                case 'handshake_end':
                    this._onHandshakeEnd(message.payload);
                    break;
                case 'publish':
                    this._onPublication(message.payload);
                    break;
            }
        }
    }
    call({name, params}) {
        return new Promise((resolve, reject) => {
            const callbackId = uuidV1();
            const timeout = setTimeout(() => {
                reject(new Error(`Method call [${name}] timeout has expired.`));
                delete this.callbacksMap[callbackId];
            }, CALLBACK_TIMEOUT);

            this.write({
                type: 'method_call',
                payload: {
                    name: name,
                    params: params,
                    callbackId: callbackId
                }
            });

            this.callbacksMap[callbackId] = { timeout, resolve, reject };
        });
    }
    publish(topic, data) {
        this.write({
            type: 'publish',
            payload: {
                topic: topic,
                data: data
            }
        });
    }
    subscribe(topic, listener) {
        this.eventEmitter.addListener(topic, listener);
    }
    startHandshake() {
        this.write({
            type: 'handshake_start'
        });
    }
    _onMethod({name, params, callbackId}) {

        if (!this.exposedMethods) {
            return console.error(new Error('No API were exposed.'));
        }

        const method = this.exposedMethods[name];

        if (typeof method === 'function') {
            return Promise.resolve(method(...params))
                .then((result) => {
                    this.write({
                        type: 'method_callback',
                        payload: {
                            callbackId: callbackId,
                            error: false,
                            data: result
                        }
                    });
                })
                .catch((error) => {
                    const normalizedError = (error && (error.stack || error));
                    this.write({
                        type: 'method_callback',
                        payload: {
                            callbackId: callbackId,
                            error: true,
                            data: normalizedError
                        }
                    });
                    console.error(normalizedError);
                });
        }

        this.write({
            type: 'method_callback',
            payload: {
                callbackId: callbackId,
                error: true,
                data: `[${this.name}] has no [${name}] method.`
            }
        });
    }
    _onCallback({callbackId, error, data}) {
        const callbackPromise = this.callbacksMap[callbackId];
        if (callbackPromise) {
            const {resolve, reject, timeout} = callbackPromise;
            if (error) {
                reject(data);
            } else {
                resolve(data);
            }
            clearTimeout(timeout);
            delete this.callbacksMap[callbackId];
        }
    }
    _onHandshakeStart() {
        const handshakePayload = {};
        if (this.exposedMethods) {
            handshakePayload.remoteMethodsDescriptionArray = Object.keys(this.exposedMethods);
        }
        this.write({
            type: 'handshake_end',
            payload: handshakePayload
        });
    }
    _onHandshakeEnd({remoteMethodsDescriptionArray}) {
        if ((remoteMethodsDescriptionArray instanceof Array)) {
            //return console.error(new Error(`Invalid methods description format. An array was expected.`));
            this.remoteMethods = remoteMethodsDescriptionArray.reduce((methods, methodName) => {
                methods[methodName] = (...params) => this.call({name: methodName, params: params});
                return methods;
            }, {});
        }
        this.onHandshakeEnd && this.onHandshakeEnd(this);
    }
    _onPublication({topic, data}) {
        this.eventEmitter.emit(topic, data);
    }
}

module.exports = Wormhole;