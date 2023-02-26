const { ButtonInteraction, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");

const manager = require("../../api/EmbedManager");

const listener = {
    name: "driverControllerButtons",
    /**
     * Executor for this listener
     * @param {ButtonInteraction} interaction 
     */
    verify: interaction => interaction.isButton() &&
        (
            interaction.customId === "secure-van" ||
            interaction.customId === "head" ||
            interaction.customId === "gas" ||
            interaction.customId === "arrive" ||
            interaction.customId === "cancel" ||
            interaction.customId === "refresh"
        ),
    /**
     * Executor for this listener
     * @param {ButtonInteraction} interaction 
     */
    execute: async interaction => {
        let driverLog = manager.active.find(x => x.driver.id === interaction.user.id);

        if (!driverLog) {
            interaction.error("Unable to retrieve driver log");
            return;
        }

        if (interaction.customId === "head") {
            driverLog.driveTo("Head").then(location => {
                interaction.success("Successfully started driving to " + location.location);
            }, err => {
                console.error(err);
                interaction.error(err);
            })
        } else if (interaction.customId === "gas") {
            driverLog.driveTo("Gas").then(location => {
                interaction.success("Successfully started driving to " + location.location);
            }, err => {
                console.error(err);
                interaction.error(err);
            })
        } else if (interaction.customId === "secure-van") {
            driverLog.secure().then(() => {
                interaction.success("Successfully secured van " + driverLog.van.plate);
            }, err => {
                console.error(err);
                interaction.error(err);
            })
            
            interaction.message.delete().catch(console.error);

            /** Arrive and cancel drives */
        } else if (interaction.customId === "arrive") {
            driverLog.lastLocation.arrive().then(location => {
                interaction.success("Arrived at " + location.location);
            }, err => {
                console.error(err);
                interaction.error(err);
            });
        } else if (interaction.customId === "cancel") {
            driverLog.cancelDrive().then(location => {
                interaction.success("Cancelled drive to " + location.location);
            }, err => {
                console.error(err);
                interaction.error(err);
            });
        } else if (interaction.customId === "refresh") {
            interaction.message.edit(manager.generateController(driverLog)).then(message => {
                interaction.success("Controller refreshed!");
            }, err => {
                console.error(err);
                interaction.error("Unable to refresh!");
            });
        }
    }
}

module.exports = listener;