const querystring = require('querystring');
const config = require('../config.json');
const { userInGuild } = require('./bot');
const { getAccessToken, getUserInfo } = require('./discord-api');

var authList = [];
var joinList = [];
var timeoutMap = {};
var discordList = {};
var socketList = {};
var players = {};
var count = 0;

module.exports = async (server) => {
    const io = require('socket.io')(server, {});

    io.sockets.on('connection', function (socket) {
        socket.on('client', async () => {
            count = 10;
            var authId = generateRandomString(16);
            authList.push(authId);

            timeoutMap[authId] = setTimeout(() => {
                const index = authList.indexOf(authId);
                if (index > -1) authList.splice(index, 1);
                delete timeoutMap[authId];
            }, 10000);

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
            if (authList.find((id) => id === data.authId) === undefined) {
                socket.emit('authFailed');
                return;
            }

            socket.emit('authSuccess');

            const tokens = await getAccessToken(data.code);
            const userInfo = await getUserInfo(tokens.access_token);
            if (discordList[userInfo.id] === undefined) {
                discordList[userInfo.id] = {
                    userInfo,
                    player: null,
                    authId: data.authId,
                };
                if (userInGuild(userInfo.id)) {
                    socket.emit('joined', { userInfo });
                } else {
                    socket.emit('toJoin');
                    joinList.push(data.authId);
                    timeoutMap[data.authId + 'j'] = setTimeout(() => {
                        const index = joinList.indexOf(data.authId);
                        if (index > -1) joinList.splice(index, 1);
                        delete timeoutMap[data.authId + 'j'];
                    }, 10000);
                }
            } else {
                if (players[userInfo.id] === undefined) {
                    socket.emit('joined', {
                        userInfo,
                        nickname: discordList[userInfo.id].player.nickname,
                    });
                } else {
                    socket.emit('playing');
                }
            }
        });

        socket.on('callbackFailed', (authId) => {
            const index = authList.indexOf(authId);
            if (index > -1) authList.splice(index, 1);
            delete timeoutMap[authId];
        });

        // console.log('user connected!');

        // socket.id = count++;
        // players[socket.id] = {
        //     x: 500,
        //     y: 500,
        //     color: randInt(0, 16777215).toString(16).padStart(6, '0'),
        // };
        // socketList[socket.id] = socket;
        // socket.emit('start', { socketId: socket.id, players });

        // socket.on('move', (movedPlayer) => {
        //     players[socket.id] = movedPlayer;
        //     io.emit('update', players);
        // });

        // socket.on('disconnect', () => {
        //     delete socketList[socket.id];
        //     delete players[socket.id];
        //     io.emit('update', players);
        //     console.log('user disconnected!');
        // });
    });
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
var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
