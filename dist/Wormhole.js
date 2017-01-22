'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var uuidV1 = require('uuid/v1');

var CALLBACK_TIMEOUT = 10000;

var Wormhole = function () {
    function Wormhole(_ref) {
        var name = _ref.name,
            write = _ref.write,
            onRemoteExpose = _ref.onRemoteExpose;

        _classCallCheck(this, Wormhole);

        this.name = name;
        this.write = write;
        this.onRemoteExpose = onRemoteExpose;
        this.localMethods = null;
        this.remoteMethods = null;
        this.callbacksMap = {};
    }

    _createClass(Wormhole, [{
        key: 'onMessage',
        value: function onMessage(message) {
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
    }, {
        key: 'call',
        value: function call(_ref2) {
            var _this = this;

            var name = _ref2.name,
                params = _ref2.params;

            return new Promise(function (resolve, reject) {
                var callbackId = uuidV1();
                var timeout = setTimeout(function () {
                    reject(new Error('Method call [' + name + '] timeout has expired.'));
                    delete _this.callbacksMap[callbackId];
                }, CALLBACK_TIMEOUT);

                _this.write({
                    type: 'method_call',
                    payload: {
                        name: name,
                        params: params,
                        callbackId: callbackId
                    }
                });

                _this.callbacksMap[callbackId] = { timeout: timeout, resolve: resolve, reject: reject };
            });
        }
    }, {
        key: 'expose',
        value: function expose(methods) {
            if ((typeof methods === 'undefined' ? 'undefined' : _typeof(methods)) !== 'object' || methods === null) {
                return console.error(new Error('Methods must be a map of functions.'));
            }
            this.localMethods = methods;
            this.write({
                type: 'remote_methods_description',
                payload: {
                    methodsDescriptionArray: Object.keys(methods)
                }
            });
        }
    }, {
        key: '_onMethod',
        value: function _onMethod(_ref3) {
            var _this2 = this;

            var name = _ref3.name,
                params = _ref3.params,
                callbackId = _ref3.callbackId;


            if (!this.localMethods) {
                return console.error(new Error('No API were exposed.'));
            }

            var method = this.localMethods[name];

            if (typeof method === 'function') {
                return Promise.resolve(method.apply(undefined, _toConsumableArray(params))).then(function (result) {
                    _this2.write({
                        type: 'method_callback',
                        payload: {
                            callbackId: callbackId,
                            error: false,
                            data: result
                        }
                    });
                }).catch(function (error) {
                    var normalizedError = error && (error.stack || error);
                    _this2.write({
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
                    data: '[' + this.name + '] has no [' + name + '] method.'
                }
            });
        }
    }, {
        key: '_onCallback',
        value: function _onCallback(_ref4) {
            var callbackId = _ref4.callbackId,
                error = _ref4.error,
                data = _ref4.data;

            var callbackPromise = this.callbacksMap[callbackId];
            if (callbackPromise) {
                var resolve = callbackPromise.resolve,
                    reject = callbackPromise.reject,
                    timeout = callbackPromise.timeout;

                if (error) {
                    reject(data);
                } else {
                    resolve(data);
                }
                clearTimeout(timeout);
                delete this.callbacksMap[callbackId];
            }
        }
    }, {
        key: '_onRemoteMethodsDescription',
        value: function _onRemoteMethodsDescription(_ref5) {
            var _this3 = this;

            var methodsDescriptionArray = _ref5.methodsDescriptionArray;

            if (!(methodsDescriptionArray instanceof Array)) {
                return console.error(new Error('Invalid methods description format. An array was expected.'));
            }
            this.remoteMethods = methodsDescriptionArray.reduce(function (methods, methodName) {
                methods[methodName] = function () {
                    for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
                        params[_key] = arguments[_key];
                    }

                    return _this3.call({ name: methodName, params: params });
                };
                return methods;
            }, {});
            this.onRemoteExpose(this.remoteMethods);
        }
    }]);

    return Wormhole;
}();

module.exports = Wormhole;