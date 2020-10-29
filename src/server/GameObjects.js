const fs = require('fs');
const path = require('path');

module.exports = () => {
    var gameObjects = [];
    const rawInput = fs.readFileSync(path.join(__dirname, '..', 'gameObjects.txt'), 'utf-8');
    const lines = rawInput.split(/\n/);

    const rawParams = lines.shift().split(' ');
    const boardParams = {
        start: {
            x: Number(rawParams[0]),
            y: Number(rawParams[1]),
        },
        boardSize: {
            w: Number(rawParams[2]),
            h: Number(rawParams[3]),
        },
    };

    lines.forEach((line) => {
        var args = line.split(' ');
        var vcId = '';
        var displayName = '';
        var shape = args[2].split(',');
        if (args[0] === 'vc') {
            vcId = args[4];
            displayName = line.substring(
                line.indexOf(args[3] + ' ' + args[4]) + args[3].length + args[4].length + 2
            );
        }
        gameObjects.push({
            type: args[0],
            id: args[1],
            x: Number(shape[0]),
            y: Number(shape[1]),
            w: Number(shape[2]),
            h: Number(shape[3]),
            color: args[3],
            vcId,
            displayName,
        });
    });
    return { gameObjects, boardParams };
};
