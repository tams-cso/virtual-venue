var socket = io();
const FPS = 20; // Frames per second
const SPEED = 15; // # of pixels moved per frame
const SIZE = 30; // Size of player in pixels

var center = { x: 0, y: 0 };
var keyList = {};
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var currPlayer;
var lastPlayerState;
var discordId = null;
var gameObjects;
// var offset = { x: 0, y: 0 }

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
        draw();

        setInterval(() => {
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

            // TODO: Check if player walked into wall => change = false;
            if (change) {
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
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
    })
}

function draw() {
    if (discordId === null) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    for (var i in lastPlayerState) {
        var p = lastPlayerState[i];

        ctx.fillStyle = '#' + p.color;
        ctx.fillRect(p.x - SIZE / 2, p.y - SIZE / 2, SIZE, SIZE);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.font = '20px sans-serif';
        ctx.fillText(p.nickname, p.x, p.y - 35);
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '14px sans-serif';
        ctx.fillText(`${p.user.username}#${p.user.discriminator}`, p.x, p.y - 20);
    }
}

function fail() {
    document.getElementById('canvas').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    setTimeout(() => {
        window.location = window.origin;
    }, 2000);
}
