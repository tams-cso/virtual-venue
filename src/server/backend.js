const querystring = require('querystring');
const config = require('../config.json');
const { getAccessToken, getUserInfo } = require('./discord-api');

var authMap = {};
var joinMap = {};
var timeoutMap = {};
var discordList = {};
var socketList = {};
var players = {};
const TIMEOUT_MAX = 600000; // 10 minutes

const run = async (server) => {
    const io = require('socket.io')(server, {});

    io.sockets.on('connection', function (socket) {
        socket.on('client', async () => {
            count = 10;
            var authId = generateRandomString(16);
            authMap[authId] = socket;

            timeoutMap[authId] = setTimeout(() => {
                delete authMap[authId];
                delete timeoutMap[authId];
            }, TIMEOUT_MAX);

            var redirect =
                'https://discord.com/api/oauth2/authorize?' +
                querystring.stringify({
                    client_id: config.clientId,
                    redirect_uri: config.redirectUri,
                    response_type: 'code',
                    scope: 'identify',
                    state: authId,
                });

            socket.emit('authStart', { authId, redirect });
        });

        socket.on('callback', async (data) => {
            if (Object.keys(authMap).find((id) => id === data.authId) === undefined) {
                socket.emit('authFailed');
                return;
            }

            socket.emit('authSuccess');

            const tokens = await getAccessToken(data.code);
            const userInfo = await getUserInfo(tokens.access_token);
            const { userInGuild } = require('./bot');
            if (discordList[userInfo.id] === undefined) {
                discordList[userInfo.id] = {
                    userInfo,
                    player: null,
                    authId: data.authId,
                };
                if (userInGuild(userInfo.id)) {
                    authMap[data.authId].emit('joined', { userInfo });
                } else {
                    authMap[data.authId].emit('toJoin', config.serverUrl);
                    joinMap[userInfo.id] = data.authId; // TODO: Check if the user is already in the joinlist
                    timeoutMap[userInfo.id] = setTimeout(() => {
                        delete joinMap[userInfo.id];
                        delete timeoutMap[userInfo.id];
                    }, TIMEOUT_MAX);
                }
            } else {
                if (players[userInfo.id] === undefined) {
                    authMap[data.authId].emit('joined', {
                        userInfo,
                        nickname: discordList[userInfo.id].player.nickname,
                    });
                } else {
                    authMap[data.authId].emit('playing');
                }
            }
        });

        socket.on('callbackFailed', (authId) => {
            delete authMap[authId];
            delete timeoutMap[authId];
        });

        socket.on('start', (data) => {
            if (Object.keys(authMap).find((key) => key === data.authId) === undefined) {
                socket.emit('failLoad');
                return;
            }

            delete authMap[data.authId];

            const discordObject = Object.values(discordList).find(
                (obj) => obj.authId === data.authId
            );

            discordObject.authId = null;

            var tempPlayer;
            if (discordObject.player === null) {
                tempPlayer = {
                    x: config.start.x,
                    y: config.start.y,
                    color: randInt(0, 16777215).toString(16).padStart(6, '0'),
                    nickname: data.nickname,
                    user: discordObject.userInfo,
                };
                discordList[discordObject.userInfo.id].player = tempPlayer;
            } else {
                tempPlayer = discordObject.player;
            }

            players[discordObject.userInfo.id] = tempPlayer;

            socket.id = discordObject.userInfo.id;
            socketList[socket.id] = socket;

            console.log(
                `${discordObject.userInfo.username} #${discordObject.userInfo.discriminator} joined the game!`
            );

            io.emit('update', players);

            socket.emit('load', { discordId: discordObject.userInfo.id, players });
        });

        socket.on('move', (movedPlayer) => {
            players[socket.id] = movedPlayer;
            io.emit('update', players);
        });

        socket.on('disconnect', () => {
            if (Object.keys(players).find((key) => key === socket.id) === undefined) return;

            const discordObject = discordList[socket.id];
            console.log(
                `${discordObject.userInfo.username} #${discordObject.userInfo.discriminator} left the game`
            );

            discordList[socket.id].player = players[socket.id];
            delete socketList[socket.id];
            delete players[socket.id];
            io.emit('update', players);
        });
    });
};

const joinCallback = async (id) => {
    var joinMember = Object.keys(joinMap).find((user) => user === id);
    if (joinMember === undefined) return;

    authMap[joinMap[id]].emit('joined', { userInfo: discordList[id].userInfo });
    delete joinMap[id];
    clearTimeout(timeoutMap[id]);
    delete timeoutMap[id];
};

/**
 * Generates a random number in the range [min,max)
 * @param {number} min
 * @param {number} max
 */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
function generateRandomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

module.exports = { run, joinCallback };
