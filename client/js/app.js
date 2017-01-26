var WIDTH = 1200;
var HEIGHT = 700;

var socket = io();

//LOGIN
var username = document.getElementById('username');
var play = document.getElementById('play');

play.onclick = function() {
    socket.emit('play', {username: username.value});
}
socket.on('playResponse', function(data){
    if (data.success) {
        usernameDiv.style.display = 'none';
        gameDiv.style.display = 'inline-block';
        highscoreDiv.style.display = 'inline-block';
    } else {
        alert("Invalid username");
    }
});


//HIGHSCORE
var highscore = document.getElementById('highscoreDiv');

var updateHighscore = function() {
    highscore.innerHTML = "";
    
    for (var i in Player.list) {
        highscore.innerHTML += '<div>' + Player.list[i].username + ': ' + Player.list[i].points + '</div>';
    }
}

//CHAT
var chatText = document.getElementById('chat-text');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');

socket.on('addToChat', function(data) {
    chatText.innerHTML += '<div>' + data + '</div>';
});
socket.on('evalAnswer', function(data) {
    console.log(data);
});

chatForm.onsubmit = function(e) {
    e.preventDefault();

    if (chatInput.value[0] === '/') {
        socket.emit('evalServer', chatInput.value.slice(1));
    } else {
        socket.emit('sendMsgToServer', chatInput.value);
    }
    chatInput.value = '';
}

//UI
var changeMap = function() {
    socket.emit('changeMap');
}

//GAME
var Img = {};
Img.player = new Image();
Img.player.src = '/client/img/player3.png';
Img.bullet = new Image();
Img.bullet.src = '/client/img/bullet.png';

Img.map = {};
Img.map['forest'] = new Image();
Img.map['forest'].src = '/client/img/map2.png';
Img.map['field'] = new Image();
Img.map['field'].src = '/client/img/map3.png';

var ctx = document.getElementById("ctx").getContext("2d");
//ctx.font = '30px Arial';

var Player = function(initPack) {
    var self = {};
    self.id = initPack.id;
    self.username = initPack.username;
    self.x = initPack.x;
    self.y = initPack.y;
    self.points = initPack.points;
    self.hp = initPack.hp;
    self.hpMax = initPack.hpMax;
    self.map = initPack.map;

    self.draw = function() {
        if (Player.list[selfId].map !== self.map) {
            return;
        }

        var x = self.x - Player.list[selfId].x + WIDTH / 2;
        var y = self.y - Player.list[selfId].y + HEIGHT / 2;

        var hpWidth = 30 * self.hp / self.hpMax;
        ctx.fillStyle = '#FF6A6A';
        ctx.fillRect(x - hpWidth / 2, y - 40, hpWidth, 4);

        var width = Img.player.width * 2;
        var height = Img.player.height * 2;

        

        ctx.drawImage(Img.player, 0, 0, Img.player.width, Img.player.height, x - width / 2, y - height / 2, width, height);

        //var hpWidth = 30 * self.hp / self.hpMax;
        //ctx.fillRect(self.x - hpWidth / 2, self.y - 40, hpWidth, 4);
        // if (self.hp === 1) {
        //     ctx.fillStyle = '#FF0000';
        // } else if (self.hp === 2) {
        //     ctx.fillStyle = '#FF3300';
        // } else if (self.hp === 3) {
        //     ctx.fillStyle = '#ff6600';
        // } else if (self.hp === 4) {
        //     ctx.fillStyle = '#ff9900';
        // } else if (self.hp === 5) {
        //     ctx.fillStyle = '#FFCC00';
        // } else if (self.hp === 6) {
        //     ctx.fillStyle = '#FFFF00';
        // } else if (self.hp === 7) {
        //     ctx.fillStyle = '#ccff00';
        // } else if (self.hp === 8) {
        //     ctx.fillStyle = '#99ff00';
        // } else if (self.hp === 9) {
        //     ctx.fillStyle = '#66ff00';
        // } else {
        //     ctx.fillStyle = '#33ff00';
        // }

        // ctx.beginPath();
        // ctx.arc(self.x, self.y, 20, 0, Math.PI * 2, false);
        // ctx.fill();

        // ctx.lineWidth = 3;
        // ctx.strokeStyle = '#FF0000';
        // ctx.stroke();


        // ctx.font = '10pt Calibri';
        // ctx.fillStyle = 'white';
        // ctx.textAlign = 'center';
        // ctx.fillText(self.username, self.x, self.y + 5);
    }

    Player.list[self.id] = self;
    return self;
}
Player.list = {};

