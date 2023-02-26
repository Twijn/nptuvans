const con = require("../database");

const DriverLog = require("./DriverLog");

class Location {

    /**
     * Location surrogate ID
     * @type {number}
     */
    id;

    /**
     * Drive log for this location
     * @type {DriverLog}
     */
    driverLog;

    /**
     * Location for this log entry
     * @type {"Site"|"Gravel Lot"|"Wharf Alpha"|"Gas"|"Head"}
     */
    location;

    /**
     * Driving start time
     * @type {Date}
     */
    startTime;

    /**
     * Driving arrival time
     * @type {Date?}
     */
    arrivalTime;

    /**
     * Constructor for a new location
     * @param {number} id
     * @param {DriverLog} driverLog 
     * @param {"Site"|"Gravel Lot"|"Wharf Alpha"|"Gas"|"Head"} location 
     * @param {Date} startTime 
     * @param {Date?} arrivalTime 
     */
    constructor(id, driverLog, location, startTime, arrivalTime) {
        this.id = id;
        this.driverLog = driverLog;
        this.location = location;
        this.startTime = startTime;
        this.arrivalTime = arrivalTime;
    }

    /**
     * Sets the location as arrived
     * @returns {Promise<Location>}
     */
    arrive() {
        return new Promise((resolve, reject) => {
            if (this.arrivalTime !== null) {
                reject("Already arrived at location " + this.location);
                return;
            }

            con.query("update location_log set arrival_time = now() where id = ?;", [this.id], err => {
                if (!err) {
                    con.query("select arrival_time from location_log where id = ?;", [this.id], async (err2, res) => {
                        if (!err2) {
                            if (res.length > 0) {
                                this.arrivalTime = new Date(res[0].arrival_time);
                                global.manager.lastAt[this.location] = new Date().getTime();
                                await global.manager.refreshMessages();
                                resolve(this);
                            } else {
                                reject("Unable to find location");
                            }
                        } else {
                            reject(err2);
                        }
                    });
                } else {
                    reject(err);
                }
            });
        });
    }
}

module.exports = Location;
