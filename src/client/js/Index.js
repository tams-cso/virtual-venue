var socket = io();
var cookies = new UniversalCookie();
var authId;
var redirect;
var joinLink;

function setup() {
    socket.emit('client');

    socket.on('authStart', (data) => {
        authId = data.authId;
        redirect = data.redirect;
        const loginButton = document.getElementById('login-button');
        loginButton.disabled = false;
        loginButton.innerHTML = 'Login with Discord';
    });

    socket.on('toJoin', (serverUrl) => {
        document.getElementById('after-redirect').style.display = 'none';
        document.getElementById('to-join').style.display = 'block';
        joinLink = serverUrl;
    });

    socket.on('joined', (data) => {
        document.getElementById('after-redirect').style.display = 'none';
        document.getElementById('to-join').style.display = 'none';
        document.getElementById('joined').style.display = 'block';

        document.getElementById('avatar').src = `https://cdn.discordapp.com/avatars/${data.userInfo.id}/${data.userInfo.avatar}.png`
        document.getElementById('username').innerHTML = data.userInfo.username;
        document.getElementById('discriminator').innerHTML = '# ' + data.userInfo.discriminator;
    })
}

function login() {
    cookies.set('state', authId, { sameSite: 'lax' });
    window.open(redirect);
    document.getElementById('index').style.display = 'none';
    document.getElementById('after-redirect').style.display = 'block';
}

function joinServer() {
    window.open(joinLink);
    document.getElementById('join-title').innerHTML = 'Waiting for you to join the server...'
    document.getElementById('more-info').innerHTML = 'Click to try again'
}

function enterGame() {

}