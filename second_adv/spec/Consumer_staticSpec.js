var jasmine = require ('../node_modules/jasmine-node');

//------------
//node_modules/jasmine-node/bin/jasmine-node ---> node-jasmine module's location
//------------

var ConsumerStatic = require('../src/Consumer_static');
var REngError = require('../src/error');
var msg;
var msgStart, msgStop;
var options, optionsError;
var error, errorSet;

// -------Validation-----------------

describe("ConsumerStatic.checkTimestamp", function() { 
     beforeEach(function() {
        msg = {
            payload: { 
                "Sip-To-User": '+12345678900',
                "Acct-Session-Id": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Service-Type": "Sip-Session",
                "Sip-From-User": '+31653868523',
                "Acct-Status-Type": "Start",
                "Sip-Method": "INVITE",
                "Sip-From-Tag": "HK62N8N9NrmSj",
                "NAS-IP-Address": "10.60.4.136",
                "Sip-To-Tag": "SDls7t999-b1261304806132014711132859",
                "Sip-User-Agent": 'FreeSWITCH-mod_sofia/1.2.17~64bit',
                "Sip-Call-ID": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Event-Timestamp": 'Jul 11 2014 13:29:58 CEST',
                "Sip-Response-Code": "200",
                "action": "start",
                "type": "raw",
                "NAS-Port": "5060",
                "Acct-Delay-Time": "0"
            }
        }
    });
    
    it ("should be a function", function () {
        expect(ConsumerStatic.checkTimestamp).toEqual(jasmine.any(Function));   
    });
    
    it("should return REngError if msg.payload['Event-Timestamp'] is missed", function() {
        delete (msg.payload["Event-Timestamp"]);

        var res = ConsumerStatic.checkTimestamp(msg.payload);
        expect(res instanceof REngError).toBe(true);
    });
    
    it("should return null if msg.payload['Event-Timestamp']" +
       " is object in Kwebbl-gen format", function() {
        msg.payload["Event-Timestamp"] = {"t": 1419350815635,
                                           "Y": 2014,
                                           "M": 12,
                                           "D": 23,
                                           "h": 18,
                                           "m": 6,
                                           "s": 55,
                                           "z": "UTC+2"};
        var res = ConsumerStatic.checkTimestamp(msg.payload);
        expect(res).toBeNull();        
    });
    
    it("should return error if msg.payload['Event-Timestamp']['t'] = sdfsdf" +
       " is object in Kwebbl-gen format", function() {
        msg.payload["Event-Timestamp"] = {"t": 'sdfsdf'};
        var res = ConsumerStatic.checkTimestamp(msg.payload);
        expect(res instanceof REngError).toBe(true);
        expect(res.description).toBe('timestamp value in ms is invalid');
    });
    
    it("should return null if time format is 'Jul 11 2014 13:29:58 CEST'",
       function() {
        var res = ConsumerStatic.checkTimestamp(msg.payload);
        expect(res).toBeNull(); 
        expect(msg.payload.hasOwnProperty('Event-Timestamp-ISO')).toBe(true);
    });
    
    it("should return error if time format is 'asdasd'",
       function() {
        msg.payload["Event-Timestamp"] = 'asdasd';
        var res = ConsumerStatic.checkTimestamp(msg.payload);
        expect(res instanceof REngError).toBe(true);
        expect(msg.payload.hasOwnProperty('Event-Timestamp-ISO')).toBe(false);
        expect(res.description).toBe('timestamp property is invalid');
    });
    
    it("should return error if timestamp format is incorrect",
       function() {
        msg.payload["Event-Timestamp"] = '12';
        var res = ConsumerStatic.checkTimestamp(msg.payload);
        expect(res instanceof REngError).toBe(true);
    });
});

