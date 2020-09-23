var socket = io();
const FPS = 20; // Frames per second
const SPEED = 15; // # of pixels moved per frame
const SIZE = 30; // Size of player in pixels

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

function setup() {
    const urlParams = new URLSearchParams(window.location.search);
    const nickname = urlParams.get('nick');
    const authId = urlParams.get('auth');
    if (nickname === null || authId === null) {
        fail();
    }
    socket.emit('start', { authId, nickname });

    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('keydown', (event) => {
        keyList[event.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (event) => {
        keyList[event.key.toLowerCase()] = false;
    });

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

        setInterval(() => {
            var tempPlayer = { ...currPlayer };
            var change = false;
            if (keyList['w'] || keyList['arrowup']) {
                currPlayer.y -= SPEED;
                change = true;
            }
            if (keyList['s'] || keyList['arrowdown']) {
                currPlayer.y += SPEED;
                change = true;
            }
            if (keyList['a'] || keyList['arrowleft']) {
                currPlayer.x -= SPEED;
                change = true;
            }
            if (keyList['d'] || keyList['arrowright']) {
                currPlayer.x += SPEED;
                change = true;
            }

            // Check if player went out of bounds
            if (
                currPlayer.x < 0 ||
                currPlayer.x > board.w - SIZE ||
                currPlayer.y < 0 ||
                currPlayer.y > board.h - SIZE
            ) {
                currPlayer = tempPlayer;
                change = false;
            }

            if (change) {
                document.getElementById('coords').innerHTML = `(${currPlayer.x}, ${currPlayer.y})`;
                // TODO: Check if player walked into wall => change = false;
                // TODO: Add check if player stepped into vc :ooo
                socket.emit('move', currPlayer);
            }
        }, 1000 / FPS);
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
        x: canvas.width / 2,
        y: canvas.height / 2,
    };
    draw();
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function drawBackground() {
    gameObjects.forEach((obj) => {
        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.x - viewport.x, obj.y - viewport.y, obj.w, obj.h);
    });
}

function draw() {
    if (discordId === null) return;

    viewport = {
        x: currPlayer.x - center.x,
        y: currPlayer.y - center.y,
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    for (var i in lastPlayerState) {
        var p = lastPlayerState[i];

        ctx.fillStyle = '#' + p.color;
        ctx.fillRect(p.x - SIZE / 2 - viewport.x, p.y - SIZE / 2 - viewport.y, SIZE, SIZE);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.font = '20px sans-serif';
        ctx.fillText(p.nickname, p.x - viewport.x, p.y - 35 - viewport.y);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = '14px sans-serif';
        ctx.fillText(
            `${p.user.username}#${p.user.discriminator}`,
            p.x - viewport.x,
            p.y - 20 - viewport.y
        );
    }
}

function fail() {
    document.getElementById('canvas').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    setTimeout(() => {
        window.location = window.origin;
    }, 2000);
}
