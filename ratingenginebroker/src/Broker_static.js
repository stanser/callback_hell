var gen = require('../node_modules/kwbl-gen');
var util = require('../node_modules/util');
var REngError = require('./error.js');
var config = require('../config');

/** @class BrokerStatic
* Contains subsidiary methods
*/

var BrokerStatic = {
    
    /** Calculates ammount of Object properties 
    * @param {object} obj - properties of this one will be calculated
    * @return {integer} length - ammount of properties
    */
    getObjectLength: function(obj) {
        var length = 0;
        var key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) length++;
        }
        return length;
    },
    
    /** Validates integer arguments; 
    * @param {object} obj - properties of this object will be validated
    * @param {array} defaulValues - matching default values
    * Tries to convert arguments to Integer, if fails takes default value 
    *
    * If ammount of obj's properties and default values array have different length
    * incoming obj becomes null
    */
    validateIntegerArguments: function(obj, defaultValues) {
        console.log('Validation ...');
        if (BrokerStatic.getObjectLength(obj) != defaultValues.length) {
            console.log('defineIntArguments: Accepted parameters have different length');
            obj = null;
            return;
        }
        var value;
        for (var prop in obj) {
            if (defaultValues.length === 0) {
                return obj;
            }
            value = defaultValues.shift();
            obj[prop] =  parseInt(obj[prop]);
            if (isNaN(obj[prop])) {
                obj[prop] = value;
                console.log ("  '%s' will be set by default", prop);
            }
            if (obj[prop] < 0) {
                obj[prop] = obj[prop] * (-1);
                console.log ("  '%s' will be convert to positive", prop);
            }
        }
    },

    /** @method _onPublish
    * @param {string} key - routingKey of message has been published
    * @param {object} val - matching body of message
    * @return {function} - error handler
    */
    _onPublish: function(key, val) {
        /** @callback BrokerStatic~_onPublish
        * Callback for exchange.publish (if exchange is in confirm mode)
        * 
        * @param {bool} isErrorOccured is the presense of an error. 
        *    true means an error occured
        *    false means publishing was successful
        */
        return function(isErrorOccured) {
            if (!isErrorOccured){
                console.log ('Message has been sent. routingKey = %s, call_id = %s', 
                             key, val.payload['Acct-Session-Id']);
            }
            if (isErrorOccured) {
            var strNotice = util.format('routingKey = %s, body = %s', 
                                         key, JSON.stringify(val));
            var optionsError = {code: 'MSNPUB', 
                                invalid: 'publish', 
                                description: 'message was not sent to queue', 
                                source: 'BrokerStatic._onPublish',
                                notice: strNotice};
            var error = new REngError(optionsError);
            error.log();
            }
        }
    },
    
    /** Stops connection with Rabbit MQ
    * @param {object} broker - the main instance
    */
    stopConnection: function(broker) {
        console.log("Disconnected");
        broker.connection.disconnect();
    },
    
    /** Creates a routing key for messages
    * @param {string} type === 'start' || 'stop'
    * @return {string} key - routing key like 'call.start' || 'call.stop'
    */
    makeRoutingKeyOfMsg: function (type) {
        var key;
        switch (type){
            case 'start': {
                key = "call.start";
                break;
            }
            case 'stop': {
                key = "call.stop";
                break;
            }
            default: {
                var optionsError = {code: 'IRTKY', 
                                    invalid: 'routingKey', 
                                    description: 'incorrect routing key specified', 
                                    location: 'BrokerStatic.makeRoutingKeyOfMsg'};
                var error = new REngError(optionsError);
                error.log('nostack');
                break;
            }
        }
        return key;
    },
    
    /** Creates a payload part of message
    * @param {string} callId
    * @param {integer} keyFrom - key for array to set "From" fields
    * @param {integer} keyTo - key for array to set "To" fields
    * @param optional {integer} duration - call duration
    * @return {object} msg - message for publishing to RabbitMQ {payload: {}}
    */    
    makePayloadOfMsg: function(callId, keyFrom, keyTo, duration) {
        var shift = duration ? duration * 1000 : 0;
        var type = duration ? 'stop' : 'start'; 
        var phoneSet = ["+12345678900", 
                        "+31235248131", 
                        "+81653868523", 
                        "+71528225620", 
                        "+11528246210", 
                        "Anonymous"];
        var sipFromTagSet = ["AaAaAaAaAaAaA",
                             "BbBbBbBbBbBbB",
                             "CcCcCcCcCcCcC",
                             "DdDdDdDdDdDdD",
                             "EeEeEeEeEeEeE",
                             "FfFfFfFfFfFfF"];
        var sipUserAgentSet = ["Tele2-ASD", "FreeSWITCH-mod_sofia/1.2.17~64bit"];
        var timestamp = new Date();
        var eventTimestamp = timestamp.getTime() + shift;
        
        var msg = {
            payload: { 
                "Sip-To-User": phoneSet[keyTo],
                "Acct-Session-Id": String(callId),
                "Service-Type": "Sip-Session",
                "Sip-From-User": phoneSet[keyFrom],
                "Acct-Status-Type": type.replace("s", "S"),
                "Sip-Method": (type === "start") ? "INVITE" : "BYE",
                "Sip-From-Tag": sipFromTagSet[keyFrom],
                "NAS-IP-Address": "10.60.4.136",
                "Sip-To-Tag": String(gen.uid(13)),
                "Sip-User-Agent": gen.random(sipUserAgentSet),
                "Sip-Call-ID": String(callId),
                "Event-Timestamp": BrokerStatic.getAbbrDateString(eventTimestamp),
                "Sip-Response-Code": "200",
                "action": type,
                "type": "raw",
                "NAS-Port": "5060",
                "Acct-Delay-Time": "0"
            }
        }
        return msg;
    },
    
    /** @method getAbbrDateString
    * Converts usual date format to format with timezone's abbreviation
    * @param {integer} timestamp - timestamp in unix time format (in ms from Jan 01 1970) 
    * @return {string} timestring - date in timezone's abbreviation format (see example)
    * @example 
    *   date = 'Tue Jan 06 2015 16:21:01 GMT+0200 (EET)';
    *   getAbbrDateString(date) === 'Jan 06 2015 16:21:01 CEST';
    *
    */
    getAbbrDateString: function(timestamp) {
        var timestring = String(new Date(timestamp));
        var firstSpacePosition = timestring.indexOf(' ');
        var gmtPosition = timestring.indexOf('GMT');
        timestring = timestring.substring(firstSpacePosition + 1, gmtPosition);
        timestring = timestring.concat('CEST');        
        return timestring;
    },
    
    /** Prepares the pair of messages which emulates the Call 
    * oCall = {call.*: {payload: {...}}} where * is 'start' or 'stop'
    *
    * oCall['call.start'] and oCall['call.stop'] have different timestamp. 
    * Random duration defines interval between timestamps
    * Defines keys for arrays of data which will be used in invoked method
    *
    * @return {object} as described above
    */
    setCall: function() {
        var oCall = {};
        var callId = gen.uuid();
        var keyFrom = gen.random(5);
        var keyTo = gen.random(4);
        while (keyFrom === keyTo) {
            var keyTo = gen.random(4);
        }
        
        //TODO for developing 
        var duration = config.testMode.enable ? config.testMode.callDuration : gen.duration();

        var start_key = BrokerStatic.makeRoutingKeyOfMsg('start');
        oCall[start_key] = BrokerStatic.makePayloadOfMsg(callId, keyFrom, keyTo);

        var stop_key = BrokerStatic.makeRoutingKeyOfMsg('stop');
        oCall[stop_key] = BrokerStatic.makePayloadOfMsg(callId, keyFrom, keyTo, duration);

        return oCall;
    },

    /** Creates invalid messages inside call. 
    * @param {string} mistake === 'negative_duration' || 'undefined_start' 
    * Message is invalid if  
    *   start.timestamp > stop.timestamp 
    *   start = undefined (is absent: no specific call_id in database)
    * Only start messages may be invalid. 
    *
    * @return {object} oCall - pair of invalid messages (start and stop) 
    * Returns null if wrong mistake was specified
    */
    createInvalidCall: function(mistake) {
        var startDateInvalid;
        var oCall = BrokerStatic.setCall();
        switch (mistake) {
            case 'negative_duration': {
                //makes duration negative: just adds to stop timestamp some value (2000 ms)
                var timestring = oCall['call.stop'].payload['Event-Timestamp'];
                var stopDate = Date.parse(timestring);
                if (isNaN(stopDate)) {
                    stopDate = BrokerStatic.getGMTDateInMs(timestring);
                    startDateInvalid = BrokerStatic.getAbbrDateString(stopDate + 2000);
                } else {
                    startDateInvalid = String(new Date(stopDate + 2000));
                }
                oCall['call.start'].payload['Event-Timestamp'] = startDateInvalid;
                break;
            }
            case 'undefined_start': {
                //changes call_id of start message
                do {
                    var startCallId = oCall['call.start'].payload['Acct-Session-Id'];
                    oCall['call.start'].payload['Acct-Session-Id'] = startCallId.replace('-', '*'); 
                } while (startCallId.indexOf('-') > 0); 
                break;
            }
            default: {
                console.log ('unknown_mistake');
                return null;
            }
        }
        return oCall;
    }, 
    
    /** @method getGMTDateInMs
    * @param {string} timestring - date contains timezone abbreviation (CEST er CET)
    * @return {string} date if parsing was successful or null otherwise
    */
    getGMTDateInMs: function (timestring) {
        var patt = new RegExp(/[A-Z]{3,4}(?!\+)/);  
        var unknTimeZone = patt.exec(timestring);
        var correctTimeZone;
        var date, dateParsed; 
        if (unknTimeZone) {
            correctTimeZone = BrokerStatic.getGMTZone(unknTimeZone[0]);
            date = timestring.replace(unknTimeZone[0], correctTimeZone);
            dateParsed = Date.parse(date);  
        }
        if (dateParsed) return dateParsed;
        return null;
    },
    
    /** @method getDurationInMs
    * Parses timestamp string to find timezone abbreviation;
    * Calculates duration of call
    * @param {object} messages - pair of start-stop messages 
    *       messages['call.start'] === {payload: {}}
    *       messages['call.stop'] === {payload: {}}
    * @return {integer} duration in milliseconds
    */
    getDurationInMs: function(messages) {
        var timestamps = {};
        var currentDate;
        var currentDateInMs;
        for (key in messages) {
            currentDate = messages[key].payload["Event-Timestamp"];
            var currentDateInMs = Date.parse(currentDate);
            if (isNaN(currentDateInMs)) 
                timestamps[key] = BrokerStatic.getGMTDateInMs(currentDate);
            else
                timestamps[key] = currentTimestamp;
        }
        return timestamps['call.stop'] - timestamps['call.start'];
     },
    
    /** @method getGMTZone
    * @param {string} timezone - timezone abbreviation
    * @return {string} validTimeZone  -timezone in GMT format
    */
    getGMTZone: function(timezone) {
        var GMTTimeZone = null;
        if (config.timeZoneOffset.hasOwnProperty(timezone)) {
            GMTTimeZone = 'GMT+0' + config.timeZoneOffset[timezone] + '00';
        }
        return GMTTimeZone;
    }
}

module.exports = BrokerStatic;