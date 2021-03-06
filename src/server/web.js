const express = require('express');
const path = require('path');
const http = require('http');
const PORT = 5000; // If not assigned a port in env

module.exports = () => {
    // Create app for main pagnation
    const app = express();
    const server = http.Server(app);

    // Serve client folder resources statically
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
    server.listen(process.env.PORT || PORT, () => console.log(`Listening on port ${process.env.PORT || PORT}!`));

    return server;
};
