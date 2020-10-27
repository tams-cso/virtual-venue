const Discord = require('discord.js');
const config = require('./Config');

const client = new Discord.Client();
var gameObjects;

/**
 * The main function for starting the discord bot
 */
const runBot = (gameObjs) => {
    gameObjects = gameObjs;
    client.on('ready', () => console.log(`Logged in as ${client.user.tag}`));

    // Login with the bot token provided in creds.json
    client.login(config.botToken).then(() => {
        // Virtual Venue only currently supports one Discord server at a time
        if (client.guilds.cache.size > 1) {
            console.error('ERROR: Bot in more than 1 server :(');
            process.exit(-1);
        }
    });

    client.on('message', (message) => {
        // Check to see if the message is for the bot
        if (!message.content.startsWith(config.prefix) || message.author.bot) return;

        // Check to see if the member has the admin role
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            message.channel.send(
                message.author.toString() + 'You need to be an administrator to use these commands!'
            );
            return;
        }
        // Splits the arguments up
        const args = message.content.slice(config.prefix.length).trim().split(/ +/g);

        // If no arguments return
        if (args.length === 0) return;

        // Go to commands
        if (args[0] === 'help') help(message);
        else if (args[0] === 'mkvcs') createVcs(message, config);
        else if (args[0] === 'rmvcs') removeVcs(message, config);
    });

    client.on('guildMemberAdd', (member) => {
        const { joinCallback } = require('./backend');
        joinCallback(member.user.id);
    });
};

/**
 * List all the commands that can be used
 *
 * @param {Discord.Message} message
 */
const help = (message) => {
    message.channel.send(
        message.author.toString() +
            `
\`\`\`ml
Commands For Virtual Venue Admin
    **you must be an admin to use these commands**

1. help - "Lists out all the commands"
2. mkvcs - "Create or clear the GAME category and creates the sub vcs specified in the config.json file"
3. rmvcs - "Deletes the GAME category and its children"
\`\`\``
    );
};

/**
 * Checks to see if a 'game' channel category has been created;
 * It will clear/create that category and fill it with the
 * vcs specified in config.json
 *
 * @param {Discord.Message} message Message object
 * @param {object} config Config object
 */
const createVcs = async (message, config) => {
    var gameCat = message.guild.channels.cache
        .filter((channel) => channel.type === 'category')
        .find((channel) => channel.name === config.gameCategoryName);
    if (gameCat === undefined) {
        gameCat = await message.guild.channels.create(config.gameCategoryName, {
            type: 'category',
        });
    } else {
        message.guild.channels.cache.forEach((value, key) => {
            if (value.parentID === gameCat.id) {
                value.delete();
            }
        });
    }

    message.guild.channels.create('main', { type: 'voice', parent: gameCat });
    gameObjects.forEach((obj) => {
        if (obj.type == 'vc') {
            message.guild.channels.create(obj.vcId, {
                type: 'voice',
                parent: gameCat,
                permissionOverwrites: [{ id: message.guild.id, deny: ['CONNECT'] }],
            });
        }
    });
    message.channel.send(message.author.toString() + ' created VCs!');
};

/**
 * Removes the 'game' channel category and its children
 *
 * @param {Discord.Message} message Message object
 * @param {object} config config object
 */
const removeVcs = async (message, config) => {
    var gameCat = message.guild.channels.cache
        .filter((channel) => channel.type === 'category')
        .find((channel) => channel.name === config.gameCategoryName);
    if (gameCat === undefined) {
        message.channel.send(
            message.author.toString() + ` I can't find the ${config.gameCategoryName} category`
        );
    } else {
        message.guild.channels.cache.forEach((value, key) => {
            if (value.parentID === gameCat.id) {
                value.delete();
            }
        });
        gameCat.delete();
        message.channel.send(message.author.toString() + ' removed game VCs!');
    }
};

/**
 * Checks in the user is in the current Discord Guild
 *
 * @param {string} userId The ID of the user to check
 * @returns {boolean} If the user is in the guild, it returns true
 */
const userInGuild = async (userId) => {
    // TODO: Check if there is more than one guild that the bot is in
    // but idk that might be hard bc idk what to send to the user
    // Maybe just an internal server error? (contact administrator) smth like that
    var guild = client.guilds.cache.first();
    const inThis = await guild.members.fetch(userId);
    if (inThis === undefined) return false;
    return true;
};

/**
 * Checks to see if user is in main vc and if vc exists
 * Then will move the user into the specified vc
 *
 * @param {string} userId
 * @param {string} vcName
 * @returns {Promise<boolean>} True if vc was successfully joined
 */
const joinVc = async (userId, vcName) => {
    var guild = client.guilds.cache.first();
    var gameCat = guild.channels.cache
        .filter((channel) => channel.type === 'category')
        .find((channel) => channel.name === config.gameCategoryName);

    var memberVoice = guild.members.cache.find((member) => member.id === userId).voice;
    if (memberVoice.channelID === undefined) return false;

    var gameVc = guild.channels.cache.find(
        (channel) =>
            channel.parent !== null &&
            channel.parent.id === gameCat.id &&
            channel.id === memberVoice.channelID
    );
    if (gameVc === null) return false;

    var vc = guild.channels.cache.find((channel) => channel.name === vcName);

    await memberVoice.setChannel(vc);
    return true;
};

const leaveVc = (userId) => {
    var guild = client.guilds.cache.first();
    var memberVoice = guild.members.cache.find((member) => member.id === userId).voice;
    var userCurrVcId = memberVoice.channelID;
    var mainVc = guild.channels.cache.find((channel) => channel.name === 'main');
    if (userCurrVcId !== undefined) {
        memberVoice.setChannel(mainVc);
    }
};

module.exports = { runBot, userInGuild, joinVc, leaveVc };
