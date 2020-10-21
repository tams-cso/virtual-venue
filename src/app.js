const Bot = require('./server/bot');
const Web = require('./server/web');
const Backend = require('./server/backend');
const gameObjects = require('./server/GameObjects')();

// Start webpage
const server = Web();
Backend.run(server, gameObjects);

// Start discord bot
Bot.runBot(gameObjects);
