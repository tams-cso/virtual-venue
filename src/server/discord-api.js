const fetch = require('node-fetch');
const config = require('./Config');
const querystring = require('querystring');

const getAccessToken = async (code) => {
    const body = {
        'client_id': config.clientId,
        'client_secret': config.clientSecret,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': config.redirectUri,
        'scope': 'identify'
    }

    return await fetch('https://discordapp.com/api/oauth2/token', {
        method: 'POST',
        body: querystring.stringify(body),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then(data => data.json());
}

const refreshTokens = async () => {

}

const getUserInfo = async (token) => {
    return await fetch('https://discord.com/api/users/@me', {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }).then((data) => data.json());
}

module.exports = { getAccessToken, refreshTokens, getUserInfo }