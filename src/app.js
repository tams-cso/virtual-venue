const Bot = require('./server/bot');
const Web = require('./server/web');
const Backend = require('./server/backend');

// Start webpage
const server = Web();
Backend.run(server);

// Start discord bot
Bot.runBot();
