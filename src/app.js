const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {});
const PORT = 8082;

app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

var socketList = {};
var keys = {};
var players = {};
var count = 0;
const SPEED = 15;

io.sockets.on('connection', function(socket) {
    console.log('user connected!');

    socket.id = count++;
    keys[socket.id] = {};
    players[socket.id] = { x: 500, y: 500, color: randInt(0, 16777215).toString(16) };
    console.log(players[socket.id].color);
    socketList[socket.id] = socket;
    
    socket.on('keydown', (key) => {
        keys[socket.id][key.toLowerCase()] = true;
    });

    socket.on('keyup', (key) => {
        keys[socket.id][key.toLowerCase()] = false;
    });

    socket.on('disconnect', () => {
        delete socketList[socket.id];
        delete keys[socket.id];
        delete players[socket.id];
        console.log('user disconnected!');
    })
})

setInterval(function() {
    for (var i in socketList) {
        var socket = socketList[i];
        var keyDown = keys[socket.id];
        if (keyDown['w'] || keyDown['arrowup']) players[socket.id].y -= SPEED;
        if (keyDown['s'] || keyDown['arrowdown']) players[socket.id].y += SPEED;
        if (keyDown['a'] || keyDown['arrowleft']) players[socket.id].x -= SPEED;
        if (keyDown['d'] || keyDown['arrowright']) players[socket.id].x += SPEED;
    }
    io.emit('update', players);
}, 1000/20);

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
