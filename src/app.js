const Bot = require('./server/bot');
const Web = require('./server/web');
const Backend = require('./server/backend');

// Start webpage
const { server, gameServer } = Web();
Backend.run(server, gameServer);

// Start discord bot
Bot.runBot();
