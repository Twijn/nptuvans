const con = require("../database");

const Driver = require("./Driver");
const Van = require("./Van");
const Location = require("./Location");

class DriverLog {

    /**
     * Surrogate ID for this driver log
     * @type {number}
     */
    id;

    /**
     * Driver object for this log
     * @type {Driver}
     */
    driver;

    /**
     * Van object for this log
     * @type {Van}
     */
    van;
    
    /**
     * Start time for this log entry
     * @type {Date}
     */
    startTime;

    /**
     * End time for this log entry
     * @type {Date?}
     */
    endTime;

    /**
     * Cache for reinstating the previous location if the one before it is deleted.
     * @type {Location?}
     */
    lastLastLocation = null;

    /**
     * Last location for this driver log
     * @type {Location?}
     */
    lastLocation = null;

    /**
     * Constructor for a DriverLog entry
     * @param {number} id 
     * @param {Driver} driver 
     * @param {Van} van 
     * @param {Date} startTime 
     * @param {Date?} endTime 
     */
    constructor(id, driver, van, startTime, endTime) {
        this.id = id;
        this.driver = driver;
        this.van = van;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    /**
     * Retrieves the last location for this log, if present
     * @return {Promise<Location?>}
     */
    getLastLocation() {
        return new Promise((resolve, reject) => {
            con.query("select * from location_log where driverlog_id = ? order by start_time desc limit 2;", [this.id], (err, res) => {
                if (err) {
                    reject(err);
                } else {
                    if (res.length >= 1) {
                        if (res.length === 2) {
                            this.lastLastLocation = new Location(
                                res[1].id,
                                this,
                                res[1].location,
                                new Date(res[1].start_time),
                                res[1].arrival_time ? new Date(res[1].arrival_time) : null
                            );
                        }

                        this.lastLocation = new Location(
                            res[0].id,
                            this,
                            res[0].location,
                            new Date(res[0].start_time),
                            res[0].arrival_time ? new Date(res[0].arrival_time) : null
                        );
                        resolve(this.lastLocation);
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    }

    /**
     * Drives to a specific location
     * @param {"Site"|"Gravel Lot"|"Wharf Alpha"|"Gas"|"Head"} location
     * @returns {Promise<Location>}
     */
    driveTo(location) {
        return new Promise((resolve, reject) => {
            if (this.lastLocation?.location === location) {
                reject("Unable to drive to the same location");
                return;
            }
            
            con.query("update location_log set arrival_time = now() where driverlog_id = ? and arrival_time is null;", [this.id], err => {
                if (err) console.error(err);

                con.query("insert into location_log (driverlog_id, location) values (?, ?);", [this.id, location], err => {
                    if (!err) {
                        con.query("select id, start_time from location_log where driverlog_id = ? and location = ? and arrival_time is null order by start_time desc limit 1;", [this.id, location], async (err, res) => {
                            if (!err) {
                                if (res.length > 0) {
                                    this.lastLastLocation = this.lastLocation;
                                    this.lastLocation = new Location(
                                        res[0].id,
                                        this,
                                        location,
                                        new Date(res[0].start_time),
                                        null
                                    );
                                    global.manager.locations = [
                                        this.lastLocation,
                                        ...global.manager.locations,
                                    ]
                                    if (this.lastLastLocation)
                                        global.manager.lastAt[this.lastLastLocation.location] = new Date().getTime();
                                    await global.manager.refreshMessages();
                                    resolve(this.lastLocation);
                                } else {
                                    reject("Unable to find created location");
                                }
                            } else {
                                reject(err);
                            }
                        });
                    } else {
                        reject(err);
                    }
                });
            });
        });
    }

    /**
     * Cancels the current drive and reverts the location back to the previous
     * @returns {Promise<Location>}
     */
    cancelDrive() {
        return new Promise((resolve, reject) => {
            if (!this.lastLastLocation) {
                reject("No location is stored to revert to");
                return;
            }

            if (this.lastLocation.arrivalTime !== null) {
                reject("You have already arrived at the location");
                return;
            }

            con.query("delete from location_log where id = ?;", [this.lastLocation.id], async err => {
                if (!err) {
                    global.manager.locations = global.manager.locations.filter(x => x.id !== this.lastLocation.id);
                    
                    this.lastLocation = this.lastLastLocation;
                    this.lastLastLocation = null;

                    await global.manager.refreshMessages();
                    resolve(this.lastLocation);
                } else {
                    reject(err);
                }
            });
        })
    }

    /**
     * Secures the van
     * @param {boolean} relieved
     * @returns {Promise<void>}
     */
    secure(relieved = false) {
        return new Promise((resolve, reject) => {
            if (this.lastLocation.arrivalTime === null) this.lastLocation.arrive().catch(console.error);

            global.manager.active = global.manager.active.filter(x => x.id !== this.id);

            con.query("update driver_log set end_time = now() where id = ?;", [this.id], err => {
                if (!err) {
                    let messages = global.manager.messages.filter(x => x.driver?.id === this.driver.id);

                    messages.forEach(message => {
                        message.message.delete().catch(() => {});
                    });

                    global.manager.messages = global.manager.messages.filter(x => x.driver?.id !== this.driver.id);
                    con.query("delete from message where driver_id = ?;", [this.driver.id], err => {
                        if (!err) {
                            this.van.park().then(resolve, reject);
                        } else {
                            reject(err);
                        }
                    });
                } else {
                    reject(err);
                }
            });
        });
    }

}

module.exports = DriverLog;
