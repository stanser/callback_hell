var util = require('../../node_modules/util');
var gen = require('../../node_modules/kwbl-gen'); 
var config = require('../../config');
var REngError = require('./error.js');

/** @class MessageUtils
* @constructor
*
* Contains static method for Consumer
*/
var MessageUtils = {
    /** @method getStartDoc
    * @static
    * Generates doc for Couch DB
    * @param {string} routingKey
    * @param {object} payload ~ message.payload
    * @return {object} startDoc - information about start of call
    */
    getStartDoc: function(routingKey, payload) {
        var startDoc = {session: payload['Acct-Session-Id'],
                        start: payload,
                        created: gen.couchTimeStamp()};
        return startDoc;
    },
    
    
    /** @method checkTimestamp
    * Validates message's timestamp property. 
    * If timstamp is object in kwebbl-gen format logs warning without error
    * @param {object} obj - object is needed to be checked ~ msg.payload
    * @return {REngError} error if some issues exists or null otherwise
    */
    checkTimestamp: function(obj) {
        var date;
        var optionsError;
        var error;
        var dateParsed;
        if (!obj.hasOwnProperty('Event-Timestamp')) {
            return MessageUtils.setMissingPropertyError('Event-Timestamp');
        } 
        
        var timestamp = obj["Event-Timestamp"];
        if (typeof(timestamp) === 'object') {
            if (!timestamp.hasOwnProperty('t')) {
                return MessageUtils.setMissingPropertyError('Event-Timestamp' + '[t]');
            }            
            error = MessageUtils.checkTimeInMs(timestamp['t']);
            if (error) return error;
            
            var warning = new REngError({code: 'WARN', 
                                         invalid: 'timestamp', 
                                         description: 'timestamp is object', 
                                         location: 'MessageUtils.checkTimestamp'});
            warning.log();
            return null;
        }
        if (typeof(timestamp) === 'string') {                
            dateParsed = Date.parse(timestamp);
            if (!isNaN(dateParsed)) return MessageUtils.checkTimeInMs(dateParsed); 
            
            if (MessageUtils.setTimestampISO(obj)) return null;
            
            optionsError = {code: 'ITMSMP', 
                            invalid: 'timestamp', 
                            description: 'timestamp property is invalid', 
                            location: 'MessageUtils.checkTimestamp'};
            error = new REngError(optionsError);
            error.log();
            return error;
        }
    },
    
    /** @method setTimestampISO
    * Parses timestamp string to find timezone abbreviation;
    * Adds "Event-Timestamp-ISO" field to message if parsing was successful
    * @param {object} obj - object is needed to be checked ~ msg.payload
    * @return {bool} - true if result is successful
    */
    setTimestampISO: function(obj) {
        var dateParsed;
        var date;
        var patt;
        var unknTimeZone;
        var correctTimeZone;
        
        patt = new RegExp(/[A-Z]{3,4}(?!\+)/);
        unknTimeZone = patt.exec(obj["Event-Timestamp"]);
        if (unknTimeZone) {
            correctTimeZone = MessageUtils.getGMTZone(unknTimeZone[0]); 
            if (!correctTimeZone) return false;
            dateParsed = Date.parse(obj["Event-Timestamp"].replace(unknTimeZone[0], 
                                                                   correctTimeZone));   
            if (!isNaN(dateParsed)) {
                date = new Date(dateParsed);
                obj["Event-Timestamp-ISO"] = date.toISOString();
                return true;
            }
        }
        return false;
    },
    
    /** @method checkTimeInMs
    * @param {integer} timestamp - timestamp in milliseconds
    * @return {REngError} error if timestamp doesn't consists of 13 digits or null otherwise
    *
    * TODO 1325376000000 === Jan 01 2012 00:00:00 GMT+0000 
    * Compartion added because Date.parse in checkTimestamp works strange: 
    *       Date.parse('12') === 1007157600000 (01/11/2001 00:00 gmt+0200)
    */
    checkTimeInMs: function(timestamp) {
        var patt = new RegExp(/^[0-9]{13}/);
        var date = patt.exec(String(timestamp));
                             
        if (date && date >= 1325376000000) return null;
        
        var optionsError = {code: 'ITMSMP', 
                            invalid: 'timestamp', 
                            description: 'timestamp value in ms is invalid', 
                            location: 'MessageUtils.checkTimeInMsc'};
        var error = new REngError(optionsError);
        error.log();
        return error;
    },
    
    /** @method checkDuration
    * @param {object} docStart - doc with start message info from db;
    * @param {object} payloadStop - payload of stop message from Rabbit mq;
    * @return {REngError} error if some issues exists or null otherwise;
    */
    checkDuration: function(docStart, payloadStop) {
        var error;
        var optionsError;
        
        /*error = MessageUtils.checkTimestamp(docStart);
        if (error) return error;
        
        error = MessageUtils.checkTimestamp(payloadStop);
        if (error) return error;*/
        
        var duration = MessageUtils.calculateDuration(docStart, payloadStop);
        if (duration >= 0) return null;
        
        optionsError = {code: 'IDUR', 
                        invalid: 'duration', 
                        description: 'duration is negative', 
                        location: 'MessageUtils.checkDuration'};
        error = new REngError(optionsError);
        error.log();
        return error;
    },
    
    /** @method getTimestampPropertyName
    * @param {object} payload - payload of message from Rabbit mq;
    * @return {string} - timestamp property name should used to calculate duration;
    *
    * if timestamp is kwebbl couch object 
    *    parses and creates new message field with string ISO format
    */
    getTimestampPropertyName: function(payload) {
        if (!payload.hasOwnProperty('Event-Timestamp')) {
            MessageUtils.setMissingPropertyError('Event-Timestamp');
            return;
        }  
        if (payload.hasOwnProperty('Event-Timestamp-ISO')) {
            return 'Event-Timestamp-ISO';
        }
        if (payload['Event-Timestamp'].hasOwnProperty('t')) {
            var date = new Date(payload['Event-Timestamp']['t']);
            payload['Event-Timestamp-ISO'] = date.toISOString();
            return 'Event-Timestamp-ISO';
        }
        return 'Event-Timestamp'; 
    },
    
    /** @method checkSipMethod
    * @param {object} payload - payload of message from Rabbit mq
    * @return {REngError} error if some issue exists or null otherwise
    */
    checkSipMethod: function(payload) {
        if (!payload.hasOwnProperty('action')) {
            return MessageUtils.setMissingPropertyError('action');
        }
        
        if (!payload.hasOwnProperty('Sip-Method')) { 
            return MessageUtils.setMissingPropertyError('Sip-Method');
        } 
        
        var error;
        var optionsError = {code: 'ISPMTD', 
                            invalid: 'Sip-Method', 
                            description: '', 
                            location: 'MessageUtils.checkSipMethod'};
        
        if (payload["action"] === 'start' && payload["Sip-Method"] === "INVITE") return null;
        else if (payload["action"] === 'stop' && payload["Sip-Method"] === "BYE") return null;
        else {
            optionsError.description = payload["action"] + 
                                       ' has Sip-Method = ' +   
                                       payload["Sip-Method"];
            optionsError.notice = 'Acct-Session-Id = ' + payload["Acct-Session-Id"]
        }
        error = new REngError(optionsError);
        error.log();
        return error;
    },
    
    /** @method getGMTZone
    * @param {string} timezone - timezone abbreviation
    * @return {string} GMTTimeZone  - timezone in GMT format or null if it is unknown
    */
    getGMTZone: function(timezone) {
        var GMTTimeZone = null;
        var warning = new REngError({
            code: 'WARN', 
            invalid: 'timezone', 
            description: 'timezone abbreviation used in date', 
            location: 'MessageUtils.getGMTZone',
            notice: 'abbreviation is unknown: ' + timezone
        });
        
        if (config.timeZoneOffset.hasOwnProperty(timezone)) {
            GMTTimeZone = 'GMT+0' + config.timeZoneOffset[timezone] + '00';
            warning.notice = timezone + ' is parsed as ' + GMTTimeZone;
        }
        warning.log();
        return GMTTimeZone;
    },
    
    /** @method checkPhones
    * @param {object} payload - payload of message from Rabbit mq
    * @return {REngError} error if some issues exists or null otherwise
    *
    * Check phone's numbers: should consist of 8-15 digits, '+' is optional
    * If both properties are missing returns one error where error.invalid is array of 2
    * If both numbers are invalid, returns one error with last one
    */
    checkPhones: function(payload) {
        var error = null;
        var optionsError = null;
        var properties = [];
        
        if (!payload.hasOwnProperty("Sip-To-User")) properties.push("Sip-To-User");
        if (!payload.hasOwnProperty("Sip-From-User")) properties.push("Sip-From-User");
        if (properties.length > 0) {
            return MessageUtils.setMissingPropertyError(properties);
        }
        
        if (payload["Sip-To-User"] === payload["Sip-From-User"]) {
            optionsError = {code: 'IPHN', 
                            invalid: 'phone number', 
                            description: 'Sip-To-User === Sip-From-User', 
                            location: 'MessageUtils.checkPhones'};
            error = new REngError(optionsError);
            error.log();
            return error;
        }
        
        var phonesParsed = {};
        var patt = new RegExp(/^\+?([0-9]{8,15})$/);
        phonesParsed["Sip-To-User"] = patt.test(payload["Sip-To-User"]);
        phonesParsed["Sip-From-User"] = patt.test(payload["Sip-From-User"]);
        for (var key in phonesParsed) {
            if (key === "Sip-From-User" && payload[key] === "Anonymous") continue;
            if (!phonesParsed[key]) {
                optionsError = {code: 'IPHN', 
                                invalid: key, 
                                description: 'invalid format: ' + payload[key], 
                                location: 'MessageUtils.checkPhones'};
                error = new REngError(optionsError);
                error.log();
            }
        }
        return error;
     },
    
    /** @method setMissingPropertyError
    * @param {string} property - missed property
    * @return {REngError} error about property is missed
    */    
    setMissingPropertyError: function(property) {
        var optionsError = {code: 'MISPROP', 
                            invalid: property, 
                            description: 'property missing', 
                            location: 'Consumer checking methods'};
        var error = new REngError(optionsError);
        error.log();
        return error;
    },
    
    /** @method createStartStopDoc
    * Merges start doc with stop information from stop-message;
    * Creates {object} new doc for CouchDb updating;
    * @param {object} startDocObj - the doc from Couch with start msg information;
    * @param {object} stopMsgPayload - payload of stop message received from RabbitMQ;
    *
    * @return {object} docStartStop - merged doc for whole call
    */
    createStartStopDoc: function(startDocObj, stopMsgPayload) {
        var docStartStop = startDocObj;
        docStartStop.stop = stopMsgPayload;
        docStartStop.duration = MessageUtils.calculateDuration(startDocObj.start,
                                                                 stopMsgPayload);
        docStartStop.modified = gen.couchTimeStamp();    
        return docStartStop;
     }, 
    
    /** @method calculateDuration
    * Calculates duration of call.
    * @param {object} startObj - contains fields of start message ( ~ message.payload)
    * @param {object} stopObj - contains fields of stop message ( ~ message.payload)
    * @return {integer} duration in seconds
    * (division by 1000 because timestamps are calculated in ms)
    */
    calculateDuration: function(startObj, stopObj) {
        var keyStart = MessageUtils.getTimestampPropertyName(startObj);
        var keyStop = MessageUtils.getTimestampPropertyName(stopObj);
        
        var dateStart = Date.parse(startObj[keyStart]);
        var dateStop = Date.parse(stopObj[keyStop]);
        var delay = parseInt(stopObj['Acct-Delay-Time']);
        if (isNaN(delay)) delay = 0; //TODO ask Yura))
        
        var duration = (dateStop - dateStart) / 1000;
        
        if (duration >= delay) duration = duration - delay; 
        return duration;
    }
}

module.exports = MessageUtils;  