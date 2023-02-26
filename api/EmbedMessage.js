const { TextBasedChannel, Message } = require("discord.js");
const Driver = require("./Driver");

class EmbedMessage {

    /**
     * Discord Message
     * @type {Message}
     */
    message;

    /**
     * Channel
     * @type {TextBasedChannel}
     */
    channel;

    /**
     * Driver
     * @type {Driver?}
     */
    driver;

    /**
     * Embed Message Type
     * @type {"manager"|"driver"}
     */
    type;

    /**
     * Constructor for an embed message
     * @param {Message} message 
     * @param {TextBasedChannel} channel
     * @param {Driver?} driver
     * @param {"manager"|"driver"} type 
     */
    constructor(message, channel, driver, type) {
        this.message = message;
        this.channel = channel;
        this.driver = driver;
        this.type = type;
    }

}

module.exports = EmbedMessage;