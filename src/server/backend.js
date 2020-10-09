const querystring = require('querystring');
const { getAccessToken, getUserInfo } = require('./discord-api');
const config = require('../config.json');
const gameObjects = require('../gameObjects.json');

var authMap = {};
var joinMap = {};
var timeoutMap = {};
var discordList = {};
var socketList = {};
var players = {};
const TIMEOUT_MAX = 600000; // 10 minutes

const run = async (server, gameServer) => {
    const io = require('socket.io')(server, {});

    io.sockets.on('connection', function (socket) {
        // When client login loads
        socket.on('client', async () => {
            // Generate random string and store in authMap
            var authId = generateRandomString(16);
            authMap[authId] = socket;

            // Set timeout to delete the authId after time
            // Store that timer in the timeoutMap
            timeoutMap[authId] = setTimeout(() => {
                delete authMap[authId];
                clearTimeout(timeoutMap[authId]);
                delete timeoutMap[authId];
            }, TIMEOUT_MAX);

            // Create the redirect url to the discord auth API
            var redirect =
                'https://discord.com/api/oauth2/authorize?' +
                querystring.stringify({
                    client_id: config.clientId,
                    redirect_uri: config.redirectUri,
                    response_type: 'code',
                    scope: 'identify',
                    state: authId,
                });

            // Emit authStart with the authId and redirect URI
            socket.emit('authStart', { authId, redirect });
        });

        // After discord passes back the accessToken
        socket.on('callback', async (data) => {
            // If the user is NOT in the authMap, return authFailed
            if (Object.keys(authMap).find((id) => id === data.authId) === undefined) {
                socket.emit('authFailed');
                return;
            }

            // If the authId is found, emit to the success endpoint
            socket.emit('authSuccess');

            // Get the tokens and userInfo from the Discord API
            const tokens = await getAccessToken(data.code);
            const userInfo = await getUserInfo(tokens.access_token);

            // Get the function from the bot
            const { userInGuild } = require('./bot');

            // If the user is NOT in the discordList
            if (discordList[userInfo.id] === undefined) {
                // Create a new object to add to the discordList
                discordList[userInfo.id] = {
                    userInfo,
                    player: null,
                    authId: data.authId,
                };

                // Check if the user is in the guild
                if (userInGuild(userInfo.id)) {
                    // Return userInfo if already in guild
                    authMap[data.authId].emit('joined', { userInfo });
                } else {
                    // Redirect the user to the join server page
                    authMap[data.authId].emit('toJoin', config.serverUrl);

                    // Add the user to the joinMap for the bot to check
                    joinMap[userInfo.id] = data.authId; // TODO: Check if the user is already in the joinlist

                    // Set a timer to delete the user from the joinMap after time,
                    // also adding that to the timeoutMap
                    timeoutMap[userInfo.id] = setTimeout(() => {
                        delete joinMap[userInfo.id];
                        clearTimeout(timeoutMap[userInfo.id]);
                        delete timeoutMap[userInfo.id];
                    }, TIMEOUT_MAX);
                }
                // If already in the discordList
            } else {
                // Set the authId
                discordList[userInfo.id].authId = data.authId;

                // Check if the user is already playing a game
                if (players[userInfo.id] === undefined) {
                    // If not, emit joined
                    authMap[data.authId].emit('joined');
                } else {
                    // If the player is already in a game, emit playing with the discord tag
                    authMap[data.authId].emit(
                        'playing',
                        `${userInfo.username}#${userInfo.discriminator}`
                    );
                }
            }
        });

        // If callback fails because of invalid cookies,
        // delete the id from the authMap
        socket.on('callbackFailed', (authId) => {
            delete authMap[authId];
            clearTimeout(timeoutMap[authId]);
            delete timeoutMap[authId];
        });

        // When user loads game page; check before pregame loads
        socket.on('check', (authId) => {
            if (Object.keys(authMap).find((key) => key === authId) === undefined) {
                socket.emit('checkFail');
                return;
            }

            // Remove the authId from the map
            delete authMap[authId];
            clearTimeout(timeoutMap[authId]);
            delete timeoutMap[authId];

            // Send client userInfo and nickname if not null
            const userInfo = Object.values(discordList).find((obj) => obj.authId === authId)
                .userInfo;

            // Get nickname if discordList has player
            var nickname = null;
            if (discordList[userInfo.id].player != null)
                nickname = discordList[userInfo.id].player.nickname;

            // Emit success with userInfo and nickname
            socket.emit('checkSuccess', { userInfo, nickname });
        });

        // Check if the user has a pre-saved instance
        socket.on('checkSaveId', (saveId) => {
            // Check if the saveId is in the discord list and return if not
            if (Object.keys(discordList).find((key) => key === saveId) === undefined) {
                socket.emit('invalidSaveId');
                return;
            }

            // Get nickname if discordList has player
            var nickname = null;
            if (discordList[userInfo.id].player != null)
                nickname = discordList[userInfo.id].player.nickname;

            // Send success message to user
            socket.emit('checkSuccess', { userInfo: discordList[saveId].userInfo, nickname });
        });

        // When client is ready to join game
        socket.on('start', (data) => {
            // Get the user from the discordList using discordId
            const discordObject = discordList[data.discordId];

            // Get the player object or create a new one at starting location
            // Randomize the color TOOD: Player color selector?
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
                tempPlayer.nickname = data.nickname;
            }

            // Add the player to the players list
            players[discordObject.userInfo.id] = tempPlayer;

            // Set the socket id to the socketlist and add it to the socketList
            socket.id = discordObject.userInfo.id;
            socketList[socket.id] = socket;

            // Log the discord tag of the user who joined the game
            console.log(
                `${discordObject.userInfo.username} #${discordObject.userInfo.discriminator} joined the game!`
            );

            // Send game loaded signal to the client with lots of info + the game objects
            socket.emit('load', {
                discordId: discordObject.userInfo.id,
                players,
                gameObjects,
                boardSize: config.boardSize,
            });

            // Update all players with the addition of the new player to the room
            io.emit('update', players);
        });

        // When player moves TOOD: convert to gameserver
        socket.on('move', (movedPlayer) => {
            players[socket.id] = movedPlayer;
            io.emit('update', players);
        });

        // When the player disconnects from the socket
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

    // Create ws for game
    const io2 = require('socket.io')(gameServer, {});
};

// Callback function that's called when the bot detects a new user joining the guild
const joinCallback = async (id) => {
    // Checks if the user is in the joinMap -> return if not
    var joinMember = Object.keys(joinMap).find((user) => user === id);
    if (joinMember === undefined) return;

    // Emit joined to the client's socket
    authMap[joinMap[id]].emit('joined', { userInfo: discordList[id].userInfo });

    // Remove user from joinMap and timeoutMap
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
