const { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandStringOption, SlashCommandUserOption, SlashCommandSubcommandBuilder, AttachmentBuilder } = require("discord.js");

const con = require("../../database");

const parseDifference = diff => {
    if (diff > 3600) {
        diff = (diff/3600).toFixed(1);
        return `${diff} hour${diff === "1.0" ? "" : "s"}`
    } else if (diff > 60) {
        diff = (diff/60).toFixed(1);
        return `${diff} minute${diff === "1.0" ? "" : "s"}`
    } else {
        return `${diff} second${diff === 1 ? "" : "s"}`
    }
}

const month = [
    "JAN",
    "FEB",
    "MAR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
];

const command = {
    data: new SlashCommandBuilder()
        .setName("viewlog")
        .setDescription("View duty driver log data")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("location")
                .setDescription("View logs based on driver location")
                .addUserOption(
                    new SlashCommandUserOption()
                        .setName("driver")
                        .setDescription("Filter duty driver logs by driver")
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("van")
                        .setDescription("Filter duty driver logs by van")
                        .setMinLength(4)
                        .setMaxLength(4)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),
    /**
     * Executor for this chat command
     * @param {ChatInputCommandInteraction} interaction 
     */
    execute: async interaction => {
        if (interaction.options.getSubcommand() === "location") {
            let query = "";
            let options = [];

            if (interaction.options.getUser("driver")) {
                query += " where driver_id = ?";
                options = [
                    ...options,
                    interaction.options.getUser("driver").id,
                ]
            }

            if (interaction.options.getString("van")) {
                query += (query === "" ? " where" : " and") + " van_plate = ?";
                options = [
                    ...options,
                    interaction.options.getString("van"),
                ]
            }
            
            con.query("select location_log.location, location_log.start_time, location_log.arrival_time, driver_log.van_plate, driver.name from location_log join driver_log on driver_log.id = driverlog_id join driver on driver.id = driver_id" + query + " order by location_log.start_time desc limit 100;", options, (err, res) => {
                if (!err) {
                    let str = "";

                    let lastLocation = null;

                    res.reverse().forEach(location => {
                        if (lastLocation) {
                            let drive = new Date(lastLocation.start_time);
                            let date = new Date(location.arrival_time);
                            str += `\n[${drive.getHours() < 10 ? "0" : ""}${drive.getHours()}:${drive.getMinutes() < 10 ? "0" : ""}${drive.getMinutes()} ${drive.getDate() < 10 ? "0" : ""}${drive.getDate()}${month[drive.getMonth()]}${drive.getFullYear()-2000}] (${location.van_plate}) ${location.name} ${lastLocation.location} -> 🚐 ${parseDifference(Math.floor((location.arrival_time - location.start_time) / 1000))} -> ${location.location}`;
                            str += `\n[${date.getHours() < 10 ? "0" : ""}${date.getHours()}:${date.getMinutes() < 10 ? "0" : ""}${date.getMinutes()} ${date.getDate() < 10 ? "0" : ""}${date.getDate()}${month[date.getMonth()]}${date.getFullYear()-2000}] (${location.van_plate}) ${location.name} Sat at ${location.location} ${parseDifference(Math.floor((location.arrival_time - location.start_time) / 1000))}`
                        } else {
                            str += "Started at " + location.location;
                        }

                        lastLocation = location;
                    });

                    let attachment = new AttachmentBuilder(Buffer.from(str), {name: "history.txt"});
                    interaction.reply({files: [attachment], ephemeral: true});
                } else {
                    console.error(err);
                    interaction.error(err);
                }
            });
        }
    }
}

module.exports = command;