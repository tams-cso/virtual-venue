const express = require('express');
const cors = require('cors');
const colyseus = require('colyseus');
const monitor = require('@colyseus/monitor').monitor;
const path = require('path');
const http = require('http');
const PORT = 8082;
const WS_PORT = 2567;

module.exports = () => {
    const app = express();
    const server = http.Server(app);
    const wsApp = express();
    const wsServer = http.Server(wsApp);

    // Use client folder resources statically
    app.use('/client', express.static(path.join(__dirname, '..', 'client')));

    // Express route
    app.get('/', function (req, res, next) {
        res.sendFile(path.join(__dirname, '..', 'client', 'html', 'index.html'));
    });

    app.get('/callback', function (req, res, next) {
        res.sendFile(path.join(__dirname, '..', 'client', 'html', 'callback.html'));
    });

    app.get('/game', function (req, res, next) {
        res.sendFile(path.join(__dirname, '..', 'client', 'html', 'game.html'));
    });

    const GameRoom = require('./GameRoom').GameRoom;
    const gameServer = new colyseus.Server({
        server: wsServer,
    });

    gameServer.define('virtual-venue', GameRoom);
    wsApp.use('/colyseus', monitor());

    gameServer.listen(WS_PORT);
    console.log(`Listening on ws://localhost:${WS_PORT}`);

    // Start Node.js server
    server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

    return server;
};
