const listener = {
    name: "commandListener",
    verify: interaction => interaction.isChatInputCommand(),
    /**
     * Executor for this listener
     * @param {ChatInputCommandInteraction} interaction 
     */
    execute: async interaction => {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
}

module.exports = listener;