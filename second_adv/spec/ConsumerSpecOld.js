//TODO refact

var jas = require ('../node_modules/jasmine-node');
var gen = require('../node_modules/kwbl-gen'); 
var ConsumerObj = require('../src/Consumer.js');

describe("Consumer", function() {
    var consumer = new ConsumerObj.Consumer('start');

        
    it ("has db property", function () {
        expect(consumer.hasOwnProperty('db')).toBe(true);
    });
    
    it ("has db property as object", function () {
        expect(consumer).toEqual(jasmine.any(Object));   
    });
    
    it ("has typeOfAcceptedMsg property", function () {
        expect(consumer.hasOwnProperty('typeOfAcceptedMsg')).toBe(true);
        expect(consumer.typeOfAcceptedMsg).toBe('start');
    });
});

describe("Consumer.receiveAndProcessMsg", function() {
    var consumer = new ConsumerObj.Consumer('start');
        
    it ("has to be called", function () {
        spyOn(consumer, 'receiveAndProcessMsg'); 
        consumer.receiveAndProcessMsg();
        expect(consumer.receiveAndProcessMsg).toHaveBeenCalled();
    });
    
    it ("an error has occurred if consumer was created with incorrect param", function () {
        var consErr = new ConsumerObj.Consumer();
        spyOn(consErr, 'logTheError'); 
        consErr.receiveAndProcessMsg();
        expect(consErr.logTheError).toHaveBeenCalled();
    });
});

describe("Consumer.createDocAndAddToCouch", function() {
    var consumer;
    var obj;
    
    beforeEach(function() {
        consumer = new ConsumerObj.Consumer('start');
        obj = {
            call_type: "call.start",
            call_id: "test2",    
            timestamp: "100", 
            created: gen.couchTimeStamp(),             
            modified: gen.couchTimeStamp()
        };
    });
        
    it ("has to be called", function () {
        spyOn(consumer, 'createDocAndAddToCouch').andCallFake(function() { return 1000; }); 
        var foo = consumer.createDocAndAddToCouch('call.start', obj, function () {console.log('Hello');});
        expect(consumer.createDocAndAddToCouch).toHaveBeenCalledWith(obj.call_type, obj, jasmine.any(Function));
        expect(foo).toEqual(1000);
    }); 
    
    it ("for consumer('start') should call db.insert with (<object> Doc, <function> callback)", function () {

        spyOn(consumer.db, 'insert').andCallFake(function(a, b) { return 1001; });   
        
        function baz () {
            console.log('Hello again');
        }
        
        consumer.createDocAndAddToCouch('call.start', obj,  jasmine.any(Function));
        expect(consumer.db.insert).toHaveBeenCalled();
        expect(consumer.db.insert).toHaveBeenCalledWith(jasmine.any(Object), jasmine.any(Function));
        expect(consumer.db.insert(obj, baz)).toEqual(1001);
     });
    
    it ("for consumer('stop') should call db.selectStartDoc with (<object> Doc, <function> callback)", function () {
        consumerStop = new ConsumerObj.Consumer('stop');
        spyOn(consumerStop.db, 'selectStartDoc');
        
        function baz () {
            console.log('Hello again');
        }
        
        consumerStop.createDocAndAddToCouch('call.stop', obj,  jasmine.any(Function));
        expect(consumerStop.db.selectStartDoc).toHaveBeenCalled();
        expect(consumerStop.db.selectStartDoc).toHaveBeenCalledWith(jasmine.any(Object), jasmine.any(Function));
    });
});
    

describe("CouchDB", function() {
    var consumer;
    var obj;
    
    beforeEach(function() {
        consumerStart = new ConsumerObj.Consumer('start');
        consumerStop = new ConsumerObj.Consumer('stop');
        obj = {
            call_type: "call.start",
            call_id: "_test_",    
            timestamp: "100", 
          };
    });    
    
    it ("insert should call callback if it defined", function () {
        var callback = jasmine.createSpy();
        consumerStart.db.insert (obj, callback);
  
        waitsFor(function() { //have to return TRUE
            return callback.callCount > 0;
        }, "callback call timed out.", 5000); 

        runs (function () { 
            expect(callback).toHaveBeenCalled() ;
        });
     });
    
    it ("selectStartDoc should call callback if it was defined", function () {
        var callback = jasmine.createSpy();//.andCallFake (function() { console.log("hi"); });
        consumerStop.db.selectStartDoc (obj, callback);
  
        waitsFor(function() {
            return callback.callCount > 0;
        }, "callback wasn't called", 5000); 

        runs (function () { 
            expect(callback).toHaveBeenCalled() ;
        });
     });
    
    it ("selectStartDoc should return false if callback wasn't defined", function () {
        var foo = consumerStop.db.selectStartDoc (obj);
  
        waitsFor(function() {
            return !foo;
        }, "method should return false", 5000); 

        runs (function () { 
            expect(foo).toBe(false) ;
        });
     });
    
    it ("selectStartDoc should pass the result to callback", function () {
        var isSuccessTrue = false;
        var resultSelection = {};
        callback = jasmine.createSpy().andCallFake (function(isSuccess, result) { 
            //console.log("hi"); 
            isSuccessTrue = isSuccess;
            resultSelection = result;
        });
        consumerStop.db.selectStartDoc (obj, callback);
  
        waitsFor(function() {
            return (callback.callCount > 0) && isSuccessTrue == true && resultSelection.hasOwnProperty('call_id');
        }, "callback has not been called or select result has not been successful", 2000); 

        runs (function () { 
            expect(callback).toHaveBeenCalled() ;
            expect(isSuccessTrue).toBe(true);
            expect(resultSelection.hasOwnProperty('call_id')).toBe(true);
        });
     });
    
})
    

    
        
    

    
 

