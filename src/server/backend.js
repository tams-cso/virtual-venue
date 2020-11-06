const querystring = require('querystring');
const { getAccessToken, getUserInfo } = require('./discord-api');
const config = require('./Config');
const bot = require('./bot');
require('./GameObjects');

var gameObjects;
var boardParams;
var authMap = {};
var joinMap = {};
var timeoutMap = {};
var discordList = {};
var playerList = {};
var socketList = {};
var moveList = [];
var joinQueues = {};
var joinTimers = {};
var io;

const TIMEOUT_MAX = 600000; // 10 minutes
const FPS = 15; // Frames per second
const QUEUE_TIME = 2000;

const run = async (server, gameObjs, boardPar) => {
    gameObjects = gameObjs;
    boardParams = boardPar;

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

            // If the user is NOT in the discordList
            if (discordList[userInfo.id] === undefined) {
                // Create a new object to add to the discordList
                discordList[userInfo.id] = {
                    userInfo,
                    player: null,
                    authId: data.authId,
                };

                // Check if the user is in the guild
                if (bot.userInGuild(userInfo.id)) {
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
                if (playerList[userInfo.id] === undefined) {
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
            var color = randInt(0, 16777215).toString(16).padStart(6, '0');
            if (discordList[userInfo.id].player != null) {
                var currPlayer = discordList[userInfo.id].player;
                var nickname = currPlayer.nickname;
                var color = currPlayer.color;
            }

            // Emit success with userInfo and nickname
            socket.emit('checkSuccess', { userInfo, nickname, color });
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
            var color = randInt(0, 16777215).toString(16).padStart(6, '0');
            if (discordList[saveId].player != null) {
                nickname = discordList[saveId].player.nickname;
                color = discordList[saveId].player.color;
            }

            // Send success message to user
            socket.emit('checkSuccess', {
                userInfo: discordList[saveId].userInfo,
                nickname,
                color,
            });
        });

        // When client is ready to join game
        socket.on('start', (data) => {
            // Get the user from the discordList using discordId
            const discordObject = discordList[data.discordId];

            // Get the player object or create a new one at starting location
            var tempPlayer;
            if (discordObject.player === null) {
                tempPlayer = Player(
                    boardParams.start.x,
                    boardParams.start.y,
                    data.nick,
                    data.color,
                    discordObject.userInfo
                );
                discordList[discordObject.userInfo.id].player = tempPlayer;
            } else {
                tempPlayer = discordObject.player;
                tempPlayer.nickname = data.nick;
                tempPlayer.color = data.color;
            }

            // Add the player to the players list
            playerList[discordObject.userInfo.id] = tempPlayer;

            // Set the socket ID and add to socket list; also instantiate other maps
            socket.id = discordObject.userInfo.id;
            socketList[socket.id] = socket;
            joinQueues[socket.id] = null;
            joinTimers[socket.id] = null;

            // Get curr datetime
            var dt = (new Date()).toISOString();

            // Log the discord tag of the user who joined the game
            console.log(
                `[${dt}] ${discordObject.userInfo.username} #${discordObject.userInfo.discriminator} joined the game!`
            );

            // Send game loaded signal to the client with lots of info + the game objects
            socket.emit('load', {
                discordId: discordObject.userInfo.id,
                players: playerList,
                gameObjects,
                startLocation: boardParams.start,
                boardSize: boardParams.boardSize,
            });

            // Tell everyone that someone joined
            io.emit('playerJoin', tempPlayer);
        });

        // When player sends list of moves, split into x and y components
        socket.on('move', (newMove) => {
            if (newMove.dx !== 0) moveList.push({ id: newMove.id, dx: newMove.dx, dy: 0 });
            if (newMove.dy !== 0) moveList.push({ id: newMove.id, dy: newMove.dy, dx: 0 });
        });

        // When the player disconnects from the socket
        socket.on('disconnect', () => {
            if (Object.keys(playerList).find((key) => key === socket.id) === undefined) return;

            // Get curr datetime
            var dt = (new Date()).toISOString();

            const discordObject = discordList[socket.id];
            console.log(
                `[${dt}] ${discordObject.userInfo.username} #${discordObject.userInfo.discriminator} left the game`
            );

            discordList[socket.id].player = playerList[socket.id];
            io.emit('playerLeave', socket.id, playerList[socket.id].user);
            delete playerList[socket.id];
            delete socketList[socket.id];
            delete joinQueues[socket.id];
            delete joinTimers[socket.id];
        });
    });

    setInterval(updateLoop, 1000 / FPS); // TODO: Add break when no one is on;
};

