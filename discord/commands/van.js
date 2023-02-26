const { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandSubcommandBuilder, SlashCommandStringOption, codeBlock } = require("discord.js");

const manager = require("../../api/EmbedManager");

const command = {
    data: new SlashCommandBuilder()
        .setName("van")
        .setDescription("Van Manager")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("create")
                .setDescription("Adds a new van to the fleet")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("plate")
                        .setDescription("4 main numbers of a plate, ex. '2980'")
                        .setMinLength(4)
                        .setMaxLength(4)
                        .setRequired(true)
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("color")
                        .setDescription("Color of the van, ex. 'black'")
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("ooc")
                .setDescription("Places a van in an OOC state")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("plate")
                        .setDescription("4 main numbers of a plate, ex. 2980. Van must be marked parked")
                        .setMinLength(4)
                        .setMaxLength(4)
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("return")
                .setDescription("Returns a van from an OOC state")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("plate")
                        .setDescription("4 main numbers of a plate, ex. 2980. Van must be marked OOC")
                        .setMinLength(4)
                        .setMaxLength(4)
                        .setAutocomplete(true)
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
    /**
     * Executor for this chat command
     * @param {ChatInputCommandInteraction} interaction 
     */
    execute: async interaction => {
        let subcommand = interaction.options.getSubcommand(true);

        if (subcommand === "create") {
            let plate = interaction.options.getString("plate", true);
            let color = interaction.options.getString("color", true).toLowerCase();

            manager.createVan(plate, color).then(van => {
                interaction.success("Successfully created a van!" + codeBlock(`${van.plate} - ${van.color}`));
            }, err => {
                console.error(err);
                interaction.error("An error occurred while adding this van!");
            })
        } else if (subcommand === "ooc") {
            let van = manager.getVan(interaction.options.getString("plate", true));

            if (van) {
                try {
                    await van.ooc();
                    interaction.success(`Modified van ${van.plate} status to ${van.status}`);
                } catch(err) {
                    interaction.error(err);
                }
            } else {
                interaction.error("Van with specified plate does not exist");
            }
        } else if (subcommand === "return") {
            let van = manager.getVan(interaction.options.getString("plate", true));

            if (van) {
                try {
                    await van.park();
                    interaction.success(`Modified van ${van.plate} status to ${van.status}`);
                } catch(err) {
                    interaction.error(err);
                }
            } else {
                interaction.error("Van with specified plate does not exist");
            }
        }
    }
}

module.exports = command;