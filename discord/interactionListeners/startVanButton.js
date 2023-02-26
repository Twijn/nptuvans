const { ButtonInteraction, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");

const embedManager = require("../../api/EmbedManager");

const listener = {
    name: "startVanButton",
    /**
     * Executor for this listener
     * @param {ButtonInteraction} interaction 
     */
    verify: interaction => interaction.isButton() && interaction.customId === "start-van",
    /**
     * Executor for this listener
     * @param {ButtonInteraction} interaction 
     */
    execute: async interaction => {
        let vans = embedManager.vans.filter(x => x.status === "parked");

        if (vans.length > 0) {
            const embed = new EmbedBuilder()
                .setTitle("Start up a van")
                .setDescription("Select a van below to start.")
                .setColor(0x4287f5);

            const select = new StringSelectMenuBuilder()
                .setCustomId("start-van")
                .setMaxValues(1)
                .setPlaceholder("Select a van to start up.")
                .setOptions(vans.map(x => {
                    return {
                        value: x.plate,
                        label: `${x.plate} (${x.color})`,
                    }
                }));
            
            const row = new ActionRowBuilder()
                .setComponents(select);

            interaction.reply({embeds: [embed], components: [row], ephemeral: true});
        } else {
            interaction.error("There are no parked vans to start up!");
        }
    }
}

module.exports = listener;