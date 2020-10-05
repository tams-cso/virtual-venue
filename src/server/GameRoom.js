const colyseus = require('colyseus');

exports.GameRoom = class extends colyseus.Room {
    onCreate(options) {
        this.onMessage('type', (client, message) => {
            // handle "type" message.
        });
    }

    onJoin(client, options) {}

    onLeave(client, consented) {}

    onDispose() {}
};