const updateLoop = async () => {
    if (moveList.length === 0) return;

    for (var i = 0; i < moveList.length; i++) {
        var move = moveList[i];
        if (!canMoveAndMove(move)) {
            moveList.splice(i, 1);
            i--;
        }
    }

    io.emit('update', moveList);
    moveList = [];
};

function canMoveAndMove(moveObj) {
    // Get current player
    var currPlayer = playerList[moveObj.id];

    // Check to see if the player is valid or in a wack state
    if (currPlayer === undefined || currPlayer === null) {
        return false;
    }

    // Save temp of player pos
    var oldPos = {
        x: currPlayer.x,
        y: currPlayer.y,
    };

    // Move player
    if (moveObj.dx !== 0) currPlayer.x += moveObj.dx;
    else currPlayer.y += moveObj.dy;

    // Check for out of bounds
    if (
        currPlayer.x < 0 ||
        currPlayer.x > boardParams.boardSize.w ||
        currPlayer.y < 0 ||
        currPlayer.y > boardParams.boardSize.h
    ) {
        currPlayer.x = oldPos.x;
        currPlayer.y = oldPos.y;
        return false;
    }

    // Get collisions
    var collision = getCollisions(currPlayer);

    // If hit wall return
    if (collision.wall) {
        currPlayer.x = oldPos.x;
        currPlayer.y = oldPos.y;
        return false;
    }

    // VC join/leave
    if (collision.vc !== null) {
        if (joinQueues[moveObj.id] === null && currPlayer.currVc === null) {
            // Add player to queue if not in queue and not in vc
            joinQueue(moveObj.id, collision.vc);
        } else if (joinQueues[moveObj.id] !== null && joinQueues[moveObj.id] !== collision.vc) {
            // If in join queue and move to another vc, change join queues
            clearTimeout(joinTimers[moveObj.id]);
            joinQueue(moveObj.id, collision.vc);
        } else if (
            joinQueues[moveObj.id] === null &&
            currPlayer.currVc !== null &&
            currPlayer.currVc !== collision.vc
        ) {
            // If in vc and NOT joinQueue, add to join queue of new vc
            joinQueue(moveObj.id, collision.vc);
        }
    } else {
        if (joinQueues[moveObj.id] !== null) {
            // If player leaves room in queue, remove them from the queue
            clearTimeout(joinTimers[moveObj.id]);
            joinQueues[moveObj.id] = null;
            joinTimers[moveObj.id] = null;
            socketList[moveObj.id].emit('leaveVcQueue');
        } else if (currPlayer.currVc !== null) {
            // If the player leaves a vc
            bot.leaveVc(moveObj.id);
            currPlayer.currVc = null;
            socketList[moveObj.id].emit('leaveVc', moveObj.id);
        }
    }

    return true;
}

/**
 * Gets a list of collisions with game objects
 * @param {Player} p The player object
 * @returns {Collision} A collision object
 */
function getCollisions(p) {
    var out = { wall: false, vc: null };
    gameObjects.forEach((obj) => {
        if (p.x >= obj.x && p.x < obj.x + obj.w && p.y >= obj.y && p.y < obj.y + obj.h) {
            if (obj.type === 'wall') {
                out.wall = true;
            } else if (obj.type === 'vc') {
                out.vc = obj.vcId;
            }
        }
    });
    return out;
}

const joinQueue = (id, vc) => {
    joinQueues[id] = vc;
    joinTimers[id] = setTimeout(() => {
        joinVc(id);
    }, QUEUE_TIME);
    socketList[id].emit('startVcQueue', vc);
};

const joinVc = async (id) => {
    var vc = joinQueues[id];
    const good = await bot.joinVc(id, vc).catch(() => {
        // Return false if exception
        return false;
    });
    joinQueues[id] = null;
    joinTimers[id] = null;
    if (good) {
        playerList[id].currVc = vc;
        socketList[id].emit('successVc');
    } else {
        socketList[id].emit('failVc');
        playerList[id].x = boardParams.start.x;
        playerList[id].y = boardParams.start.y;
        io.emit('teleport', id);
    }
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

const moreGameObjects = async () => {
    var temp = require('./GameObjects')();
    gameObjects = temp.gameObjects;
    boardParams = temp.boardParams;
    io.emit('newGameObjects', {gameObjects, boardParams});
}

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

/**
 * Creates a player object
 * @param {number} x
 * @param {number} y
 * @param {string} nickname
 * @param {string} color
 * @param {object} user
 */
function Player(x, y, nickname, color, user) {
    return {
        x,
        y,
        color,
        nickname,
        user,
        currVc: null,
    };
}

module.exports = { run, joinCallback, moreGameObjects };

/**
 * @typedef {Object} Collision
 * @property {boolean} wall If object is in a wall
 * @property {string|null} vc Name of vc the player is in or null
 */