describe("ConsumerStatic.checkDuration", function() { 
     beforeEach(function() {
        msgStart = {
            payload: { 
                "Sip-To-User": '+12345678900',
                "Acct-Session-Id": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Sip-From-User": '+31653868523',
                "Sip-Method": "INVITE",
                "Sip-From-Tag": "HK62N8N9NrmSj",
                "Sip-Call-ID": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Event-Timestamp": 'Jul 11 2014 13:29:58 CEST',
                "Sip-Response-Code": "200",
                "action": "start",
                "Acct-Delay-Time": "0"
            }
         };
         
         msgStop = {
            payload: { 
                "Sip-To-User": '+12345678900',
                "Acct-Session-Id": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Sip-From-User": '+31653868523',
                "Sip-Method": "BUY",
                "Sip-From-Tag": "HK62N8N9NrmSj",
                "Sip-Call-ID": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Event-Timestamp": 'Jul 11 2014 13:29:58 CEST',
                "Sip-Response-Code": "200",
                "action": "stop",
                "Acct-Delay-Time": "0"
            }
        };
    });
    
    it("should return error if duration is negative",
       function() {
        console.log('rror if duration is negative');
        msgStart.payload["Event-Timestamp"] = 'Jul 11 2014 13:31:58 CEST';
        msgStop.payload["Event-Timestamp"] = 'Jul 11 2014 13:29:58 CEST';
        var res = ConsumerStatic.checkDuration(msgStart.payload, msgStop.payload);
        expect(res instanceof REngError).toBe(true);
    });
    
    it("should return error if timestapms is invalid",
       function() {
        console.log('error if timestapms is invalid');
        msgStart.payload["Event-Timestamp"] = '12';
        msgStop.payload["Event-Timestamp"] = 'Jul 11 2014 13:29:58 CEST';
        var res = ConsumerStatic.checkDuration(msgStart.payload, msgStop.payload);
        expect(res instanceof REngError).toBe(true);
    });
});
    
describe("ConsumerStatic.getTimestampPropertyName", function() { 
    it("should return 'Event-Timestamp-ISO' if timestamp property is object",
       function() {
        msg.payload["Event-Timestamp"] = {"t": 1419350815635,
                                           "Y": 2014,
                                           "M": 12,
                                           "D": 23,
                                           "h": 18,
                                           "m": 6,
                                           "s": 55,
                                           "z": "UTC+2"};
        var res = ConsumerStatic.getTimestampPropertyName(msg.payload);
        expect(res).toBe('Event-Timestamp-ISO');
        expect(msg.payload.hasOwnProperty('Event-Timestamp-ISO')).toBe(true);
    });
    
    it("should add correct 'Event-Timestamp-ISO' property if timestamp property is object",
       function() {
        msg.payload["Event-Timestamp"] = {"t": 1419350815635,
                                           "Y": 2014,
                                           "M": 12,
                                           "D": 23,
                                           "h": 18,
                                           "m": 6,
                                           "s": 55,
                                           "z": "UTC+2"};
        ConsumerStatic.getTimestampPropertyName(msg.payload);
        var diff = msg.payload["Event-Timestamp"]["t"] - Date.parse(msg.payload["Event-Timestamp-ISO"]);
        expect(diff).toBeLessThan(1000);
    });
});

describe("ConsumerStatic.checkSipMethod", function() { 
    beforeEach(function() {
        msg = {
            payload: { 
                "Sip-To-User": '+12345678900',
                "Acct-Session-Id": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Sip-From-User": '+31653868523',
                "Sip-Method": "INVITE",
                "Sip-From-Tag": "HK62N8N9NrmSj",
                "Sip-Call-ID": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Event-Timestamp": 'Jul 11 2014 13:29:58 CEST',
                "Sip-Response-Code": "200",
                "action": "start",
                "Acct-Delay-Time": "0"
            }
        }
    });
    
    it("should return REngError if Sip-Method property is missed",
       function() {
        delete(msg.payload["Sip-Method"]);
        var res = ConsumerStatic.checkSipMethod(msg.payload);
        expect(res instanceof REngError).toBe(true);
    });
    
    it("should return REngError if action = start & Sip-Method !== INVITE",
       function() {
        msg.payload["Sip-Method"] = "HELLO";
        var res = ConsumerStatic.checkSipMethod(msg.payload);
        expect(res instanceof REngError).toBe(true);
        expect(res.description).toBe('start has Sip-Method = HELLO')
    });
    
    it("should return REngError if action = stop & Sip-Method !== BYE",
       function() {
        msg.payload["Sip-Method"] = "HELLO";
        msg.payload["action"] = "stop";
        var res = ConsumerStatic.checkSipMethod(msg.payload);
        expect(res instanceof REngError).toBe(true);
        expect(res.description).toBe('stop has Sip-Method = HELLO');
    });
    
    it("should return null if action === start & Sip-Method === INVITE",
       function() {
        var res = ConsumerStatic.checkSipMethod(msg.payload);
        expect(res).toBeNull();
    });
});

