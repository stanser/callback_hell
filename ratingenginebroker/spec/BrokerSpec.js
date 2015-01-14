var jas = require ('../node_modules/jasmine-node');

//------------
//node_modules/jasmine-node/bin/jasmine-node ---> node-jasmine module's location
//------------

var BrokerObj = require('../src/Broker.js');
var BrokerStaticPrivat = require('../src/Broker_static_privat');


//Create a test object, an instance of Broker
//var broker = new BrokerObj.Broker(100, 10);

var brokerOptions = {
    total: 10,
    once: 5,
    startLess: 1,
    negativeDuration: 1,
    interval: 200
}

/** Creates an object with empty parameters
*/

function getEmptyOptionsObject () {
    return {     
        total: undefined,
        once: undefined,
        startLess: undefined,
        negativeDuration: undefined,
        interval: undefined
    };
};

describe("Broker", function() {

    broker = new BrokerObj.Broker(brokerOptions);    
    
    it ("should be an Object", function () {
        expect(broker).toEqual(jasmine.any(Object));   
    });
    
    it("should have defined countTotal and countAtOnce (custom or default)", 
       function() {
            expect(broker.countTotal).toEqual(jasmine.any(Number));
            expect(broker.countAtOnce).toEqual(jasmine.any(Number));
    });
    
    it("() :should have countTotal = 12 and countAtOnce = 4 by default",
       function() {
            var broker2 = new BrokerObj.Broker(getEmptyOptionsObject()); 
            expect(broker2.countTotal).toBe(12);
            expect(broker2.countAtOnce).toBe(4);
    }); 
    
    it("({10,5,1,1,200}): 10 will be increased by 2", function() {
        expect(broker.countTotal).toBe(12);
    }); 
    
    it("({'foo',5,true,1,200}): should have integer countAtOnce and countTotal ",
       function() {
            var options = {
                total: 'foo',
                once: 5,
                startLess: true,
                negativeDuration: 1,
                interval: 200
            }
            var broker3 = new BrokerObj.Broker(options);
            expect(parseInt(broker3.countAtOnce)).toBe(broker3.countAtOnce);
            expect(parseInt(broker3.countTotal)).toBe(broker3.countTotal);
    });

    it("If total ammount of calls is less than invalid calls ammount, catch error", 
       function() {
            var options = {
                total: 10,
                once: 5,
                startLess: 15,
                negativeDuration: 1,
                interval: 200
            }
            spyOn(BrokerStaticPrivat, 'logTheError');
            var broker2 = new BrokerObj.Broker(options);
            expect(BrokerStaticPrivat.logTheError).toHaveBeenCalled();
    });


    it("setCall() should return an object {call.start: {playload: {...}}}", function() {
        spyOn(broker, 'setCall').andCallThrough();
        var f = broker.setCall('start');
        expect(f).toEqual(jasmine.any(Object));
        expect(f.hasOwnProperty('call.start')).toBe(true);
        expect(f['call.start'].hasOwnProperty('playload')).toBe(true);
    });

    it("createInvalidCall() should return null if wrong parameter was passed", function() {
        spyOn(broker, 'createInvalidCall').andCallThrough();
        var f = broker.createInvalidCall('start');
        expect(f).toBeNull();
    });

    it("causes an interval to be called asynchronously", function() {
        var timerCallback = jasmine.createSpy('timerCallback');
        jasmine.Clock.useMock(); 
        
        var broker2 = new BrokerObj.Broker(getEmptyOptionsObject()); 
        
        broker2.sendMsg = function () {
            function _setSendingProcess () {
                timerCallback();
            }
            setInterval(_setSendingProcess, broker.interval);    
        };
        
        broker2.sendMsg();
        
        expect(timerCallback).not.toHaveBeenCalled();

        jasmine.Clock.tick((broker.interval + 1));
        expect(timerCallback.callCount).toEqual(1);

        jasmine.Clock.tick(broker.interval/2);
        expect(timerCallback.callCount).toEqual(1);

        jasmine.Clock.tick(broker.interval/2);
        expect(timerCallback.callCount).toEqual(2);
    });
});
