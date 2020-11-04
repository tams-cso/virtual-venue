var cookies = new UniversalCookie();
var socket = io();

var keyList = {};
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var playerList = {};
var discordId = null;
var gameObjects;
var startLocation;
var board = { w: 0, h: 0 };
var viewport = { x: 0, y: 0 };
var center = { x: 0, y: 0 };
var movements = {};
var notInGame = true;
var joinQueue = null;
var messageKey = 0;
var joinMessage = null;
var joinMessageCount = 0;
var mainInterval = null;

const FPS = 20; // Frames per second
const GRID = 40; // Grid size - pixel to coordinate square ratio
const SIZE = GRID; // Size of player in pixels
const QUEUE_TIME = 2000; // The amount of time players have to wait before joining a queue

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
    document.getElementById('discriminator').innerHTML = '#' + data.userInfo.discriminator;

    // Set nickname to input if not null
    if (data.nickname != null && data.nickname != undefined) {
        document.getElementById('nick-input').value = data.nickname;
    }

    console.log(data);

    // Set the color that's auto-generated
    document.getElementById('color-input').value = `#${data.color}`;

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
        // If it's empty, update error message
        document.getElementById('error-message').innerHTML = 'Please enter a nickname';
        return;
    }

    // Get the color
    var color = document.getElementById('color-input').value.substring(1);
    console.log(color);

    // Tell the server that the client is ready to start the game
    socket.emit('start', { nick, color, discordId });
}

// If the authId check failed and tell user login failed
socket.on('checkFail', fail);

// Run when the game loads
socket.on('load', (data) => {
    // Show canvas
    document.getElementById('pregame').style.display = 'none';
    document.getElementById('canvas').style.display = 'block';
    document.getElementById('coords').style.display = 'block';
    document.getElementById('players').style.display = 'block';

    // Save the loaded variables
    gameObjects = data.gameObjects;
    startLocation = data.startLocation;
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

    // Update coords
    document.getElementById(
        'coords'
    ).innerHTML = `(${playerList[discordId].x}, ${playerList[discordId].y})`;

    // Set player count
    document.getElementById('players').innerHTML = `Players: ${Object.keys(playerList).length}`;

    // Movement loop
    mainInterval = setInterval(sendMoves, 1000 / FPS);
});

const sendMoves = () => {
    var moveObj = { id: discordId, dx: 0, dy: 0 };

    // Move player
    if (movements['a'] || movements['arrowleft']) moveObj.dx = -1;
    else if (movements['d'] || movements['arrowright']) moveObj.dx = 1;
    if (movements['w'] || movements['arrowup']) moveObj.dy = -1;
    else if (movements['s'] || movements['arrowdown']) moveObj.dy = 1;

    if (moveObj.dx === 0 && moveObj.dy === 0) return;

    socket.emit('move', moveObj);
};

