require('dotenv').config();

module.exports = {
    authUrl: process.env.AUTH_URL,
    botUrl: process.env.BOT_URL,
    serverUrl: process.env.SERVER_URL,
    botToken: process.env.BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    start: {
        x: Number(process.env.START_X),
        y: Number(process.env.START_Y),
    },
    boardSize: {
        w: Number(process.env.BOARD_SIZE_W),
        h: Number(process.env.BOARD_SIZE_H),
    },
    gameCategoryName: process.env.GAME_CATEGORY_NAME,
    prefix: process.env.PREFIX,
};
