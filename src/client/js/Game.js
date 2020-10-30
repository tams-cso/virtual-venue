var cookies = new UniversalCookie();
var socket = io();

var keyList = {};
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var playerList = {};
var discordId = null;
var gameObjects;
var board = { w: 0, h: 0 };
var viewport = { x: 0, y: 0 };
var center = { x: 0, y: 0 };
var movements = {};
var notInGame = true;
var joinQueue = null;
var messageKey = 0;

const FPS = 18; // Frames per second
const GRID = 32; // Grid size - pixel to coordinate square ratio
const SIZE = GRID; // Size of player in pixels

// When the page loads
function getLogin() {
    // Get the authId & remove cookie
    var authId = cookies.get('authId');
    var saveId = cookies.get('saveId');

    // If doesn't exist, redirect to login
    // TODO: Add saving discord ID for fast join
    if (authId === undefined && saveId === undefined) fail();

    // Check save id if it exists
    if (saveId !== undefined) {
        socket.emit('checkSaveId', saveId);
        return;
    }

    // Send authId to the server to check + remove them from cookies
    cookies.remove('authId');
    socket.emit('check', authId);
}

// If the save ID was not in the server discordList
socket.on('invalidSaveId', () => {
    // Invalid saveId
    cookies.remove('saveId');

    // Get and remove authId from cookies
    var authId = cookies.get('authId');
    cookies.remove('authId');

    // If no authId stored, redirect
    if (authId === undefined) fail();

    // Send authId to server to check
    socket.emit('check', authId);
});

// If the authId was successful upon get
socket.on('checkSuccess', (data) => {
    // Save the discordId
    discordId = data.userInfo.id;

    // Create save cookies
    cookies.set('saveId', discordId);

    // Set the avatar, username, and discriminator
    document.getElementById('loading').style.display = 'none';
    document.getElementById('pregame').style.display = 'block';
    document.getElementById(
        'avatar'
    ).src = `https://cdn.discordapp.com/avatars/${data.userInfo.id}/${data.userInfo.avatar}.png`;
    document.getElementById('username').innerHTML = data.userInfo.username;
    document.getElementById('discriminator').innerHTML = '# ' + data.userInfo.discriminator;

    // Set nickname to input if not null
    if (data.nickname != null && data.nickname != undefined) {
        document.getElementById('nick-input').value = data.nickname;
    }

    // Listen for enter in text field
    document.getElementById('nick-input').addEventListener('keydown', (event) => {
        // If user clicked enter, enter the game
        if (event.key === 'Enter') enterGame();
    });
});

function enterGame() {
    // Get the nickname and check that it isn't empty
    var nick = document.getElementById('nick-input').value;
    if (nick === '') {
        // If it's empty, update the placeholder with a message
        document.getElementById('nick-input').placeholder = 'Enter a nickname...';
        return;
    }

    // Tell the server that the client is ready to start the game
    socket.emit('start', { nick, discordId });
}

// If the authId check failed and tell user login failed
socket.on('checkFail', fail);

// Run when the game loads
socket.on('load', (data) => {
    // Show canvas
    document.getElementById('pregame').style.display = 'none';
    document.getElementById('canvas').style.display = 'block';
    document.getElementById('coords').style.display = 'block';

    // Save the loaded variables
    gameObjects = data.gameObjects;
    discordId = data.discordId;
    playerList = data.players;
    board = data.boardSize;
    notInGame = false;

    // Resize the canvas (with drawing) and add listener for resize
    resize();
    window.addEventListener('resize', resize);

    // Keydown listener
    window.addEventListener('keydown', (event) => {
        movements[event.key.toLowerCase()] = true;
        // lastMove = (new Date()).getTime();
    });

    // Keyup listener
    window.addEventListener('keyup', (event) => {
        movements[event.key.toLowerCase()] = false;
    });

    // Stop if window loses focus
    window.onblur = () => {
        movements = {};
    };

    // Movement loop
    setInterval(moveStuff, 1000 / FPS);
});

// Run when the game updates
socket.on('update', (move) => {
    if (notInGame) return;

    // Update if not this player
    if (move.id !== discordId) {
        playerList[move.id].x += move.dx;
        playerList[move.id].y += move.dy;
    }

    // Update coords
    document.getElementById(
        'coords'
    ).innerHTML = `(${playerList[discordId].x}, ${playerList[discordId].y})`;

    draw();
});

// Function to keep the canvas centered and fullscreened
// and is called whenever the viewport size changes
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    center = {
        x: canvas.width / 2.0,
        y: canvas.height / 2.0,
    };
    draw();
}

socket.on('successVc', () => {
    document.getElementById('system-messages').style.display = 'block';
    document.getElementById('system-messages').innerHTML = "Joined VC successfully!";
    messageKey = 5;
    setTimeout(() => {
        if (messageKey === 5) {
            document.getElementById('system-messages').style.display = 'none';
            messageKey = 0;
        }
    }, 1000);
});

socket.on('failVc', () => {
    document.getElementById('system-messages').style.display = 'block';
    document.getElementById('system-messages').innerHTML =
        '<div style="color:red">You must be connected to the main VC to join!</div>';
    messageKey = 4;
    setTimeout(() => {
        if (messageKey === 4) {
            document.getElementById('system-messages').style.display = 'none';
            messageKey = 0;
        }
    }, 1000);
});

