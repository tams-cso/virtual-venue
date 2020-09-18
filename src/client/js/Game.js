var socket = io();

var center = {};
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.font = '100px Arial';

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    center = {
        x: canvas.width / 2,
        y: canvas.height / 2
    }
    draw();
}

function draw() {
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(center.x - 100, center.y - 100, 200, 200);
    ctx.font = "30px Comic Sans MS";
    ctx.fillStyle = "#000000";
    ctx.fillText("Hello World!", center.x - 80, center.y);
}

resize();
window.addEventListener('resize', resize);