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

    return server;
};
