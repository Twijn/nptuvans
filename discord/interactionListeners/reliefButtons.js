const { ButtonInteraction, EmbedBuilder } = require("discord.js");

const manager = require("../../api/EmbedManager");

const { interactionStore } = require("./relieveSelect");

const listener = {
    name: "reliefButtons",
    /**
     * Executor for this listener
     * @param {ButtonInteraction} interaction 
     */
    verify: interaction => interaction.isButton() &&
        (
            interaction.customId === "deny-relief" ||
            interaction.customId.startsWith("accept-relief-")
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

        if (interaction.customId === "deny-relief") {
            if (interactionStore.hasOwnProperty(interaction.message.id)) {
                interactionStore[interaction.message.id].followUp({content: `${driverLog.driver.name} has denied the relief request`, ephemeral: true})
            }

            interaction.message.delete().catch(console.error);
            interaction.success("Denied relief request");

            await manager.refreshMessages();
        } else {
            let id = interaction.customId.replace("accept-relief-", "");

            let relievingDriver = manager.drivers.find(x => x.id === id);

            if (!relievingDriver) {
                interaction.error("Unable to find relieving driver");
                return;
            }

            try {
                await driverLog.secure(true);
                let message = await relievingDriver.drive(driverLog.van, driverLog);

                
                if (interactionStore.hasOwnProperty(interaction.message.id)) {
                    const embed = new EmbedBuilder()
                        .setTitle("Successfully relieved " + driverLog.driver.name + "!")
                        .setDescription(`View your driver controller [here](${message.url})!`);
                    interactionStore[interaction.message.id].followUp({embeds: [embed], ephemeral: true})
                }

                interaction.success("Successfully relieved by `" + relievingDriver.name + "`!");

                interaction.message.delete().catch(console.error);
            } catch (err) {
                console.error(err);
                interaction.error("An error occurred")
            }
        }
    }
}

module.exports = listener;