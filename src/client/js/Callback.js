var socket = io();
var cookies = new UniversalCookie();

function setup() {
    socket.on('authSuccess', () => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('success').style.display = 'block';
    });

    socket.on('authFailed', () => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('fail').style.display = 'block';
    });

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (
        code === null ||
        state === null ||
        cookies.get('state') === undefined ||
        cookies.get('state') !== state
    ) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('fail').style.display = 'block';
        socket.emit('callbackFailed', state);
        return;
    }

    cookies.remove('state');

    socket.emit('callback', { authId: state, code });
}
