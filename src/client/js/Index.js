var socket = io();
var cookies = new UniversalCookie();
var authId;
var redirect;

function setup() {
    socket.emit('client');

    socket.on('authStart', (data) => {
        authId = data.authId;
        redirect = data.redirect;
        const loginButton = document.getElementById('login-button');
        loginButton.disabled = false;
        loginButton.innerHTML = 'Login with Discord';
    });
}

function login() {
    cookies.set('state', authId, {sameSite: 'lax'});
    window.open(redirect);
    document.getElementById('index').style.display = "none";
    document.getElementById('after-redirect').style.display = "block";
}