describe("ConsumerStatic.checkPhones", function() { 
    beforeEach(function() {
        msg = {
            payload: { 
                "Sip-To-User": '+77775678900',
                "Acct-Session-Id": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Sip-From-User": '+31653868523',
                "Sip-Method": "INVITE",
                "Sip-From-Tag": "HK62N8N9NrmSj",
                "Sip-Call-ID": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Event-Timestamp": 'Jul 11 2014 13:29:58 CEST',
                "Sip-Response-Code": "200",
                "action": "start",
                "Acct-Delay-Time": "0"
            }
        }
    });
    
    it("should return REngError if Sip-To-User or Sip-From-User property is missing", 
       function() {
        delete msg.payload["Sip-To-User"];
        delete msg.payload["Sip-From-User"];
        res = ConsumerStatic.checkPhones(msg.payload);
        expect(res instanceof REngError).toBe(true);
        expect(res.invalid instanceof Array).toBe(true);
        expect(res.description).toBe('property missing');
    });
    
    it("should return null if Sip-From-User === 'Anonymous'", 
       function() {
        msg.payload["Sip-From-User"] = "Anonymous";
        res = ConsumerStatic.checkPhones(msg.payload);
        expect(res).toBeNull();
    });
    
    it("should return REngError if Sip-To-User === Sip-From-User", 
       function() {
        msg.payload["Sip-To-User"] = msg.payload["Sip-From-User"];
        res = ConsumerStatic.checkPhones(msg.payload);
        expect(res instanceof REngError).toBe(true);
    });
    
    it("should return REngError if Sip-To-User doesn't consist of 8-15 digits", 
       function() {
        msg.payload["Sip-From-User"] = "+1234567890123456";
        res = ConsumerStatic.checkPhones(msg.payload);
        expect(res instanceof REngError).toBe(true);
    });
    
    it("should return REngError if Sip-To-User === 'Anonymous'", 
       function() {
        //console.log("----------------Here---------------");
        msg.payload["Sip-To-User"] = "Anonymous";
        res = ConsumerStatic.checkPhones(msg.payload);
        expect(res instanceof REngError).toBe(true);
    });
});

// -------Other-----------------

