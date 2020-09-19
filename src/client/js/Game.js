var socket = io();

var center = { x: 0, y: 0 };
var players = [];
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

function setup() {
    resize();
    window.addEventListener('resize', resize);
    console.log('game setup!');

    window.addEventListener('keydown', (event) => {
        var key = event.key.toLowerCase();
        if (
            key == 'w' ||
            key == 's' ||
            key == 'a' ||
            key == 'd' ||
            key == 'arrowup' ||
            key == 'arrowdown' ||
            key == 'arrowleft' ||
            key == 'arrowright'
        )
            socket.emit('keydown', key);
    });

    window.addEventListener('keyup', (event) => {
        var key = event.key.toLowerCase();
        if (
            key == 'w' ||
            key == 's' ||
            key == 'a' ||
            key == 'd' ||
            key == 'arrowup' ||
            key == 'arrowdown' ||
            key == 'arrowleft' ||
            key == 'arrowright'
        )
            socket.emit('keyup', key);
    });

    socket.on('update', (players) => {
        draw(players);
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

        ctx.fillStyle = '#' + p.color.padStart(6, '0');
        ctx.fillRect(p.x, p.y, 30, 30);
    }
}