// Run when the game updates
socket.on('update', (moveList) => {
    if (notInGame) return;

    moveList.forEach((move) => {
        playerList[move.id].x += move.dx;
        playerList[move.id].y += move.dy;
    });

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

socket.on('startVcQueue', (vcName) => {
    document.getElementById('system-messages').style.display = 'block';
    document.getElementById('system-messages').innerHTML = `Joining ${vcName} in 2 seconds...`; // TODO: Make it countdown
    messageKey = 1;
});

socket.on('leaveVcQueue', () => {
    clearTimeout(joinQueue);
    joinQueue = null;
    document.getElementById('system-messages').innerHTML =
        '<div style="color:red">Left VC join queue!</div>';
    messageKey = 2;
    setTimeout(() => {
        if (messageKey === 2) {
            document.getElementById('system-messages').style.display = 'none';
            messageKey = 0;
        }
    }, 1000);
});

socket.on('leaveVc', () => {
    document.getElementById('system-messages').style.display = 'block';
    document.getElementById('system-messages').innerHTML = 'Left all VCs';
    messageKey = 3;
    setTimeout(() => {
        if (messageKey === 3) {
            document.getElementById('system-messages').style.display = 'none';
            messageKey = 0;
        }
    }, 1000);
});

socket.on('successVc', () => {
    document.getElementById('system-messages').style.display = 'block';
    document.getElementById('system-messages').innerHTML = 'Joined VC successfully!';
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
    }, 5000);
});

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function drawBackground() {
    gameObjects.forEach((obj) => {
        // Skip if there is no color
        if (obj.color !== 'none') {
            // Check if the color is just 'solid'
            if (obj.color === 'solid') {
                ctx.fillStyle = '#444444';
            } else {
                // Or else get the actual color
                ctx.fillStyle = '#' + obj.color;
            }

            // Fill the rectangle with color
            ctx.fillRect(
                obj.x * GRID - viewport.x,
                obj.y * GRID - viewport.y,
                obj.w * GRID,
                obj.h * GRID
            );
        }

        // VCs and backgrounds have text
        if (obj.type === 'vc' || obj.type === 'background') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#444444';
            ctx.font = '28px Kalam';
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
        x: Math.min(
            Math.max(playerList[discordId].x * GRID - center.x, 0),
            (board.w + 1) * GRID - window.innerWidth
        ),
        y: Math.min(
            Math.max(playerList[discordId].y * GRID - center.y, 0),
            (board.h + 1) * GRID - window.innerHeight
        ),
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
        ctx.fillStyle = '#555555';
        ctx.font = '32px Kalam';
        ctx.fillText(
            p.nickname,
            p.x * GRID + SIZE / 2 - viewport.x,
            p.y * GRID + SIZE / 2 - 54 - viewport.y
        );

        ctx.fillStyle = '#777777';
        ctx.font = '20px Kalam';
        ctx.fillText(
            `${p.user.username}#${p.user.discriminator}`,
            p.x * GRID + SIZE / 2 - viewport.x,
            p.y * GRID + SIZE / 2 - 32 - viewport.y
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

socket.on('playerLeave', (id, userInfo) => {
    if (notInGame) return;
    document.getElementById('join-message').style.display = 'block';
    document.getElementById(
        'join-message'
    ).innerHTML = `${userInfo.username}#${userInfo.discriminator} left the game`;
    joinMessageCount++;
    var oldCount = joinMessageCount;
    joinMessage = setTimeout(() => {
        if (joinMessageCount === oldCount) {
            document.getElementById('join-message').style.display = 'none';
        }
    }, 4000);
    delete playerList[id];
    document.getElementById('players').innerHTML = `Players: ${Object.keys(playerList).length}`;
    draw();
});

socket.on('playerJoin', (player) => {
    if (notInGame) return;
    playerList[player.user.id] = player;
    var userInfo = playerList[player.user.id].user;
    document.getElementById('join-message').style.display = 'block';
    document.getElementById(
        'join-message'
    ).innerHTML = `${userInfo.username}#${userInfo.discriminator} joined the game`;
    joinMessageCount++;
    var oldCount = joinMessageCount;
    joinMessage = setTimeout(() => {
        if (joinMessageCount === oldCount) {
            document.getElementById('join-message').style.display = 'none';
        }
    }, 4000);
    document.getElementById('players').innerHTML = `Players: ${Object.keys(playerList).length}`;
    draw();
});

socket.on('disconnect', () => {
    document.getElementById('system-messages').style.display = 'block';
    document.getElementById('system-messages').innerHTML =
        '<div style="color:red;">Backend error :(( Please reload to rejoin</div>';
    clearInterval(mainInterval);
});

socket.on('teleport', (id) => {
    playerList[id].x = startLocation.x;
    playerList[id].y = startLocation.y;

    // Update coords
    document.getElementById(
        'coords'
    ).innerHTML = `(${playerList[discordId].x}, ${playerList[discordId].y})`;

    draw();
});
