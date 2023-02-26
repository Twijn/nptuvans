const { TextChannel, Message, ChannelType, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, DMChannel, StringSelectMenuBuilder, Embed, ActionRow, codeBlock } = require("discord.js");
const con = require("../database");

const Driver = require("./Driver");
const DriverLog = require("./DriverLog");
const EmbedMessage = require("./EmbedMessage");
const Location = require("./Location");
const Van = require("./Van");

const locations = ["Site", "Gravel Lot", "Wharf Alpha"]

class EmbedManager {

    /**
     * Whether the manager has been initialized or not
     * @type {boolean}
     */
    initialized = false;

    /**
     * Cache for all EmbedManager messages
     * @type {EmbedMessage[]}
     */
    messages = [];

    /**
     * All drivers
     * @type {Driver[]}
     */
    drivers = [];

    /**
     * All vans: OOC, operating or parked
     * @type {Van[]}
     */
    vans = [];

    /**
     * Cache for current drivers
     * @type {DriverLog[]}
     */
    active = [];

    /**
     * Cache for most recent 250 locations
     * @type {Location[]}
     */
    locations = [];

    /**
     * Stores the time in which a driver was last at a location
     */
    lastAt = {};

    /**
     * Initializes drivers
     * @returns {Promise<void>}
     */
    #initDrivers() {
        return new Promise((resolve, reject) => {
            con.query("select * from driver;", async (err, res) => {
                if (!err) {
    
                    res.forEach(driver => {
                        this.drivers = [
                            ...this.drivers,
                            new Driver(
                                driver.id,
                                driver.name
                            )
                        ];
                    });
    
                    console.log(`Loaded ${this.drivers.length} driver(s)`);
                    resolve();
                } else {
                    console.error(err);
                }
            });
        });
    }

    /**
     * Initializes embed messages
     * @returns {Promise<void>}
     */
    #initMessages() {
        return new Promise((resolve, reject) => {
            con.query("select id, channel, driver_id, type from message;", async (err, res) => {
                if (!err) {
    
                    for (let i = 0; i < res.length; i++) {
                        try {
                            const message = res[i];
    
                            const channel = await global.discord.channels.fetch(message.channel);
    
                            const msg = await channel.messages.fetch(message.id);
        
                            this.messages = [
                                ...this.messages,
                                new EmbedMessage(
                                    msg,
                                    channel,
                                    this.drivers.find(x => x.id === message.driver_id),
                                    message.type
                                ),
                            ];
                        } catch(err) {
                            console.error("An error occurred while loading messages!");
                            console.error(err);
                        }
                    }
    
                    console.log(`Loaded ${this.messages.length} Embed message(s)`);
                    resolve();
                } else {
                    console.error(err);
                }
            });
        });
    }

    /**
     * Initializes vans
     * @returns {Promise<void>}
     */
    #initVans() {
        return new Promise((resolve, reject) => {
            con.query("select * from van;", async (err, res) => {
                if (!err) {
    
                    res.forEach(van => {
                        this.vans = [
                            ...this.vans,
                            new Van(
                                van.plate,
                                van.color,
                                van.status
                            )
                        ];
                    });
    
                    console.log(`Loaded ${this.vans.length} van(s)`);
                    resolve();
                } else {
                    console.error(err);
                }
            });
        });
    }

    /**
     * Initializes active drivers
     * @returns {Promise<void>}
     */
    #initActive() {
        return new Promise((resolve, reject) => {
            con.query("select id, driver_id, van_plate, start_time, end_time from driver_log as log where end_time is null;", async (err, res) => {
                if (!err) {

                    for (let i = 0; i < res.length; i++) {
                        let log = res[i];
                        let logEntry = new DriverLog(
                            log.id,
                            this.drivers.find(x => x.id === log.driver_id),
                            this.vans.find(x => x.plate === log.van_plate),
                            new Date(log.start_time),
                            log.end_time ? new Date(log.end_time) : null
                        );

                        await logEntry.getLastLocation();

                        this.active = [
                            ...this.active,
                            logEntry,
                        ];
                    }
    
                    console.log(`Loaded ${this.active.length} active driver(s)`);
                    resolve();
                } else {
                    console.error(err);
                }
            });
        });
    }

    /**
     * Initializes locations
     * @returns {Promise<void>}
     */
    #initLocations() {
        return new Promise((resolve, reject) => {
            con.query("select location_log.id as locationlog_id, location_log.location, location_log.start_time as loc_start_time, location_log.arrival_time as loc_arrival_time, driver_log.id as driverlog_id, driver_log.driver_id, driver_log.van_plate, driver_log.start_time as driver_start_time, driver_log.end_time as driver_end_time from location_log join driver_log on location_log.driverlog_id = driver_log.id order by location_log.start_time desc limit 250;", (err, res) => {
                if (!err) {
                    res.forEach(location => {
                        this.locations = [
                            ...this.locations,
                            new Location(
                                location.locationlog_id,
                                new DriverLog(
                                    location.driverlog_id,
                                    this.drivers.find(x => x.id === location.driver_id),
                                    this.vans.find(x => x.plate === location.van_plate),
                                    new Date(location.driver_start_time),
                                    location.driver_end_time ? new Date(location.driver_end_time) : null
                                ),
                                location.location,
                                new Date(location.loc_start_time),
                                location.loc_arrival_time ? new Date(location.loc_arrival_time) : null
                            ),
                        ]
                    });
    
                    console.log(`Loaded ${this.locations.length} location(s)`);
                    resolve();
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Initialize last at times
     * @returns {Promise<void>}
     */
    #initLastAt() {
        return new Promise((resolve, reject) => {
            const update = (location, time) => {
                if (this.lastAt.hasOwnProperty(location)) {
                    this.lastAt[location] = Math.max(this.lastAt[location], time);
                } else {
                    this.lastAt[location] = time;
                }
            }

            locations.forEach(location => {
                let occur = this.locations.filter(x => x.location === location && x.arrivalTime !== null);
                occur.forEach(instance => {
                    let nextInstance = this.locations.filter(x => x.id > instance.id);
                    if (nextInstance.length > 0) {
                        update(location, nextInstance[nextInstance.length - 1].startTime);
                    } else {
                        update(location, instance.arrivalTime);
                    }
                });
            });

            resolve();
        });
    }

    /**
     * Initialize the EmbedManager
     * This should only be called on ready for the Discord client
     */
    async init() {
        await this.#initDrivers();
        await this.#initMessages();
        await this.#initVans();
        await this.#initActive();
        await this.#initLocations();
        await this.#initLastAt();
        this.initialized = true;
    }

    /**
     * Generates a Manager message
     * @returns {{embeds: [...Embed], components: [...ActionRow]}}
     */
    #generateManager() {
        const embed = new EmbedBuilder()
            .setTitle("Duty Driver Manager")
            .setDescription("Use the buttons below to start a van or relieve a driver.")
            .setColor(0x4287f5);

        const relieve = new StringSelectMenuBuilder()
            .setCustomId("relieve-van")
            .setPlaceholder("Relieve a Van")
            .setMaxValues(1);

        if (this.active.length === 0) {
            relieve
                .setOptions({
                    label: "No drivers operating",
                    value: "0",
                })
                .setDisabled(true)
                .setPlaceholder("Unable to relieve (No vans operating)");
        } else {
            relieve.setOptions(
                ...this.active.map(x => {
                    return {
                        label: `${x.driver.name} (Van ${x.van.plate})`,
                        value: String(x.id),
                    }
                })
            )
        }

        let parked = this.vans.filter(x => x.status === "parked");
        let ooc = this.vans.filter(x => x.status === "ooc");

        if (parked.length > 0) {
            embed.addFields({
                name: "Parked Vans",
                value: codeBlock(parked.map(x => `Van ${x.plate} (${x.color})`).join("\n")),
                inline: true,
            });
        }

        if (ooc.length > 0) {
            embed.addFields({
                name: "OOC Vans",
                value: codeBlock(ooc.map(x => `Van ${x.plate} (${x.color})`).join("\n")),
                inline: true,
            });
        }

        let locationsStr = "";

        locations.forEach(location => {
            if (locationsStr !== "") locationsStr += "\n";

            if (this.active.find(x => x.lastLocation?.location === location && x.lastLocation?.arrivalTime !== null)) {
                locationsStr += `\`${location}\` at location: ${this.active.filter(x => x.lastLocation?.location === location && x.lastLocation?.arrivalTime !== null).map(x => `<@${x.driver.id}>`).join(", ")}`;
            } else {
                locationsStr += `\`${location}\` last visited `
    
                if (this.lastAt.hasOwnProperty(location)) {
                    locationsStr += `<t:${Math.floor(this.lastAt[location] / 1000)}:R>`;
                } else {
                    locationsStr += `a while ago`;
                }
            }
        })

        embed.addFields({
            name: "Location Rotation",
            value: locationsStr,
            inline: false,
        });

        if (this.active.length > 0) {
            embed.addFields({
                name: "Active Vans",
                value: this.active.map(x => 
                    "**Van " + x.van.plate + "** " + 
                    `<@${x.driver.id}> :|: ` +
                    (
                        x.lastLocation ?
                        (
                            x.lastLocation.arrivalTime === null ?
                            `started 🚐 driving to \`${x.lastLocation.location}\` <t:${Math.floor(x.lastLocation.startTime.getTime() / 1000)}:R>` :
                            `📍 arrived at \`${x.lastLocation.location}\` <t:${Math.floor(x.lastLocation.arrivalTime.getTime() / 1000)}:R>`
                        )
                        : "Unknown Location"
                    )
                    ).join("\n"),
                inline: false,
            })
        }

        const start = new ButtonBuilder()
            .setCustomId("start-van")
            .setLabel("Start Van")
            .setEmoji('🚐')
            .setStyle(ButtonStyle.Primary);

        const row1 = new ActionRowBuilder()
            .setComponents(relieve);

        const row2 = new ActionRowBuilder()
            .setComponents(start);

        return {embeds: [embed], components: [row1, row2]};
    }

    /**
     * Generates a Controller message
     * @param {DriverLog} log
     * @returns {{embeds: [...Embed], components: [...ActionRow]}}
     */
    generateController(log) {
        const embed = new EmbedBuilder()
            .setTitle("Duty Driver Controller")
            .setColor(0x4287f5);

        let components = [];

        if (!log.lastLocation || log.lastLocation?.arrivalTime !== null) {
            const head = new ButtonBuilder()
                .setCustomId("head")
                .setLabel("Head")
                .setEmoji('🚻')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(log.lastLocation?.location === "Head");

            const gas = new ButtonBuilder()
                .setCustomId("gas")
                .setLabel("Gas")
                .setEmoji('⛽')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(log.lastLocation?.location === "Gas");

            const secure = new ButtonBuilder()
                .setCustomId("secure-van")
                .setLabel("Secure Van")
                .setEmoji('🛑')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(head, gas, secure);

            const driveTo = new StringSelectMenuBuilder()
                .setCustomId("drive-to")
                .setMaxValues(1)
                .setPlaceholder("Select a location to drive to")
                .setOptions(
                    locations.map(x => {
                        return {
                            label: x,
                            value: x,
                            default: x === log.lastLocation?.location,
                        };
                    })
                );
            
            components = [
                new ActionRowBuilder()
                    .setComponents(driveTo),
                row,
            ]
        } else {
            const arrive = new ButtonBuilder()
                    .setCustomId("arrive")
                    .setLabel("Arrive at " + log.lastLocation.location)
                    .setEmoji('📍')
                    .setStyle(ButtonStyle.Primary);

            const cancel = new ButtonBuilder()
                    .setCustomId("cancel")
                    .setLabel("Cancel Drive")
                    .setEmoji('✖️')
                    .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(arrive);

            if (log.lastLastLocation) {
                row.addComponents(cancel);
            }

            components = [
                row
            ];
        }

        let locationsStr = "";

        locations.forEach(location => {
            if (locationsStr !== "") locationsStr += "\n";

            if (this.active.find(x => x.lastLocation?.location === location && x.lastLocation?.arrivalTime !== null)) {
                locationsStr += `\`${location}\` at location: ${this.active.filter(x => x.lastLocation?.location === location && x.lastLocation?.arrivalTime !== null).map(x => `<@${x.driver.id}>`).join(", ")}`;
            } else {
                locationsStr += `\`${location}\` last visited `
    
                if (this.lastAt.hasOwnProperty(location)) {
                    locationsStr += `<t:${Math.floor(this.lastAt[location] / 1000)}:R>`;
                } else {
                    locationsStr += `a while ago`;
                }
            }
        })

        embed.addFields({
            name: "Location Rotation",
            value: locationsStr,
            inline: false,
        });

        if (this.active.length > 0) {
            embed.addFields({
                name: "Active Vans",
                value: this.active.map(x => 
                    "**Van " + x.van.plate + "** " + 
                    `<@${x.driver.id}> :|: ` +
                    (
                        x.lastLocation ?
                        (
                            x.lastLocation.arrivalTime === null ?
                            `started 🚐 driving to \`${x.lastLocation.location}\` <t:${Math.floor(x.lastLocation.startTime.getTime() / 1000)}:R>` :
                            `📍 arrived at \`${x.lastLocation.location}\` <t:${Math.floor(x.lastLocation.arrivalTime.getTime() / 1000)}:R>`
                        )
                        : "Unknown Location"
                    )
                    ).join("\n"),
                inline: false,
            })
        }

        // const refresh = new ButtonBuilder()
        //     .setCustomId("refresh")
        //     .setLabel("Refresh")
        //     .setEmoji('🔃')
        //     .setStyle(ButtonStyle.Primary);

        // components = [
        //     ...components,
        //     new ActionRowBuilder()
        //         .addComponents(refresh),
        // ];

        return {embeds: [embed], components: components};
    }

    /**
     * Refreshes all messages
     * @returns {Promise<void>}
     */
    refreshMessages() {
        return new Promise((resolve, reject) => {
            if (!this.initialized) {
                reject("Manager not yet initialized");
                return;
            }

            let managerMessage = this.#generateManager()

            for (let i = 0; i < this.messages.length; i++) {
                let message = this.messages[i];
                if (message.type === "manager") {
                    message.message.edit(managerMessage);
                } else if (message.type === "driver") {
                    message.message.edit(this.generateController(this.active.find(x => x.driver.id === message.driver.id)));
                }
            }

            resolve();
        });
    }

    /**
     * Sends a manager embed to the specified channel
     * @param {TextChannel} channel 
     * @returns {Promise<Message>}
     */
    sendManagerEmbed(channel) {
        return new Promise((resolve, reject) => {
            if (!this.initialized) {
                reject("Manager not yet initialized");
                return;
            }
            channel.send(this.#generateManager()).then(message => {
                this.messages = [
                    ...this.messages,
                    new EmbedMessage(
                        message,
                        channel,
                        null,
                        "manager"
                    ),
                ];

                con.query("insert into message (id, channel, type) values (?, ?, 'manager');", [message.id, channel.id], err => {
                    if (err) console.error(err);
                });
                resolve(message);
            }, err => {
                reject(err);
            });
        });
    }

    /**
     * Sends a driver embed to the specified channel
     * @param {DMChannel} channel 
     * @param {DriverLog} driverLog
     * @returns {Promise<Message>}
     */
    sendDriverEmbed(channel, driverLog) {
        return new Promise((resolve, reject) => {
            if (!this.initialized) {
                reject("Manager not yet initialized");
                return;
            }
            
            channel.send(this.generateController(driverLog)).then(message => {
                this.messages = [
                    ...this.messages,
                    new EmbedMessage(
                        message,
                        channel,
                        driverLog.driver,
                        "driver"
                    ),
                ];

                con.query("insert into message (id, channel, driver_id, type) values (?, ?, ?, 'driver');", [message.id, channel.id, driverLog.driver.id], err => {
                    if (err) console.error(err);
                });
                resolve(message);
            }, err => {
                reject(err);
            });
        });
    }

    /**
     * Create a van
     * @param {string} plate
     * @param {string} color
     * @return {Promise<Van>}
     */
    createVan(plate, color) {
        return new Promise((resolve, reject) => {
            con.query("insert into van (plate, color, status) values (?, ?, 'parked');", [plate, color], async err => {
                if (!err) {
                    let van = new Van(plate, color, "parked");

                    this.vans = [
                        ...this.vans,
                        van,
                    ]

                    await this.refreshMessages();
                    resolve(van);
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Returns a van using a plate number
     * @param {string} plate 
     * @returns {Van}
     */
    getVan(plate) {
        return this.vans.find(x => x.plate.toLowerCase() === plate.toLowerCase());
    }

    /**
     * Returns a driver using an ID
     * @param {string} id 
     * @returns {Driver}
     */
    getDriver(id) {
        return this.drivers.find(x => x.id === id);
    }

    /**
     * Starts 'driver' driving 'van'
     * @param {Driver} driver
     * @param {Van} van
     * @param {DriverLog?} relief
     * @returns {Promise<Message>}
     */
    drive(driver, van, relief = null) {
        return new Promise(async (resolve, reject) => {
            if (van.status !== "parked") {
                reject("Van must be parked to start driving");
                return;
            }

            let activeLog = this.active.find(x => x.driver.id === driver.id);
            if (activeLog) {
                reject("Driver is already operating " + activeLog.van.plate);
                return;
            }

            let dmChannel = null;

            try {
                let user = await driver.getUser();
                dmChannel = await user.createDM();
            } catch(err) {
                reject(err);
                return;
            }
            
            if (!dmChannel) {
                reject("Unable to create DM channel");
                return;
            }
            
            con.query("insert into driver_log (driver_id, van_plate, relief) values (?, ?, ?);", [driver.id, van.plate, relief ? relief.id : null], err1 => {
                if (!err1) {
                    con.query("select id, start_time from driver_log where driver_id = ? and van_plate = ? and end_time is null;", [driver.id, van.plate], async (err1b, res) => {
                        if (!err1b) {
                            if (res.length > 0) {
                                let driverLog = new DriverLog(
                                    res[0].id,
                                    driver,
                                    van,
                                    new Date(res[0].start_time),
                                    null
                                );

                                this.active = [
                                    ...this.active,
                                    driverLog,
                                ];
                                van.status = "operating";

                                let message;
                                try {
                                    message = await this.sendDriverEmbed(dmChannel, driverLog);
                                } catch(err) {
                                    // Revert
                                    van.status = "parked"
                                    this.active = this.active.filter(x => x.id !== res[0].id);
                                    con.query("delete from driver_log where id = ?;", [res[0].id], err2 => {
                                        if (err2) console.error(err2);
                                    });
                                    reject(err);
                                    return;
                                }

                                driverLog.driveTo("Site").then(location => {
                                    location.arrive().catch(console.error);
                                }, console.error);

                                con.query("update van set status = 'operating' where plate = ?;", [van.plate], async err2 => {
                                    if (!err2) {
                                        await this.refreshMessages();

                                        resolve(message);
                                    } else {
                                        reject(err2);
                                    }
                                });
                            } else {
                                reject("Unable to retrieve driver log entry");
                            }
                        } else {
                            reject(err1b);
                        }
                    })
                } else {
                    reject(err1);
                }
            });
        });
    }

}

let manager = new EmbedManager();

global.manager = manager;

module.exports = manager;