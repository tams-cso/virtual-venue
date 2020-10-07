var socket = io();
const FPS = 25; // Frames per second
const SPEED = 16; // # of pixels moved per frame
const SIZE = 32; // Size of player in pixels
const WS_PORT = 2567;

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

function setup() {
    const urlParams = new URLSearchParams(window.location.search);
    const nickname = urlParams.get('nick');
    const authId = urlParams.get('auth');
    if (nickname === null || authId === null) {
        fail();
    }

    var client = new Colyseus.Client(location.protocol.replace("http", "ws") + "//" + host + ":" + WS_PORT);
    socket.emit('start', { authId, nickname });

    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('keydown', (event) => {
        keyList[event.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (event) => {
        keyList[event.key.toLowerCase()] = false;
    });

    client.joinOrCreate('virtual-venue').then((room) => {
        console.log("joined");
        room.onStateChange.once(function(state) {
            console.log("Initial room state: " + state);
        });

        room.onStateChange(function(state) {  
            // THis signal trigged on each patch
        })

        room.onMessage("update", function(message) {
            var p = document.createElement("p");
            p.innerText = message;
            document.querySelector("#messages").appendChild(p);
        });
    })

    socket.on('update', (players) => {
        if (discordId !== null) {
            currPlayer = players[discordId];
            lastPlayerState = players;
            draw();
        }
    });

    socket.on('load', (data) => {
        gameObjects = data.gameObjects;
        discordId = data.discordId;
        currPlayer = data.players[discordId];
        lastPlayerState = data.players;
        board = data.boardSize;
        draw();

        setInterval(loop, 1000 / FPS);
    });

    socket.on('failLoad', () => {
        fail();
    });
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
        // Check if player out of bounds
        if (
            currPlayer.x < 0 ||
            currPlayer.x > board.w - SIZE ||
            currPlayer.y < 0 ||
            currPlayer.y > board.h - SIZE
        ) {
            currPlayer = { ...tempPlayer };
            return;
        }

        // Check if player ran into wall
        var bounds = [
            { x: currPlayer.x, y: currPlayer.y },
            { x: currPlayer.x + SIZE, y: currPlayer.y },
            { x: currPlayer.x, y: currPlayer.y + SIZE },
            { x: currPlayer.x + SIZE, y: currPlayer.y + SIZE },
        ];
        gameObjects.forEach((obj) => {
            if (obj.type == 'wall') {
                bounds.forEach((b) => {
                    if (b.x > obj.x && b.x < obj.x + obj.w && b.y > obj.y && b.y < obj.y + obj.h) {
                        currPlayer = { ...tempPlayer };
                        return;
                    }
                });
            }
        });

        // Check if player is in VC
        // TODO

        // Update coords and server
        document.getElementById('coords').innerHTML = `(${currPlayer.x}, ${currPlayer.y})`;
        socket.emit('move', currPlayer);
    }
}

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
            ctx.fillText(obj.vcName, obj.x + obj.w / 2 - viewport.x, obj.y + obj.h / 2 - viewport.y);
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
    document.getElementById('canvas').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    setTimeout(() => {
        window.location = window.origin;
    }, 1250);
}
