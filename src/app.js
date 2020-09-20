const express = require('express');
const app = express();
const server = require('http').Server(app);
// const io = require('socket.io')(server, {});
const Bot = require('./server/bot');
const config = require('./config.json');
const PORT = 8082;

// Express route
app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/client/index.html');
});

app.get('/callback', function (req, res, next) {
    res.send('call me back LOL');
});

app.get('/game', function (req, res, next) {
    res.send('heyyyyyy');
});

// Use client folder resources statically
app.use('/client', express.static(__dirname + '/client'));

// Start Node.js server
server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

// Start discord bot
Bot.runBot(config);

// var socketList = {};
// var players = {};
// var count = 0;

// io.sockets.on('connection', function(socket) {
//     console.log('user connected!');

//     socket.id = count++;
//     players[socket.id] = { x: 500, y: 500, color: randInt(0, 16777215).toString(16).padStart(6, '0') };
//     socketList[socket.id] = socket;
//     socket.emit("start", {socketId: socket.id, players});

//     socket.on('move', (movedPlayer) => {
//         players[socket.id] = movedPlayer;
//         io.emit('update', players);
//     });

//     socket.on('disconnect', () => {
//         delete socketList[socket.id];
//         delete players[socket.id];
//         io.emit('update', players);
//         console.log('user disconnected!');
//     })
// })

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
