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
-   Generate a permanent invite link to your server and invite the bot to your server, giving it admin permissions
-   Get the client ID and secret from the `General Information` section of the app dashboard
-   Create a file: `.env` in the root project folder with the following contents (or set environmental variables to):

```
SERVER_URL=[Permanent invite link to your server],
BOT_TOKEN=[Discord bot token],
CLIENT_ID=[Discord API client ID],
CLIENT_SECRET=[Discord API client secret],
REDIRECT_URI=[The url to redirect the user to after authentication with Discord; should be http[s]://websiteName.com/callback],
GAME_CATEGORY_NAME=[name of channel category you want the game vcs to be in (eg. 'game')],
PREFIX=[prefix to be used (eg. '>>')]
```

- Also don't forget to add the redirect URI on the Discord API developer portal!
- For help on how to create environmental variables for this private info in production or in development, check out [this article](https://medium.com/better-programming/how-to-hide-your-api-keys-c2b952bc07e6).

- To create game objects, change the file named `gameObjects.txt` with the following format:

    - The first line will contain a space seperated list of 4 variables

    ```
    [Player Spawn X] [Player Spawn Y] [Board Width] [Board Height]
    ```

    - The following lines will be a list of game objects 
    (walls, background, or VCs) in the following format:
    
    ```
    [Type (vc|wall|background)] [id] [x],[y],[w],[h] [color hex id (no #)] 
    > If VC add: [vc name] [display name (can contain spaces; optional)]
    > If background add: [text to display (can contain spaces; optional)] 
    ```
    
    - See the current file for an example and modify it to suit your needs!

## To run:

On your discord server, you can use `[prefix] help` to get a list of commands if you're an admin

**You need to do `[prefix] mkvcs` to create the VCs before starting the backend.**

Then on your backend, just type `yarn start`
