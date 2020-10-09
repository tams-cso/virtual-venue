const FPS = 25; // Frames per second
const SPEED = 16; // # of pixels moved per frame
const SIZE = 32; // Size of player in pixels

var cookies = new UniversalCookie();
var socket = io();

var keyList = {};
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var currPlayer;
var lastPlayerState;
var discordId = null;
var gameObjects;
var board = { w: 0, h: 0 };
var viewport = { x: 0, y: 0 };
var center = { x: 0, y: 0 };
var inVc = false;

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

// If the authId check failed and tell user login failed
socket.on('checkFail', fail);

// Run when the game loads
socket.on('load', (data) => {
    // Keydown listener
    window.addEventListener('keydown', (event) => {
        keyList[event.key.toLowerCase()] = true;
    });

    // Keyup listener
    window.addEventListener('keyup', (event) => {
        keyList[event.key.toLowerCase()] = false;
    });

    // Show canvas
    document.getElementById('pregame').style.display = 'none';
    document.getElementById('canvas').style.display = 'block';
    document.getElementById('coords').style.display = 'block';

    // Save the loaded variables
    gameObjects = data.gameObjects;
    discordId = data.discordId;
    currPlayer = data.players[discordId];
    lastPlayerState = data.players;
    board = data.boardSize;

    // Resize the canvas and add listener for resize
    resize();
    window.addEventListener('resize', resize);

    // Set game loop
    setInterval(loop, 1000 / FPS);
});

// Run when the game updates
socket.on('update', (players) => {
    if (discordId !== null) {
        currPlayer = players[discordId];
        lastPlayerState = players;
        draw();
    }
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

function loop() {
    var tempPlayer = { ...currPlayer };
    var change = false;
    if (keyList['w'] || keyList['arrowup']) {
        currPlayer.y -= SPEED * (keyList['shift'] ? 2 : 1);
        change = true;
    }
    if (keyList['s'] || keyList['arrowdown']) {
        currPlayer.y += SPEED * (keyList['shift'] ? 2 : 1);
        change = true;
    }
    if (keyList['a'] || keyList['arrowleft']) {
        currPlayer.x -= SPEED * (keyList['shift'] ? 2 : 1);
        change = true;
    }
    if (keyList['d'] || keyList['arrowright']) {
        currPlayer.x += SPEED * (keyList['shift'] ? 2 : 1);
        change = true;
    }

    if (change) {
        // // Check if player out of bounds
        // if (
        //     currPlayer.x < 0 ||
        //     currPlayer.x > board.w - SIZE ||
        //     currPlayer.y < 0 ||
        //     currPlayer.y > board.h - SIZE
        // ) {
        //     currPlayer = { ...tempPlayer };
        //     return;
        // }

        // // Check if player ran into wall
        // var bounds = [
        //     { x: currPlayer.x, y: currPlayer.y },
        //     { x: currPlayer.x + SIZE, y: currPlayer.y },
        //     { x: currPlayer.x, y: currPlayer.y + SIZE },
        //     { x: currPlayer.x + SIZE, y: currPlayer.y + SIZE },
        // ];
        // gameObjects.forEach((obj) => {
        //     if (obj.type == 'wall') {
        //         bounds.forEach((b) => {
        //             if (b.x > obj.x && b.x < obj.x + obj.w && b.y > obj.y && b.y < obj.y + obj.h) {
        //                 currPlayer = { ...tempPlayer };
        //                 return;
        //             }
        //         });
        //     }
        // });

        var currVcState = false;
        gameObjects.forEach((obj) => {
            if (obj.type == 'vc') {
                bounds.forEach((b) => {
                    if (b.x > obj.x && b.x < obj.x + obj.w && b.y > obj.y && b.y < obj.y + obj.h) {
                        if (!inVc) {
                            socket.emit('joinVc', { id: currPlayer.user.id, vc: obj.vcName });
                            inVc = true;
                        }
                        currVcState = true;
                    }
                });
            }
        });

        if (inVc && !currVcState) {
            socket.emit('leaveVc', currPlayer.user.id);
            inVc = false;
        }

        // Update coords and server
        document.getElementById('coords').innerHTML = `(${currPlayer.x}, ${currPlayer.y})`;
        socket.emit('move', currPlayer);
    }
}

socket.on('successVc', () => {
    console.log("JOINED VC!!!");
});

socket.on('failVc', () => {
    // TODO: kick them out?
    console.log(":(");
});

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function drawBackground() {
    gameObjects.forEach((obj) => {
        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.x - viewport.x, obj.y - viewport.y, obj.w, obj.h);

        if (obj.type == 'vc') {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#000000';
            ctx.font = '30px cursive';
            ctx.fillText(
                obj.vcName,
                obj.x + obj.w / 2 - viewport.x,
                obj.y + obj.h / 2 - viewport.y
            );
        }
    });
}

function draw() {
    if (discordId === null) return;

    viewport = {
        x: Math.max(currPlayer.x - center.x, 0),
        y: Math.max(currPlayer.y - center.y, 0),
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    for (var i in lastPlayerState) {
        var p = lastPlayerState[i];

        ctx.fillStyle = '#' + p.color;
        ctx.fillRect(p.x - viewport.x, p.y - viewport.y, SIZE, SIZE);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.font = '20px sans-serif';
        ctx.fillText(p.nickname, p.x + SIZE / 2 - viewport.x, p.y + SIZE / 2 - 35 - viewport.y);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = '14px sans-serif';
        ctx.fillText(
            `${p.user.username}#${p.user.discriminator}`,
            p.x + SIZE / 2 - viewport.x,
            p.y + SIZE / 2 - 20 - viewport.y
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
