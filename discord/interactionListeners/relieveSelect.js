const { StringSelectMenuInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const manager = require("../../api/EmbedManager");

const listener = {
    name: "relieveSelect",
    interactionStore: {},
    /**
     * Executor for this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify: interaction => interaction.isStringSelectMenu() && (
        interaction.customId === "relieve-van"
    ),
    /**
     * Executor for this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    execute: async interaction => {
        let log = manager.active.find(x => x.id === Number(interaction.values[0]));

        if (!log) {
            interaction.error("Unable to find driver log entry");
            return;
        }

        let driver = manager.drivers.find(x => x.id === interaction.user.id);

        if (log.driver.id === interaction.user.id) {
            interaction.error("You can't relieve yourself!");
            return;
        }

        if (manager.active.find(x => x.driver.id === driver.id)) {
            let active = manager.active.find(x => x.driver.id === driver.id);
            interaction.error(`You are already operating van ${active.van.plate}!`);
            return;
        }

        log.driver.getUser().then(user => {
            const embed = new EmbedBuilder()
                .setTitle("Relief Request")
                .setColor(0x4287f5)
                .setDescription(`You recieved a relief request from ${interaction.user} for van ${log.van.plate}. Please accept or deny within 30 seconds.`)
                .setAuthor({
                    name: driver.name,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            const accept = new ButtonBuilder()
                .setCustomId("accept-relief-" + interaction.user.id)
                .setLabel("Accept Relief")
                .setStyle(ButtonStyle.Success);

            const deny = new ButtonBuilder()
                .setCustomId("deny-relief")
                .setLabel("Deny Relief")
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(accept, deny);
            
            user.dmChannel.send({embeds: [embed], components: [row]}).then(message => {
                interaction.success("Relief request sent!");
                listener.interactionStore[message.id] = interaction;
                setTimeout(() => {
                    if (message.deletable) {
                        message.delete().then(() => {
                            interaction.followUp({content: "Relief request for " + log.van.plate + " timed out", ephemeral: true});
                        }).catch(() => {});
                    }
                    delete listener.interactionStore[message.id];
                }, 30 * 1000);
            }, err => {
                console.error(err);
                interaction.error("Failed to send relief request");
            });
        }, err => {
            console.error(err);
            interaction.error("Failed to retrieve user");
        })
    }
}

module.exports = listener;