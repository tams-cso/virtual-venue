require('dotenv').config();

module.exports = {
    authUrl: process.env.AUTH_URL,
    botUrl: process.env.BOT_URL,
    serverUrl: process.env.SERVER_URL,
    botToken: process.env.BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    gameCategoryName: process.env.GAME_CATEGORY_NAME,
    prefix: process.env.PREFIX,
};
