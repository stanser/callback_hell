var jasmine = require ('../node_modules/jasmine-node');

//------------
//node_modules/jasmine-node/bin/jasmine-node ---> node-jasmine module's location
//------------

var BrokerStatic = require('../src/Broker_static');
var REngError = require('../src/error');
var options, optionsError;
var error, errorSet;

describe("BrokerStatic", function() { 
    it ("getAbbrDateString: should remove day name from date", function () {
        var date = 'Tue Jan 06 2015 16:21:01 GMT+0200 (EET)';
        var res = BrokerStatic.getAbbrDateString(date);
        expect(res).toBe('Jan 06 2015 16:21:01 CEST');   
    });
    
    it ("getDurationInMs: should calculate duration", function () {
        var messages = {
            "call.start" : { 
                payload: { 
                    "Event-Timestamp": 'Jan 08 2015 10:30:00 CEST'
                }
            },
            "call.stop" : {
                payload: { 
                    "Event-Timestamp": 'Jan 08 2015 10:30:15 CEST'
                }
            }
        };
        var dur = BrokerStatic.getDurationInMs(messages);
        expect(dur).toBe(15000);   
    });
    
    it ("createInvalidCall: should create negative duration call", function () {
        var messages = {
            "call.start" : { 
                payload: { 
                    "Event-Timestamp": 'Jan 08 2015 10:30:00 CEST'
                }
            },
            "call.stop" : {
                payload: { 
                    "Event-Timestamp": 'Jan 08 2015 10:30:15 CEST'
                }
            }
        };
        var invalidCall = BrokerStatic.createInvalidCall('negative_duration');
        var dur = BrokerStatic.getDurationInMs(invalidCall);
        expect(dur).toBe(-2000);   
    });
    
});
