const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {});

app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

server.listen(8080, () => console.log("Listening on port 8080!"));

io.sockets.on('connection', function(socket) {
    console.log('socket connected');
})