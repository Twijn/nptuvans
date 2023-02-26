const { StringSelectMenuInteraction } = require("discord.js");

const manager = require("../../api/EmbedManager");

const listener = {
    name: "driverControllerSelectMenus",
    /**
     * Executor for this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify: interaction => interaction.isStringSelectMenu() && (
        interaction.customId === "drive-to"
    ),
    /**
     * Executor for this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    execute: async interaction => {
        let driverLog = manager.active.find(x => x.driver.id === interaction.user.id);

        if (!driverLog) {
            interaction.error("Unable to retrieve driver log");
            return;
        }

        let location = interaction.values[0];

        if (!location) {
            interaction.error("Location not found");
            return;
        }

        driverLog.driveTo(location).then(loc => {
            interaction.success("Successfully started driving to " + loc.location);
        }, err => {
            console.error(err);
            interaction.error(err);
        });
    }
}

module.exports = listener;