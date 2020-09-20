const express = require('express');
const app = express();
const path = require('path');
const server = require('http').Server(app);
const PORT = 8082;

module.exports = () => {
    // Use client folder resources statically
    app.use('/client', express.static(__dirname + '/client'));

    // Express route
    app.get('/', function (req, res, next) {
        res.sendFile(path.join(__dirname, '..', 'client', 'html', 'index.html'));
    });

    app.get('/callback', function (req, res, next) {
        res.send('call me back LOL');
    });

    app.get('/game', function (req, res, next) {
        res.send('heyyyyyy');
    });

    // Start Node.js server
    server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));
};

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

// function randInt(min, max) {
//     return Math.floor(Math.random() * (max - min) + min);
// }
