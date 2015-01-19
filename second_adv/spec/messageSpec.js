var jasmine = require ('../node_modules/jasmine-node');
var gen = require('../node_modules/kwbl-gen'); 
var Message = require('../src/message.js');
var Consumer = require('../src/consumer.js');
//var ConsumerStop = new ConsumerObj.Consumer('stop');
var MessageUtils = require('../src/message_utils');
var msg, msgStop, headers, keyStart, keyStop, ack;

describe("Consumer._receiveFromQueue", function() {
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
        };
        headers = {};
        keyStart = {routingKey: 'call.start'};
        ack = {acknowledge: function() {console.log("Ack has been set")}};
    });
    
    it ("should call processMessage method if all parameters are correct", function () {
        spyOn(Consumer, "processMessage").andCallFake(function() {
            console.log("processMsg has been called")
        });
        Consumer._receiveFromQueue()(msg, headers, keyStart, ack);
        expect(Consumer.processMessage).toHaveBeenCalled();   
        expect(Consumer.processMessage).toHaveBeenCalledWith(
                                                keyStart.routingKey, 
                                                msg, 
                                                ack); 
        
        console.log('----------------------');
    });
    
        
    it ("should call _sendToRetry method if some parameter is invalid", function () {
        spyOn(Consumer, "_processReQueue").andCallFake(function() {
            console.log("_processReQueue has been called")
        });
        msg.payload["Sip-Method"] = 'HELLO';
        Consumer._receiveFromQueue()(msg, headers, keyStart, ack);
        expect(Consumer._processReQueue).toHaveBeenCalled();   
        expect(Consumer._processReQueue).toHaveBeenCalledWith(
                                                ack, 
                                                keyStart.routingKey, 
                                                msg);   
        console.log('----------------------');
    });
    
    it ("should add 'retry' property to message if some parameter is invalid", function () {
        var attempt = {date: new Date(),
                       invalid: "Sip-Method",
                       description: "start has Sip-Method = HELLO"};
        spyOn(Consumer, "_processReQueue").andCallFake(function() {
            console.log("attempt has been added");
        });
        msg.payload["Sip-Method"] = 'HELLO';
        Consumer._receiveFromQueue()(msg, headers, keyStart, ack);
        expect(Consumer._processReQueue).toHaveBeenCalled(); 
        expect(msg.payload.hasOwnProperty('retry')).toBe(true); 
        expect(msg.payload.retry).toEqual(jasmine.any(Object)); 
        console.log('----------------------');
    });
});

describe("ConsumerStop._receiveFromQueue", function() {
     beforeEach(function() {
        msgStop = {
            payload: { 
                "Sip-To-User": '+12345678900',
                "Acct-Session-Id": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Service-Type": "Sip-Session",
                "Sip-From-User": '+31653868523',
                "Acct-Status-Type": "Stop",
                "Sip-Method": "BYE",
                "Sip-From-Tag": "HK62N8N9NrmSj",
                "NAS-IP-Address": "10.60.4.136",
                "Sip-To-Tag": "SDls7t999-b1261304806132014711132859",
                "Sip-User-Agent": 'FreeSWITCH-mod_sofia/1.2.17~64bit',
                "Sip-Call-ID": '3d66bc9f-4c39-a530-58c0-bcf67dcf56af',
                "Event-Timestamp": 'Jul 11 2014 13:29:58 CEST',
                "Sip-Response-Code": "200",
                "action": "stop",
                "type": "raw",
                "NAS-Port": "5060",
                "Acct-Delay-Time": "0"
            }
        };
        headers = {};
        keyStop = {routingKey: 'call.stop'};
        ack = {acknowledge: function() {console.log("Ack has been set")}};
    });
    
    it ("should call processMessage method if all parameters are correct", function () {
        spyOn(ConsumerStop, "processMessage").andCallFake(function() {
            console.log("processMsg has been called");
        });
        ConsumerStop._receiveFromQueue()(msgStop, headers, keyStop, ack);
         
        expect(ConsumerStop.processMessage).toHaveBeenCalled();   
        expect(ConsumerStop.processMessage).toHaveBeenCalledWith(keyStop.routingKey, 
                                                              msgStop, 
                                                              ack); 
        
        console.log('----------------------');
    });
});