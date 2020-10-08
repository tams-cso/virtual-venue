var socket = io();
var cookies = new UniversalCookie();
var authId;
var redirect;
var joinLink;

function setup() {
    // Tell the server that the client has arrived!
    socket.emit('client');

    // Once the server returns the authId
    socket.on('authStart', (data) => {
        // Save the authId and redirect uri
        authId = data.authId;
        redirect = data.redirect;

        // Enable the login button
        const loginButton = document.getElementById('login-button');
        loginButton.disabled = false;
        loginButton.innerHTML = 'Login with Discord';
    });

    // Redirect the user to join the server
    socket.on('toJoin', (serverUrl) => {
        // Show the joining prompt and set the url
        document.getElementById('after-redirect').style.display = 'none';
        document.getElementById('to-join').style.display = 'block';
        joinLink = serverUrl;
    });

    // If auth flow complete
    socket.on('joined', () => {
        // Set cookies for client to authenticate
        cookies.set('authId', authId);

        // Redirect user to game
        window.location = window.origin + '/game';
    });

    // If the user is already in a game on another client
    socket.on('playing', (user) => {
        // Hide other UI and show playing UI element
        document.getElementById('after-redirect').style.display = 'none';
        document.getElementById('playing').style.display = 'block';
        document.getElementById('playing-id').innerHTML = `User: ${user}`;
    });
}

function login() {
    cookies.set('state', authId, { sameSite: 'lax' });
    window.open(redirect);
    document.getElementById('index').style.display = 'none';
    document.getElementById('after-redirect').style.display = 'block';
}

function joinServer() {
    window.open(joinLink);
    document.getElementById('join-title').innerHTML = 'Waiting for you to join the server...';
    document.getElementById('more-info').innerHTML = 'Click to try again';
}
