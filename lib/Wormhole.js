const uuidV1 = require('uuid/v1');

const CALLBACK_TIMEOUT = 10000;

class Wormhole {
    constructor({name, write, onRemoteExpose}) {
        this.name = name;
        this.write = write;
        this.onRemoteExpose = onRemoteExpose;
        this.localMethods = null;
        this.remoteMethods = null;
        this.callbacksMap = {};
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
                case 'remote_methods_description':
                    this._onRemoteMethodsDescription(message.payload);
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
    expose(methods) {
        if (typeof methods !== 'object' || methods === null) {
            return console.error(new Error(`Methods must be a map of functions.`));
        }
        this.localMethods = methods;
        this.write({
            type: 'remote_methods_description',
            payload: {
                methodsDescriptionArray: Object.keys(methods)
            }
        });
    }
    _onMethod({name, params, callbackId}) {

        if (!this.localMethods) {
            return console.error(new Error('No API were exposed.'));
        }

        const method = this.localMethods[name];

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
    _onRemoteMethodsDescription({methodsDescriptionArray}) {
        if (!(methodsDescriptionArray instanceof Array)) {
            return console.error(new Error(`Invalid methods description format. An array was expected.`));
        }
        this.remoteMethods = methodsDescriptionArray.reduce((methods, methodName) => {
            methods[methodName] = (...params) => this.call({name: methodName, params: params});
            return methods;
        }, {});
        this.onRemoteExpose(this.remoteMethods);
    }
}

module.exports = Wormhole;