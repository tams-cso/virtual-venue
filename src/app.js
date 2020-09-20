const express = require('express');
const app = express();
const server = require('http').Server(app);
// const io = require('socket.io')(server, {});
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const PORT = 8082;

app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

client.on('ready', () => console.log(`Logged in as ${client.user.tag}`));

// Login with the bot token provided in creds.json
client.login(config.botToken).then(() => {
    // Virtual Venue only currently supports one Discord server at a time
    if (client.guilds.cache.size > 1) {
        console.error('ERROR: Bot in more than 1 server :(');
        process.exit(-1);
    }

    var channels = client.guilds.cache.values().next().value.channels;
    var gameCat = channels.cache
        .filter((channel) => channel.type === 'category')
        .find((channel) => channel.name === config.gameCategoryName);
    if (gameCat === undefined) {
        channels.create(config.gameCategoryName, { type: 'category' }).then((gameCat) => {
            channels.create('main', { type: 'text', parent: gameCat });
            config.vcs.forEach((data) => {
                channels.create(data.name, { type: 'text', parent: gameCat });
            });
        });
    } else {
        channels.cache.forEach((value, key) => {
            if (value.parentID === gameCat.id) {
                value.delete();
            }
        });
        channels.create('main', { type: 'text', parent: gameCat });
        config.vcs.forEach((data) => {
            channels.create(data.name, { type: 'text', parent: gameCat });
        });
    }
});

client.on('message', (message) => {});

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
