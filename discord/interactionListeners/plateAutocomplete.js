const { AutocompleteInteraction } = require("discord.js");

const manager = require("../../api/EmbedManager");

const listener = {
    name: "plateAutocomplete",
    /**
     * Executor for this listener
     * @param {AutocompleteInteraction} interaction 
     */
    verify: interaction => interaction.isAutocomplete()
        && interaction.options?.getFocused(true)?.name === "plate",
    /**
     * Executor for this listener
     * @param {AutocompleteInteraction} interaction 
     */
    execute: async interaction => {
        let vans = manager.vans;

        if (interaction.commandName === "van") {
            let subcommand = interaction.options.getSubcommand(true);
            if (subcommand === "ooc") {
                vans = vans.filter(x => x.status === "parked");
            } else if (subcommand === "return") {
                vans = vans.filter(x => x.status === "ooc");
            }
        }

        vans = vans.sort((a,b) => a.plate - b.plate);

        interaction.respond(vans.map(x => {
            return {
                name: x.plate,
                value: x.plate,
            };
        }));
    }
}

module.exports = listener;