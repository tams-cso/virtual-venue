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
var players = {};
var count = 0;

io.sockets.on('connection', function(socket) {
    console.log('user connected!');

    socket.id = count++;
    players[socket.id] = { x: 500, y: 500, color: randInt(0, 16777215).toString(16).padStart(6, '0') };
    socketList[socket.id] = socket;
    socket.emit("start", {socketId: socket.id, players});
    
    socket.on('move', (movedPlayer) => {
        players[socket.id] = movedPlayer;
        io.emit('update', players);
    });

    socket.on('disconnect', () => {
        delete socketList[socket.id];
        delete players[socket.id];
        io.emit('update', players);
        console.log('user disconnected!');
    })
})

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
