const fs = require('node:fs');
const path = require('node:path');

const manager = require("../api/EmbedManager");

const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const con = require("../database");
const config = require('../config.json');

const client = new Client({ intents: [GatewayIntentBits.GuildMessages] });

// create collections
client.commands = new Collection();
client.interactionListeners = new Collection();

// populate collections
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const interactionsPath = path.join(__dirname, 'interactionListeners');
const interactionFiles = fs.readdirSync(interactionsPath).filter(file => file.endsWith('.js'));

for (const file of interactionFiles) {
	const filePath = path.join(interactionsPath, file);
	const listener = require(filePath);
	// Set a new item in the Collection with the key as the listener name and the value as the exported module
	if ('name' in listener && 'verify' in listener && 'execute' in listener) {
		client.interactionListeners.set(listener.name, listener);
	} else {
		console.log(`[WARNING] The interaction listener at ${filePath} is missing a required "name", "verify", or "execute" property.`);
	}
}

// ready message
client.once(Events.ClientReady, async c => {
	console.log(`Discord ready! Logged in as ${c.user.tag}`);
	console.log(`Startup completed!`);

	await manager.init();
	await manager.refreshMessages();
});

// interaction listener
client.on(Events.InteractionCreate, interaction => {
	interaction.success = message => {
		interaction.reply({
			embeds: [new EmbedBuilder().setTitle("Successful!").setColor(0x2dce3d).setDescription(message)],
			ephemeral: true,
		});
	}
	interaction.error = message => {
		interaction.reply({
			embeds: [new EmbedBuilder().setTitle("An error occurred!").setColor(0xd63939).setDescription(message)],
			ephemeral: true,
		});
	}
	
    client.interactionListeners.forEach(listener => {
		try {
			if (listener.verify(interaction)) listener.execute(interaction);
		} catch (err) {
			console.error(err);
		}
	});
});

client.on(Events.MessageDelete, message => {
	con.query("delete from message where id = ?;", [message.id], err => {
		if (err) console.error(err);
	});
});

global.discord = client;

client.login(config.discord.token);

require("./postSlashCommands");
