const { StringSelectMenuInteraction, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");

const manager = require("../../api/EmbedManager");

const listener = {
    name: "startVanSelect",
    /**
     * Executor for this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify: interaction => interaction.isStringSelectMenu() && interaction.customId === "start-van",
    /**
     * Executor for this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    execute: async interaction => {
        if (interaction.values.length === 1) {
            let driver = manager.getDriver(interaction.user.id);
            let van = manager.getVan(interaction.values[0]);

            if (!driver) {
                interaction.error("Unable to find driver profile from Discord ID");
                return;
            }

            if (!van) {
                interaction.error("Unable to find van from plate number");
                return;
            }

            if (van.status !== "parked") {
                interaction.error("Van must be parked to start driving");
                return;
            }

            driver.drive(van).then(message => {
                interaction.success(`**Started driving van ${van.plate}!**\nView the driver controller [here](${message.url})`);
            }, err => {
                console.error(err);
                interaction.error(err);
            });
        } else {
            interaction.error("Invalid number of values: " + interaction.values.length);
        }
    }
}

module.exports = listener;