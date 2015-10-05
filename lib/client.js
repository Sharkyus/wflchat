(function(){
    var ChatClient = function(id, conn) {
        ChatClient.prototype._conn = null;
        ChatClient.prototype._id = id;

        ChatClient.prototype._initialize = function(){
            var self = this;
            if (typeof conn == 'string') {
                this._conn = io.connect(conn);
            }

            if (!this._conn.connected) {
                this._conn.on('socketConnected', function() {
                    return self.connect();
                });
            }

            this.connect();
        };

        ChatClient.prototype.connect = function(){
            this._conn.emit('userConnect', this._id);
        };

        /**
         *  Set connection listening. If specify user connect to chat, emit connection event.
         *
         *  @public
         *  @return {Object} Socket connection
         */
        ChatClient.prototype.getSocketConnection = function() {
            return this._conn;
        };

        /**
         *  Set connection listening. If specify user connect to chat, emit connection event.
         *
         *  @public
         *  @param {Array} [ids] Listening senders
         */
        ChatClient.prototype.setConnectionsListenerFor = function(ids) {
            this._conn.emit('setConnectionsListenerFor', ids);
        };

        /**
         * Handler. Fire if entity with id from listening connection list connect to chat.
         *
         * @public
         * @param {Function} [callback] Function, handled if listening user connected
         * @param {Object} [scope] Scope
         */
        ChatClient.prototype.onUserConnected = function(callback, scope) {
            this._conn.on('userConnected', function(){

            });
        };

        /**
         * Handler. Fire if entity with id from listening connection list connect to chat.
         *
         * @public
         * @param {Function} [callback] Function, handled if message received
         * @param {Object} [scope] Scope
         */
        ChatClient.prototype.onMessageReceived = function(callback, scope) {
            this._conn.on('messageReceived', function(){
                callback && callback.apply(scope || this, arguments);
            });
        };

        /**
         * Send message to selected recipient
         *
         * @public
         * @param {String} [message] Message
         * @param {Number} [adrId] Recipient id
         */
        ChatClient.prototype.sendMessage = function(recipientId, message) {
            this._conn.emit('sendMessage', recipientId, message);
        };

        /**
         *  Add event listener
         *
         *  @public
         *  @param {String} [eventName] Event name
         *  @param {Function} [handler] Handler
         *  @param {Object} [scope] Scope object
         */
        ChatClient.prototype.on = function(eventName, handler, scope) {
            if (!this._eventHandlers) this._eventHandlers = [];
            if (!this._eventHandlers[eventName]) {
                this._eventHandlers[eventName] = [];
            }
            this._eventHandlers[eventName].push([handler, scope]);
        };

        /**
         *  Add event listener, is handled once
         *
         *  @public
         *  @param {String} [eventName] Event name
         *  @param {Function} [handler] Handler
         *  @param {Object} [scope] Scope object
         */
        ChatClient.prototype.once = function(eventName, handler, scope) {
            if (!this._eventHandlers) this._eventHandlers = [];
            var handlers = this._eventHandlers[eventName];

            if (handlers) {
                for(var i=0; i<handlers.length; i++) {
                    if (handlers[i][0] == handler) {
                        return;
                    }
                }
            } else {
                this.on(eventName, handler, scope);
            }
        };

        /**
         *  Remove event listener
         *
         *  @public
         *  @param {String} [eventName] Event name
         *  @param {Function} [handler] Handler
         */
        ChatClient.prototype.off = function(eventName, handler) {
            var handlers = this._eventHandlers[eventName];
            if (!handlers) return;
            for(var i=0; i<handlers.length; i++) {
                if (handlers[i][0] == handler) {
                    handlers.splice(i--, 1);
                }
            }
        };

        /**
         *  Emit event
         *
         *  @public
         *  @param {String} [eventName] Event name
         */
        ChatClient.prototype.trigger = function(eventName) {
            if (!this._eventHandlers[eventName]) {
                return; // обработчиков для события нет
            }

            // вызвать обработчики
            var handlers = this._eventHandlers[eventName];
            for (var i = 0; i < handlers.length; i++) {
                handlers[i][0].apply(handlers[i][1] || this, [].slice.call(arguments, 1));
            }
        };

        this._initialize();
    }

    window.ChatClient = ChatClient;
})();