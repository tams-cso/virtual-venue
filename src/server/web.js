const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const PORT = 8082;
const WS_PORT = 2567;

module.exports = () => {
    // Create app for main pagnation
    const app = express();
    const server = http.Server(app);

    // Use client folder resources statically
    app.use('/client', express.static(path.join(__dirname, '..', 'client')));

    // Express routes for auth
    app.get('/', function (req, res, next) {
        res.sendFile(path.join(__dirname, '..', 'client', 'html', 'index.html'));
    });
    app.get('/callback', function (req, res, next) {
        res.sendFile(path.join(__dirname, '..', 'client', 'html', 'callback.html'));
    });
    app.get('/game', function (req, res, next) {
        res.sendFile(path.join(__dirname, '..', 'client', 'html', 'game.html'));
    });

    // Start Node.js server
    server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

    // Create app for game websocket
    const wsApp = express();
    const wsServer = http.Server(wsApp);
    wsApp.use(cors());
    wsApp.use(express.json());

    // Listen on colyseus port
    wsServer.listen(WS_PORT, () => console.log(`Listening on ws://localhost:${WS_PORT}`));

    return { server, wsServer };
};
