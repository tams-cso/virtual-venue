const express = require('express');
const path = require('path');
const http = require('http');

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
    server.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}!`));

    return server;
};
