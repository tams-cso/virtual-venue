# Virtual Venue

This is a project to create a virtual venue for hackTAMS!

## To install:

```
git clone https://github.com/tams-cso/virtual-venue.git
cd virtual-venue
yarn install
```

## To configure:

-   Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create an application
-   Then go to `Bot` and create a bot
-   Copy the bot token to the botToken field in config.json
-   Go to Oauth2 to generate a link to add the bot to your server => select `bot` and then `Administrator`
-   Generate a permanent invite link to your server
-   Get the client ID and secret from the `General Information` section of the app dashboard
-   Create a file: `touch src/config.json` with the following contents:

```json
{
    "serverUrl": "[permanent invite link to server]",
    "botToken": "[discord bot token]",
    "clientId": "[discord app client id]",
    "clientSecret": "[discord app client secret]",
    "start": {
        "x": "[integer x position for player to start at]",
        "y": "[integer y position for player to start at]"
    },
    "boardSize": {
        "w": "[integer board width]",
        "h": "[integer board height]"
    },
    "gameCategoryName": "[name of channel category you want the game vcs to be in (eg. 'game')]",
    "prefix": "[prefix to be used (eg. '>>')]"
}
```

## To run:

On your discord server, you can use `[prefix] help` to get a list of commands if you're an admin

**You need to do `[prefix] mkvcs` to create the VCs before starting the backend.**u

Then on your backend, just type `yarn start`
