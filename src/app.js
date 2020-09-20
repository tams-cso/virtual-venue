const Bot = require('./server/bot');
const Web = require('./server/web');

// Start webpage
Web();

// Start discord bot
Bot.runBot();
