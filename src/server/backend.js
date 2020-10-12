const querystring = require('querystring');
const { getAccessToken, getUserInfo } = require('./discord-api');
const config = require('./Config');
const gameObjects = require('../gameObjects.json');
const bot = require('./bot');

var authMap = {};
var joinMap = {};
var timeoutMap = {};
var discordList = {};
var players = {};
var moveList = {};
var socketList = {};
var mainLoopTimer;
var io;

const TIMEOUT_MAX = 600000; // 10 minutes
const FPS = 25; // Frames per second
const SIZE = 32; // Size of player in pixels
const SPEED = 16; // # of pixels moved per frame

const run = async (server) => {
    io = require('socket.io')(server, {});

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
            const { userInGuild, joinVc } = require('./bot');

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
            if (discordList[saveId].player != null) nickname = discordList[saveId].player.nickname;

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
                    nickname: data.nick,
                    user: discordObject.userInfo,
                    inVc: false,
                };
                discordList[discordObject.userInfo.id].player = tempPlayer;
            } else {
                tempPlayer = discordObject.player;
                tempPlayer.nickname = data.nick;
            }

            // Add the player to the players list
            players[discordObject.userInfo.id] = tempPlayer;

            // Set the socket ID and add to socket list
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

            // Tell everyone that someone joined
            io.emit('playerJoin', tempPlayer);
        });

        // When player moves
        socket.on('move', (move) => {
            moveList[move.id] = move;
        });

        // When the player disconnects from the socket
        socket.on('disconnect', () => {
            if (Object.keys(players).find((key) => key === socket.id) === undefined) return;

            const discordObject = discordList[socket.id];
            console.log(
                `${discordObject.userInfo.username} #${discordObject.userInfo.discriminator} left the game`
            );

            discordList[socket.id].player = players[socket.id];
            delete players[socket.id];
            io.emit('playerLeave', socket.id);
        });
    });

    // Create main game loop
    // TOOD: Stop timeout if no one is left on the server
    mainLoopTimer = setInterval(gameLoop, 1000 / FPS);
};

const gameLoop = () => {
    // Return if movelist empty
    if (Object.keys(moveList).length === 0) return;

    // Create temp moveList and clear curr movelist
    var currMoveList = { ...moveList };
    moveList = {};

    // Loop through movelist
    for (var i in currMoveList) {
        var currMove = currMoveList[i];
        var currPlayer = players[i];
        var tempPlayer = { x: currPlayer.x, y: currPlayer.y };

        // Move player
        currPlayer.x += currMove.dx * SPEED;
        currPlayer.y += currMove.dy * SPEED;

        // Check if player out of bounds
        if (
            currPlayer.x < 0 ||
            currPlayer.x > config.boardSize.w - SIZE ||
            currPlayer.y < 0 ||
            currPlayer.y > config.boardSize.h - SIZE
        ) {
            currPlayer.x = tempPlayer.x;
            currPlayer.y = tempPlayer.y;
            delete currMoveList[i];
            continue;
        }

        // Find player's 4 corners
        const bounds = [
            { x: currPlayer.x, y: currPlayer.y },
            { x: currPlayer.x + SIZE, y: currPlayer.y },
            { x: currPlayer.x, y: currPlayer.y + SIZE },
            { x: currPlayer.x + SIZE, y: currPlayer.y + SIZE },
        ];

        // Get collisions
        var collision = checkWallAndVc(currPlayer, bounds);

        // If hit wall continue
        if (collision.wall) {
            currPlayer.x = tempPlayer.x;
            currPlayer.y = tempPlayer.y;
            delete currMoveList[i];
            continue;
        }

        // Leave VC if in one and left area
        if (currPlayer.inVc && !collision.vc) {
            bot.leaveVc(currPlayer.user.id);
            currPlayer.inVc = false;
        }

        // Update player in the list
        players[i] = currPlayer;
    }

    // Update clients
    io.emit('update', currMoveList);
};

// Check if player ran into wall or is in VC!
// Returns 2 values: wall and vc, both booleans
function checkWallAndVc(currPlayer, bounds) {
    var out = { wall: false, vc: false };
    gameObjects.forEach((obj) => {
        bounds.forEach((b) => {
            if (b.x > obj.x && b.x < obj.x + obj.w && b.y > obj.y && b.y < obj.y + obj.h) {
                if (obj.type === 'wall') {
                    out.wall = true;
                } else if (obj.type === 'vc') {
                    if (!currPlayer.inVc) {
                        playerJoinVc(currPlayer.user.id, obj.vcName);
                        currPlayer.inVc = true;
                    }
                    out.vc = true;
                }
            }
        });
    });
    return out;
}

async function playerJoinVc(id, vc) {
    const good = await bot.joinVc(id, vc);
    if (good) socketList[id].emit('successVc');
    else socketList[id].emit('nullVc');
}

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
