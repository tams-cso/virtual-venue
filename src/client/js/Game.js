var socket = io();
const FPS = 20;
const SPEED = 15;

var center = { x: 0, y: 0 };
var keyList = {};
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var currPlayer;
var discordId = null;

function setup() {
    const urlParams = new URLSearchParams(window.location.search);
    const nickname = urlParams.get('nick');
    const authId = urlParams.get('auth');
    if (nickname === null || authId === null) {
        fail();
    }
    socket.emit('start', { authId, nickname });
    startGame();
}

function startGame() {
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
            draw(players);
        }
    });

    socket.on('load', (data) => {
        discordId = data.discordId;
        currPlayer = data.players[discordId];
        draw(data.players);

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

            if (change) {
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

function draw(players) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i in players) {
        var p = players[i];

        ctx.fillStyle = '#' + p.color;
        ctx.fillRect(p.x, p.y, 30, 30);
    }
}

function fail() {
    document.getElementById('canvas').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    setTimeout(() => {
        window.location = window.origin;
    }, 2000);
}
