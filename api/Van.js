const { Message } = require("discord.js");
const con = require("../database");
const Driver = require("./Driver");
const DriverLog = require("./DriverLog");

class Van {

    /**
     * Plate number for this van
     * @type {string}
     */
    plate;

    /**
     * Color of this van
     * @type {string}
     */
    color;

    /**
     * Status of the van
     * @type {"ooc"|"operating"|"parked"}
     */
    status;

    /**
     * Constructor for a Van object
     * @param {string} plate 
     * @param {string} color 
     * @param {"ooc"|"operating"|"parked"} status
     */
    constructor(plate, color, status) {
        this.plate = plate;
        this.color = color;
        this.status = status;
    }

    /**
     * Changes van status to OOC
     * @returns {Promise<void>}
     */
    ooc() {
        return new Promise((resolve, reject) => {
            if (this.status !== "parked") {
                reject(`Van ${this.plate} must be parked to make OOC`);
                return;
            }

            con.query("update van set status = 'ooc' where plate = ?;", [this.plate], async err => {
                if (!err) {
                    this.status = "ooc";
                    await global.manager.refreshMessages();
                    resolve();
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Changes van status to parked
     * @returns {Promise<void>}
     */
    park() {
        return new Promise((resolve, reject) => {
            con.query("update van set status = 'parked' where plate = ?;", [this.plate], async err => {
                if (!err) {
                    this.status = "parked";
                    await global.manager.refreshMessages();
                    resolve();
                } else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Changes van status to operating
     * @param {Driver} driver
     * @param {DriverLog?} relief 
     * @returns {Promise<Message>}
     */
    operate(driver, relief = null) {
        return global.manager.drive(driver, this, relief);
    }

}

module.exports = Van;
