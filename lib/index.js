
var read = require('fs').readFileSync;

module.exports = Chat;
var clientSource = read(require.resolve('./client.js'), 'utf-8');

function Chat(io){
    Chat.prototype.init = function() {
        this.attachServeClientChat();
    }
    Chat.prototype.attachServeClientChat = function() {
        var self = this;
        var url = '/chat_client';
        var srv = io.httpServer;
        var evs = srv.listeners('request').slice(0);
        srv.removeAllListeners('request');
        srv.on('request', function(req, res) {
            if (0 == req.url.indexOf(url)) {
                self.serve(req, res);
            } else {
                for (var i = 0; i < evs.length; i++) {
                    evs[i].call(srv, req, res);
                }
            }
        });
        io.sockets.on('connection', function (ws) {

        })
    }
    Chat.prototype.serve = function(req, res) {
        res.setHeader('Content-Type', 'application/javascript');
        //res.setHeader('ETag', clientVersion);
        res.writeHead(200);
        res.end(clientSource);
    }

    this.init();
}

Chat.bind = function(io) {
    new Chat(io);
}