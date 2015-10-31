var read = require('fs').readFileSync;
var _ = require('lodash');
var redis = require('redis');

module.exports = Chat;

var clientSource = read(require.resolve('./client.js'), 'utf-8');

function Chat(io, params){
    params = params || {};
    Chat.prototype._wsmap = {};
    Chat.prototype._cmap = {};
    Chat.prototype._idmap = {};
    Chat.prototype.useTokenValidate = params.useTokenValidate || false;
    Chat.prototype.validateUrl = params.validateUrl || '';

    Chat.prototype._init = function() {

        this._connectDatabase();
        this._attachServeClientChat();
        this._attachEvents();
    };

    Chat.prototype._connectDatabase = function() {
        this.redis = redis.createClient('6379', '127.0.0.1');

        this.redis.select(2, function(err) {
            if (err) {
                throw new Error(err);
            }
        });
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
            ws.emit('socketConnected', {id: ws.id});

            ws.on('userConnect', _.bind(self._onUserConnect,      self, ws));
            ws.on('sendMessage', _.bind(self._onSendMessage,      self, ws));
            ws.on('disconnect',  _.bind(self._onClientDisconnect, self, ws));
            ws.on('setConnectionsListenerFor', _.bind(self._onSetConnectionsListenerFor, self));
        })
    };

    Chat.prototype._getId = function(target, id) {
        if (typeof target == 'string') return target + '_' + id;

        return target.handshake.headers.origin + '_' + id;
    };

    Chat.prototype._onClientDisconnect = function(ws){
        delete this._cmap[ws.id];

        var id = this._idmap[ws.id],
            cws = this._wsmap[id];

        if (cws) cws.splice(cws.indexOf(ws), 1);

        if (!cws.length) delete this._wsmap[id];
        delete this._idmap[ws.id];
    };

    Chat.prototype._onUserConnect = function(ws, id, token) {
        var self = this;

        if (!this.useTokenValidate) {
            doConnect(id);
        } else {
            self.checkAccess(id, token, function(accessed) {
                if (accessed) {
                    return doConnect(id);
                } else {
                    //TODO: send failure event
                }
            });
        }

        function doConnect(id) {
            var id = self._getId(ws, id);

            self._idmap[ws.id] = id;
            if (!self._wsmap[id]) self._wsmap[id] = [];

            self._wsmap[id].push(ws);
            ws.emit('connectToChat');
        }

    };

    Chat.prototype.checkAccess = function(id, token, callback) {
        if (this.validateUrl) {
            //send http request and call callback with access flag
        }

        return callback.call(true);
    };

    Chat.prototype._onSendMessage = function(ws, percipientId, message, domain) {
        var self = this;

     //   this.redis

        var percipientWss = this._wsmap[this._getId(domain || ws, percipientId)];

        if (percipientWss && percipientWss.length) {
            percipientWss.forEach(function(tws){
                tws.emit('messageReceived', self._idmap[ws.id], message);
            });
        }

        var senderId = this._idmap[ws.id];
        self._wsmap[senderId].forEach(function(tws){
            tws.emit('messageReceived', self._idmap[ws.id], message);
        });
    };

    Chat.prototype._onSetConnectionsListenerFor = function(ids){
        this._cmap[this.id] = ids;
    };

    this._init();
}

Chat.servers = [];
Chat.bind = function(io, params) {
    var chatServer = new Chat(io, params);
    Chat.servers.push(chatServer);
    return chatServer;
}
