var read = require('fs').readFileSync;
var _ = require('lodash');

module.exports = Chat;

var clientSource = read(require.resolve('./client.js'), 'utf-8');

function Chat(io){
    Chat.prototype._wsmap = {};
    Chat.prototype._cmap = {};
    Chat.prototype._idmap = {};
    Chat.prototype._init = function() {
        this._attachServeClientChat();
        this._attachEvents();
    };

    Chat.prototype._attachServeClientChat = function() {
        var self = this,
            url = '/chat_client',
            srv = io.httpServer,
            evs = srv.listeners('request').slice(0);

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

            ws.on('userConnect', _.bind(self._onUserConnect,      self, ws));
            ws.on('sendMessage', _.bind(self._onSendMessage,      self, ws));
            ws.on('disconnect',  _.bind(self._onClientDisconnect, self, ws));
            ws.on('setConnectionsListenerFor', _.bind(self._onSetConnectionsListenerFor, self));
        })
    };

    Chat.prototype._getId = function(ws, id) {
        return ws.handshake.headers.host + '_' + id;
    };

    Chat.prototype._onClientDisconnect = function(ws){
        delete this._cmap[ws.id];

        var id = this._getId(ws, this._idmap[ws.id]),
            cws = this._wsmap[id];

        if (cws) cws.splice(cws.indexOf(ws), 1);

        if (!cws.length) delete this._wsmap[id];

        console.log(this._wsmap);
    };

    Chat.prototype._onUserConnect = function(ws, id) {
        var id = this._getId(ws, id);

        this._idmap[ws.id] = id;
        if (!this._wsmap[id]) this._wsmap[id] = [];

        this._wsmap[id].push(ws);
    };

    Chat.prototype._onSendMessage = function(ws, percipientId, message) {
        var self = this;

        var percipientWss = this._wsmap[this._getId(ws, percipientId)];

        if (percipientWss && percipientWss.length) {
            percipientWss.forEach(function(tws){
                tws.emit('messageReceived', self._idmap[ws.id], message);
            });
        }

        var senderId = self._getId(ws, this._idmap[ws.id]);

        self._wsmap[senderId].forEach(function(tws){
            tws.emit('messageReceived', self._idmap[ws.id], message);
        });
    };

    Chat.prototype._onSetConnectionsListenerFor = function(ids){
        this._cmap[this.id] = ids;
    };

    this._init();
}

Chat.bind = function(io) {
    new Chat(io);
}