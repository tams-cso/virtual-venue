const Bot = require('./server/bot');
const Web = require('./server/web');
const Backend = require('./server/backend');
const { gameObjects, boardParams } = require('./server/GameObjects')();

// Start webpage
const server = Web();
Backend.run(server, gameObjects, boardParams);

// Start discord bot
Bot.runBot(gameObjects);
