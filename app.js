var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log('Server started.')


var SOCKET_LIST = {};

var Entity = function(param) {
    var self = {
        x: 250,
        y: 250,
        spdX: 0,
        spdY: 0,
        id: "",
        map: 'forest'
    }

    if (param) {
        if (param.x) {
            self.x = param.x;
        }
        if (param.y) {
            self.y = param.y;
        }
        if (param.map) {
            self.map = param.map;
        }
        if (param.id) {
            self.id = param.id;
        }
    }

    self.update = function() {
        self.updatePosition();
    }
    self.updatePosition = function() {
        if (self.x < 21) {
            if (self.spdX > 0) {
                self.x += self.spdX;
            }
        } else if (self.x > 1179) {
            if (self.spdX < 0) {
                self.x += self.spdX;
            }
        } else {
            self.x += self.spdX;
        }

        if (self.y < 21) {
            if (self.spdY > 0) {
                self.y += self.spdY;
            }
        } else if (self.y > 679) {
            if (self.spdY < 0) {
                self.y += self.spdY;
            }
        } else {
            self.y += self.spdY;
        }
    }
    self.getDistance = function(pt) {
        return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
    }
    return self;
}

var Player = function(param) {
    var self = Entity(param);
    self.username = param.username;
    self.number = "" + Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingAttack = false;
    self.mouseAngle = 0;
    self.maxSpd = 10;
    self.points = 0;
    self.hp = 10;
    self.hpMax = 10;


    var super_update = self.update;
    self.update = function() {
        self.updateSpd();
        super_update();

        if (self.pressingAttack) {
            self.shootBullet(self.mouseAngle);
        }
    }
    self.shootBullet = function(angle) {
        var b = Bullet({ 
            parent: self.id,
            angle: angle,
            x: self.x,
            y: self.y,
            map: self.map
        });
    }

    self.updateSpd = function() {
        if (self.pressingRight) {
            self.spdX = self.maxSpd;
        } else if (self.pressingLeft) {
            self.spdX = -self.maxSpd;
        } else {
            self.spdX = 0;
        }

        if (self.pressingUp) {
            self.spdY = -self.maxSpd;
        } else if (self.pressingDown) {
            self.spdY = self.maxSpd;
        } else {
            self.spdY = 0;
        }
    }

    self.getInitPack = function() {
        return {
            id: self.id,
            x: self.x,
            y: self.y,
            username: self.username,
            points: self.points,
            hp: self.hp,
            hpMax: self.hpMax,
            map: self.map            
        };
    }
    self.getUpdatePack = function() {
        return {
            id: self.id,
            x: self.x,
            y: self.y,
            points: self.points,
            hp: self.hp,
            map: self.map
        };
    }

    Player.list[self.id] = self;
    initPack.player.push(self.getInitPack());
    return self;
}
Player.list = {};
Player.onConnect = function(socket, username) {
    var map = 'forest';
    if (Math.random() < 0.5) {
        map = 'field';
    }

    var player = Player({
        id: socket.id,
        username: username.username,
        map: map
    });

    socket.on('keyPress', function(data) {
        if (data.inputId === 'left') {
            player.pressingLeft = data.state;
        } else if (data.inputId === 'right') {
            player.pressingRight = data.state;
        } else if (data.inputId === 'up') {
            player.pressingUp = data.state;
        } else if (data.inputId === 'down') {
            player.pressingDown = data.state;
        } else if (data.inputId === 'attack') {
            player.pressingAttack = data.state;
        } else if (data.inputId === 'mouseAngle') {
            player.mouseAngle = data.state;
        }
    });

    socket.on('changeMap', function(data) {
        if (player.map === 'field') {
            player.map = 'forest';
        } else {
            player.map = 'field';
        }
    });

    socket.emit('init', {
        selfId: socket.id,
        player: Player.getAllInitPack(),
        bullet: Bullet.getAllInitPack()
    });
}
Player.getAllInitPack = function() {
    var players = [];
    for (var i in Player.list) {
        players.push(Player.list[i].getInitPack());
    } 
    return players; 
}
Player.onDisconnect = function(socket) {
    delete Player.list[socket.id];
    removePack.player.push(socket.id);
}
Player.update = function() {
    var pack = [];
    for (var i in Player.list) {
        var player = Player.list[i];
        player.update();
        pack.push(player.getUpdatePack());
    }
    return pack;
}

var Bullet = function(param) {
    var self = Entity(param);
    self.id = Math.random();
    self.angle = param.angle;
    self.spdX = Math.cos(param.angle / 180 * Math.PI) * 10;
    self.spdY = Math.sin(param.angle / 180 * Math.PI) * 10;
    self.parent = param.parent;
    self.toRemove = false;
    var super_update = self.update;
    self.update = function() {
        if (self.x < 21 || self.x > 1179) {
            self.toRemove = true;
        }
        if (self.y < 21 || self.y > 679) {
            self.toRemove = true;
        }
        
        super_update();

        for (var i in Player.list) {
            var p = Player.list[i];
            if (self.map === p.map && self.getDistance(p) < 20 && self.parent != p.id) {
                p.hp -= 1;
                
                if (p.hp <= 0) {
                    var shooter = Player.list[self.parent];
                    if (shooter) {
                        shooter.points += 1;
                    }

                    p.hp = p.hpMax;
                    p.x = Math.random() * 1000;
                    p.y = Math.random() * 500 
                }

                self.toRemove = true;
            }
        }
    }

    self.getInitPack = function() {
        return {
            id: self.id,
            x: self.x,
            y: self.y,
            map: self.map
        };
    }
    self.getUpdatePack = function() {
        return {
            id: self.id,
            x: self.x,
            y: self.y
        };
    }

    Bullet.list[self.id] = self;
    initPack.bullet.push(self.getInitPack());
    return self;
}
Bullet.list = {};
Bullet.update = function() {
    var pack = [];
    for (var i in Bullet.list) {
        var bullet = Bullet.list[i];
        bullet.update();
        if (bullet.toRemove) {
            delete Bullet.list[i];
            removePack.bullet.push(bullet.id);
        } else {
            pack.push(bullet.getUpdatePack());
        }
    }
    return pack;
}
Bullet.getAllInitPack = function() {
    var bullets = [];
    for (var i in Bullet.list) {
        bullets.push(Bullet.list[i].getInitPack());
    }
    return bullets;
}

var io = require('socket.io') (serv, {});
io.sockets.on('connection', function(socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    socket.on('play', function(data) {
        Player.onConnect(socket, data);
        socket.emit('playResponse', {success: true});
    });

    socket.on('disconnect', function() {
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });

    socket.on('sendMsgToServer', function(data) {
        var playerName = Player.list[socket.id].username;
        for(var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('addToChat', playerName + ': ' + data);
        }
    });

    socket.on('evalServer', function(data) {
        var res = eval(data);
        socket.emit('evalAnswer', res);
    });
});

var initPack = {player: [], bullet: []};
var removePack = {player: [], bullet: []};


setInterval(function() {
    var pack = {
        player: Player.update(),
        bullet: Bullet.update()
    }

    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('init', initPack);
        socket.emit('update', pack);
        socket.emit('remove', removePack);
    }
    initPack.player = [];
    initPack.bullet = [];
    removePack.player = [];
    removePack.bullet = [];

}, 1000/25);