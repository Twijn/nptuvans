const { User, Message } = require("discord.js");
const DriverLog = require("./DriverLog");
const Van = require("./Van");

class Driver {

    /**
     * Discord ID for this driver
     * @type {string}
     */
    id;

    /**
     * Name of the driver
     * @type {string}
     */
    name;

    /**
     * Constructor for a new Driver
     * @param {string} id 
     * @param {string} name 
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    /**
     * Returns the User object for this driver
     * @returns {Promise<User>}
     */
    getUser() {
        return global.discord.users.fetch(this.id);
    }

    /**
     * Start driving a van
     * @param {Van} van 
     * @param {DriverLog?} relief 
     * @returns {Promise<Message>}
     */
    drive(van, relief = null) {
        return global.manager.drive(this, van, relief);
    }

}

module.exports = Driver;