function moveStuff() {
    var moveObj = { id: discordId, dx: 0, dy: 0 };

    // Move player
    if (movements['a'] || movements['arrowleft']) moveObj.dx = -1;
    else if (movements['d'] || movements['arrowright']) moveObj.dx = 1;
    if (movements['w'] || movements['arrowup']) moveObj.dy = -1;
    else if (movements['s'] || movements['arrowdown']) moveObj.dy = 1;

    // Get current player
    var currPlayer = playerList[discordId];

    // Save temp of player pos
    var oldPos = {
        x: currPlayer.x,
        y: currPlayer.y,
    };

    // Move player
    currPlayer.x += moveObj.dx;
    currPlayer.y += moveObj.dy;

    // Return if didn't move
    if (moveObj.dx === 0 && moveObj.dy === 0) return;

    // Check for out of bounds
    if (currPlayer.x < 0 || currPlayer.x > board.w || currPlayer.y < 0 || currPlayer.y > board.h) {
        currPlayer.x = oldPos.x;
        currPlayer.y = oldPos.y;
        return;
    }

    // Get collisions
    var collision = checkWallAndVc(currPlayer);

    // If hit wall return
    if (collision.wall) {
        currPlayer.x = oldPos.x;
        currPlayer.y = oldPos.y;
        return;
    }

    // Emit move to update everyone OwO
    socket.emit('move', moveObj);

    // Start join queue if player in vc and not in join queue or vc
    // TODO: Be able to move directly to another vc without going into main vc
    // TODO: Add callback for not in main vc
    if (joinQueue === null && collision.toJoin) {
        document.getElementById('system-messages').style.display = 'block';
        document.getElementById('system-messages').innerHTML = 'Joining VC in 3 seconds...'; // TODO: Make it countdown
        messageKey = 1;
        joinQueue = setTimeout(() => {
            socket.emit('joinVc', { id: currPlayer.user.id, vc: collision.toJoin });
            joinQueue = null;
            if (messageKey === 1) {
                document.getElementById('system-messages').style.display = 'none';
                messageKey = 0;
            }
        }, 3000);
        return;
    }

    // If in join queue and leaves room
    if (joinQueue !== null && !collision.vc) {
        clearTimeout(joinQueue);
        joinQueue = null;
        currPlayer.currVc = null;
        document.getElementById('system-messages').innerHTML =
            '<div style="color:red">Left VC join queue!</div>';
        messageKey = 2;
        setTimeout(() => {
            if (messageKey === 2) {
                document.getElementById('system-messages').style.display = 'none';
                messageKey = 0;
            }
        }, 1000);
        return;
    }

    // If user leaves room
    if (joinQueue === null && currPlayer.currVc !== null && !collision.vc) {
        socket.emit('leaveVc', currPlayer.user.id);
        currPlayer.currVc = null;
        document.getElementById('system-messages').style.display = 'block';
        document.getElementById('system-messages').innerHTML = 'Left vc';
        messageKey = 3;
        setTimeout(() => {
            if (messageKey === 3) {
                document.getElementById('system-messages').style.display = 'none';
                messageKey = 0;
            }
        }, 1000);
    }
}

// Check if player ran into wall or is in VC!
// Returns 2 values: wall and vc, both booleans
// TODO: Fix this documentation and add comments :|
function checkWallAndVc(p) {
    var out = { wall: false, vc: false, toJoin: null };
    gameObjects.forEach((obj) => {
        if (p.x >= obj.x && p.x < obj.x + obj.w && p.y >= obj.y && p.y < obj.y + obj.h) {
            if (obj.type === 'wall') {
                out.wall = true;
            } else if (obj.type === 'vc') {
                if (p.currVc !== obj.id && !out.vc) { // TODO: Fix this to check for multi-block vcs
                    out.toJoin = obj.vcId;
                    p.currVc = obj.id;
                }
                out.vc = true;
            }
        }
    });
    return out;
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function drawBackground() {
    gameObjects.forEach((obj) => {
        ctx.fillStyle = '#' + obj.color;
        ctx.fillRect(
            obj.x * GRID - viewport.x,
            obj.y * GRID - viewport.y,
            obj.w * GRID,
            obj.h * GRID
        );

        if (obj.type == 'vc') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#000000';
            ctx.font = '30px cursive'; // TODO: Might have to adjust for grid size
            ctx.fillText(
                obj.displayName,
                obj.x * GRID + (obj.w * GRID) / 2 - viewport.x,
                obj.y * GRID + (obj.h * GRID) / 2 - viewport.y
            );
        }
    });
}

function draw() {
    if (discordId === null) return;

    viewport = {
        x: Math.max(playerList[discordId].x * GRID - center.x, 0),
        y: Math.max(playerList[discordId].y * GRID - center.y, 0),
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    for (var i in playerList) {
        var p = playerList[i];

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(p.x * GRID - viewport.x, p.y * GRID - viewport.y, SIZE, SIZE);
        ctx.fillStyle = '#' + p.color;
        ctx.fillRect(p.x * GRID - viewport.x + 2, p.y * GRID - viewport.y + 2, SIZE - 4, SIZE - 4);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.font = '20px sans-serif';
        ctx.fillText(
            p.nickname,
            p.x * GRID + SIZE / 2 - viewport.x,
            p.y * GRID + SIZE / 2 - 35 - viewport.y
        );

        ctx.fillStyle = '#aaaaaa';
        ctx.font = '14px sans-serif';
        ctx.fillText(
            `${p.user.username}#${p.user.discriminator}`,
            p.x * GRID + SIZE / 2 - viewport.x,
            p.y * GRID + SIZE / 2 - 20 - viewport.y
        );
    }
}

function fail() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('canvas').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    setTimeout(() => {
        window.location = window.origin;
    }, 1250);
}

function logout() {
    cookies.remove('saveId');
    window.location = window.origin;
}

socket.on('playerLeave', (id) => {
    if (notInGame) return;
    delete playerList[id];
    draw();
});

socket.on('playerJoin', (player) => {
    if (notInGame) return;
    playerList[player.user.id] = player;
    draw();
});