describe("ConsumerStatic.addRetryAttempt", function() { 
    beforeEach(function() {
        msg = {
            payload: { 
                "Sip-To-User": '+77775678900',
                "Acct-Session-Id": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Sip-From-User": '+31653868523',
                "Sip-Method": "INVITE",
                "Sip-From-Tag": "HK62N8N9NrmSj",
                "Sip-Call-ID": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Event-Timestamp": 'Jul 11 2014 13:29:58 CEST',
                "Sip-Response-Code": "200",
                "action": "start",
                "Acct-Delay-Time": "0"
            }
        };
        options = {code: 'IDUR', 
                   invalid: 'duration', 
                   description: 'duration is negative', 
                   location: 'ConsumerStatic.checkDuration'};
        error = new REngError(options);
        
        optionsErrors = [];
        errorSet = [];
        optionsErrors[0] = {code: 'ITMSMP', 
                           invalid: 'timestamp', 
                           description: 'timestamp property is missed or invalid', 
                           location: 'ConsumerStatic.checkTimestamp'};
        optionsErrors[1] = {code: 'IPHN', 
                           invalid: 'phone number', 
                           description: 'Sip-To-User === Sip-From-User', 
                           location: 'ConsumerStatic.checkPhones'};
        optionsErrors[2] = {code: 'IPHN', 
                           invalid: "Sip-To-User", 
                           description: 'invalid format: 222', 
                           location: 'ConsumerStatic.checkPhones'};
        errorSet[0] = new REngError(optionsErrors[0]);
        errorSet[1] = new REngError(optionsErrors[1]);
        errorSet[2] = new REngError(optionsErrors[2]);
    });
    
    it("should add 'retry' property as array of objects", 
       function() {
        ConsumerStatic.addRetryAttempt(msg, error);
        expect(msg.payload.hasOwnProperty('retry')).toBe(true);
        expect(msg.payload.retry instanceof Array).toBe(true);
        expect(msg.payload.retry[0]).toEqual(jasmine.any(Object));
    });
    
    it("should add payload.retry[0].invalid as array if error's array passed", 
       function() {
        ConsumerStatic.addRetryAttempt(msg, errorSet);
        expect(msg.payload.retry[0].invalid.length).toBe(3);
    });
    
    it("should add attemps in both way: simple object and object with array-fields", 
       function() {
        ConsumerStatic.addRetryAttempt(msg, errorSet);
        ConsumerStatic.addRetryAttempt(msg, error);
        expect(msg.payload.retry[0].invalid.length).toBe(3);
        expect(msg.payload.retry[1]).toEqual(jasmine.any(Object));
    });
});

describe("ConsumerStatic other", function() { 
     beforeEach(function() {
        msgStart = {
            payload: { 
                "Sip-To-User": '+12345678900',
                "Acct-Session-Id": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Sip-From-User": '+31653868523',
                "Sip-Method": "INVITE",
                "Sip-From-Tag": "HK62N8N9NrmSj",
                "Sip-Call-ID": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Event-Timestamp": 'Jan 08 2015 10:30:00 CEST',
                "Sip-Response-Code": "200",
                "action": "start",
                "Acct-Delay-Time": "0"
            }
         };
         
         msgStop = {
            payload: { 
                "Sip-To-User": '+12345678900',
                "Acct-Session-Id": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Sip-From-User": '+31653868523',
                "Sip-Method": "BUY",
                "Sip-From-Tag": "HK62N8N9NrmSj",
                "Sip-Call-ID": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Event-Timestamp": 'Jan 08 2015 10:30:35 CEST',
                "Sip-Response-Code": "200",
                "action": "stop",
                "Acct-Delay-Time": "5"
            }
        };
    });
    
    it("createStartStopDoc: contains specific fields, newDoc.stop is objects", 
       function() {
        var startDocObj = {
            session: msgStart.payload['Acct-Session-Id'],
            start: msgStart.payload,
            created: {
                       "t": 1419350815635,
                       "Y": 2014,
                       "M": 12,
                       "D": 23,
                       "h": 18,
                       "m": 6,
                       "s": 55,
                       "z": "UTC+2"
            }
        };
        ConsumerStatic.checkTimestamp(startDocObj.start);
        ConsumerStatic.checkTimestamp(msgStop.payload);
        var newDoc = ConsumerStatic.createStartStopDoc(startDocObj, msgStop.payload);
        console.log(newDoc);
        expect(newDoc.stop).toEqual(jasmine.any(Object));
        expect(newDoc.stop.hasOwnProperty('Acct-Session-Id')).toBe(true);
        expect(newDoc.hasOwnProperty('session')).toBe(true);
        expect(newDoc.session).toBe('3d66bc9f-4c39-a530-58c0-bcf67dcf56af');
        expect(newDoc.hasOwnProperty('duration')).toBe(true);
        expect(newDoc.hasOwnProperty('modified')).toBe(true);
        expect(newDoc.hasOwnProperty('duration')).toBe(true);
        expect(newDoc.duration).toBe(30);
    });
});
    
