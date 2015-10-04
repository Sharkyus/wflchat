var read = require('fs').readFileSync;

module.exports = Chat;

var clientSource = read(require.resolve('./client.js'), 'utf-8');

function Chat(io){
    Chat.prototype._wsmap = {};
    Chat.prototype._cmap = {};
    Chat.prototype._init = function() {
        this._attachServeClientChat();
        this._attachEvents();
    };

    Chat.prototype._attachServeClientChat = function() {
        var self = this;
        var url = '/chat_client';
        var srv = io.httpServer;
        var evs = srv.listeners('request').slice(0);
        srv.removeAllListeners('request');
        srv.on('request', function(req, res) {
            if (0 == req.url.indexOf(url)) {
                self._serve(req, res);
            } else {
                for (var i = 0; i < evs.length; i++) {
                    evs[i].call(srv, req, res);
                }
            }
        });
    };

    Chat.prototype._serve = function(req, res) {
        res.setHeader('Content-Type', 'application/javascript');
        //res.setHeader('ETag', clientVersion);
        res.writeHead(200);
        res.end(clientSource);
    };

    Chat.prototype._attachEvents = function() {
        var self = this;
        io.sockets.on('connection', function (ws) {
            self._cmap[ws.id] = [];
            io.emit('connected', {id: ws.id});

            ws.on('disconnect', function(){
                delete self._cmap[this.id];
                delete self._wsmap[this.handshake.headers.host + '_' + self._cmap[this.id]];
            });

            ws.on('userConnect', function(id) {
                self._cmap[this.id] = id;
                self._wsmap[this.handshake.headers.host + '_' + id] = ws;
            });

            ws.on('setConnectionsListenerFor', function(ids){
                self._cmap[this.id] = ids;
            });

            ws.on('sendMessage', function(percipientId, message) {
                var percipient = self._wsmap[this.handshake.headers.host + '_' + percipientId];
                percipient && percipient.emit('messageReceived', message);
                this.emit('messageReceived', message);
            });
        })
    };

    this._init();
}

Chat.bind = function(io) {
    new Chat(io);
}