var Bullet = function(initPack) {
    var self = {};
    self.id = initPack.id;
    self.x = initPack.x;
    self.y = initPack.y;
    self.map = initPack.map;

    self.draw = function() {
        if (Player.list[selfId].map !== self.map) {
            return;
        }

        var width = Img.player.width;
        var height = Img.player.width;

        var x = self.x - Player.list[selfId].x + WIDTH / 2;
        var y = self.y - Player.list[selfId].y + HEIGHT / 2;

        ctx.drawImage(Img.bullet, 0, 0, Img.bullet.width, Img.bullet.height, x - width / 2, y - height / 2, width, height);

        // ctx.fillRect(self.x - 5, self.y - 5, 10, 10);
    }

    Bullet.list[self.id] = self;
    return self;
}
Bullet.list = {};

var selfId = null;

socket.on('init', function(data) {
    if (data.selfId) {
        selfId = data.selfId;
    }
    //{ player: [{id:123, number:'1', x:0, y:0}, {id:1, number:'2', x:0, y:0}], bullet: []}
    for (var i = 0 ; i < data.player.length; i++) {
        new Player(data.player[i]);
    }
    for (var i = 0 ; i < data.bullet.length; i++) {
        new Bullet(data.bullet[i]);
    }
});

socket.on('update', function(data) {
    //{ player: [{id:123, x:0, y:0}, {id:1, x:0, y:0}], bullet: []}
    for (var i = 0 ; i < data.player.length; i++) {
        var pack = data.player[i];
        var p = Player.list[pack.id];
        if (p) {
            if (pack.x !== undefined) {
                p.x = pack.x;
            }
            if (pack.y !== undefined) {
                p.y = pack.y;
            }
            if (pack.points !== undefined) {
                p.points = pack.points;
            }
            if (pack.hp !== undefined) {
                p.hp = pack.hp;
            }
            if (pack.map !== undefined) {
                p.map = pack.map;
            }
        }
    }
    for (var i = 0 ; i < data.bullet.length; i++) {
        var pack = data.bullet[i];
        var b = Bullet.list[pack.id];
        if (b) {
            if (pack.x !== undefined) {
                b.x = pack.x;
            }
            if (pack.y !== undefined) {
                b.y = pack.y;
            }
        }
    }
});

socket.on('remove', function(data) {
    //{ player: [12323], bullet: [12323, 123123]}
    for (var i = 0 ; i < data.player.length; i++) {
        delete Player.list[data.player[i]];
    }
    for (var i = 0 ; i < data.bullet.length; i++) {
        delete Bullet.list[data.bullet[i]];        
    }
});

setInterval(function() {
    if (!selfId) {
        return;
    }
    ctx.clearRect(0, 0, 2000, 2000);
    drawMap();
    // drawScore();
    for (var i in Player.list) {
        Player.list[i].draw();
    }

    ctx.fillStyle = '#000000';
    for (var i in Bullet.list) {
        Bullet.list[i].draw();
    }

    updateHighscore();
}, 40);

var drawMap = function() {
    var player = Player.list[selfId];

    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, 1200, 700);

    var x = WIDTH / 2 - player.x;
    var y = HEIGHT / 2 - player.y;

    ctx.drawImage(Img.map[player.map], x, y);
    
}

// var drawScore = function() {
//     ctx.fillStyle = 'white';
//     ctx.font = '30px Arial';
//     ctx.fillText(Player.list[selfId].points, 0, 30);
// }

document.onkeydown = function(event) {
    if (event.keyCode === 68) { //d
        socket.emit('keyPress', {inputId: 'right', state: true});
    }
    if (event.keyCode === 83) { //s
        socket.emit('keyPress', {inputId: 'down', state: true});
    }
    if (event.keyCode === 65) { //a
        socket.emit('keyPress', {inputId: 'left', state: true});
    }
    if (event.keyCode === 87) { //w
        socket.emit('keyPress', {inputId: 'up', state: true});
    }
}
document.onkeyup = function(event) {
    if (event.keyCode === 68) { //d
        socket.emit('keyPress', {inputId: 'right', state: false});
    }
    if (event.keyCode === 83) { //s
        socket.emit('keyPress', {inputId: 'down', state: false});
    }
    if (event.keyCode === 65) { //a
        socket.emit('keyPress', {inputId: 'left', state: false});
    }
    if (event.keyCode === 87) { //w
        socket.emit('keyPress', {inputId: 'up', state: false});
    }
}

document.onmousedown = function(event) {
    socket.emit('keyPress', {inputId: 'attack', state: true});
}
document.onmouseup = function(event) {
    socket.emit('keyPress', {inputId: 'attack', state: false});
}
document.onmousemove = function(event) {
    var x = -250 + event.clientX - 8;
    var y = -250 + event.clientY - 8;
    var angle = Math.atan2(y, x) / Math.PI * 180;
    socket.emit('keyPress', {inputId: 'mouseAngle', state: angle});
}