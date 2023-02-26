const { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } = require("discord.js");

const embedManager = require("../../api/EmbedManager");

const command = {
    data: new SlashCommandBuilder()
        .setName("manager")
        .setDescription("Generates a message for the duty driver management embed")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    /**
     * Executor for this chat command
     * @param {ChatInputCommandInteraction} interaction 
     */
    execute: async interaction => {
        let channel = interaction.channel;

        if (!channel) {
            try {
                channel = await interaction.client.channels.fetch(interaction.channelId);
            } catch(err) {
                console.error(err);
                interaction.error("Unable to request channel");
                return;
            }
        }

        embedManager.sendManagerEmbed(channel).then(message => {
            interaction.success("Manager embed created!");
        }, err => {
            console.error(err);
            interaction.error("Failed to send embed!");
        });
    }
}

module.exports = command;