/* TODO 
* +Refactoring
* +move repository to Kwebbl+
* threaded start
* +Broker: real starts and stops+
* Consumer-start: business logic 
* Consumer-stop: selections, finance calculation, storage
* +Presension of errors, errors' handling+
* daemonization: forever js, monit script
*/
var amqp = require('../node_modules/amqp'); //rabbit mq
var config = require('../config');
var ConsumerStatic = require('./Consumer_static'); 
var REngError = require('./error.js');
var Message = {};

/** Listener for RabbitMQ queues. 
* @class Consumer
* @constructor
* @param {string} type - which messages consumer works with: stop or start
* @return {} nothing
*
* @property {string} typeOfAcceptedMsg - the same as param 'type'
* @property {CouchDb} db - instance of database class
* @property {integer} REQUEUEAMOUNT - how many times invalid message will be put back
* @property {tryingToReadFromQueueAgain} - flag to define 
*     invalid message is under trying to be read again
* @property {amqp.connection} connection - connection with Rabbit MQ
* @property {amqp.exchange} exchange 
* @property {amqp.queue} queue - queue where messages are reading from
* @property {integer} reSendCounter - counter for putting message back 
*     onto the same queue
*/
var Consumer = function(type) {
    if (type !== 'stop' && type !== 'start') {
        var error = new REngError(null, 'Unknown type of messages');
        error.log();
        return;
    }
    this.typeOfAcceptedMsg = type;
    this.db  = require('../src/CouchDb.js').CouchDb.getInstanceOfCouchDb();
    this.REQUEUEAMOUNT = config.defaultConsumer.reQueueAmmount;
    this.connection = null;
    this.exchange = null;
    this.queue = null;
};


/** @method _receiveFromQueue 
* @privat
* Closes context for callback invocation
* @return {function} callback with parameters of message has been received
*/
Message.process = function() {
    var self = this;
    /** @callback Consumer~_receiveFromQueue for queue.subscribe
    * @param {object} message - message ~ {payload: {}} received from RabbitMQ
    * @param {object} headers
    * @param {object} deliveryInfo - contains routing key
    * @param {object} ack - contains acknowledge method
    * Checks received message, processes message depending on checking result
    */
    return function(message, headers, deliveryInfo, ack) {
        var errorSet = [];
        var currentError;
        var validators = {checkTimestamp: ConsumerStatic.checkTimestamp, 
                          checkSipMethod: ConsumerStatic.checkSipMethod, 
                          checkPhones: ConsumerStatic.checkPhones};
        
        console.log('Received ' + deliveryInfo.routingKey + ' message');
        console.log('Call-ID: ' + message.payload['Acct-Session-Id']);
        
        for (var key in validators) {
            currentError = validators[key](message.payload);
            if (currentError) errorSet.push(currentError);
        }
        switch (errorSet.length) {   
            case 0:
                self.processMessage(deliveryInfo.routingKey, message, ack);
                break;
            case 1:
                ConsumerStatic.addRetryAttempt(message, errorSet[0]);
                self._processReQueue(ack, deliveryInfo.routingKey, message);
                break;
            default:
                ConsumerStatic.addRetryAttempt(message, errorSet);
                self._processReQueue(ack, deliveryInfo.routingKey, message);
        }
    }
};

/** @method processMessage
* Handles messages: process insertation or selection with CoachDb methods 
*
* @param {string} routingKey - type of messages are listened to
* @param {object} message ~ {payload: {}}
* @param {object} ack - contains acknowledge method
*
* errorResult === new {Error} if db.method returns error 
*/
Message.processMessage = function(routingKey, message, ack) {
    var self = this;
    var startDoc;
    var onResult;
    
    switch (routingKey) {
        case 'call.start': {
            startDoc = ConsumerStatic.getStartDoc(routingKey, message.payload);
            onResult = self._onInsertResult(ack, routingKey, message);
            self.db.insert(startDoc, onResult);
            break;
        }
        case 'call.stop': {
            function callSelectStartDoc() {    
                onResult =  self._onSelectResult(ack, routingKey, message);
                self.db.selectStartDoc(message.payload['Acct-Session-Id'], onResult);
            }
            setTimeout(callSelectStartDoc, 400);
            break;
        }
        case 'rejected.call.stop':
        case 'rejected.call.start': 
        default: {
            var errorOptions = {code: 'IRTKY', 
                                invalid: 'routingKey', 
                                description: 'incorrect routing key specified', 
                                location: 'Consumer.processMessage'};
            var error = new REngError(errorOptions);
            error.log();
            break;
        }
    }
};

/** @method onPublish
* Provides closure with parameters 
* 
* @param {string} key - routingKey of message has been published
* @param {object} val - matching body of message
*
* @return {function} - error handler
*/
Message._onPublish = function(key, val, ack) {
    var self = this;
    /** @callback ConsumerStatic~onPublish
    * This is callback for exchange.publish (if exchange is in confirm mode)
    * 
    * @param {boolean} isErrorOccured is the presense of an error. 
    * true means an error occured
    * false means the publish was successfull
    * @return {} nothing
    */
    return function(isErrorOccured) {
        if (!isErrorOccured) {
            self._setAcknowledge(ack);
            return;
        }
        var strNotice = util.format('routingKey = %s, body = %s', 
                                     key, JSON.stringify(val));
        var optionsError = {code: 'MSNPUB', 
                            invalid: 'publish', 
                            description: 'message was not sent to queue', 
                            source: 'Consumer._onPublish',
                            notice: strNotice};
        var error = new REngError(optionsError);
        error.log();
    }
},

/** @method _processReQueue
* Processes message sending to another queues
*
* @param {string} routingKey - type of messages are listened to
* @param {object} bodyOfMsg - body of message
* @param {object} ack - {object} ~ amqp.message.deliveryTag 
*/
Message._processReQueue = function(ack, routingKey, message) {
    var self = this;
    var attemptAmmount = message.payload["retry"].length;
        
    //console.log('_processReQueue routingKey: %s', routingKey);
    //console.log('_attemptAmmount', attemptAmmount);
    
    if (attemptAmmount === 1) {
        routingKey = 'retry.' + routingKey; 
        self._sendToRetry(ack, routingKey, message);
    } else if (attemptAmmount < self.REQUEUEAMOUNT) {
        self._resendToRetry(ack, routingKey, message);
    } else {
        var checkPrefix = routingKey.search('retry');
        if (checkPrefix < 0) {
            routingKey = 'retry.' + routingKey;
        }
        routingKey = routingKey.replace('retry', 'rejected');
        self._sendToRejected(ack, routingKey, message); 
    }
};
  
/** @method _sendToRetry
* Publishes message to 'retry' queue
*
* @param {string} routingKey - type of messages are listened to
* @param {object} bodyOfMsg - body of message
* @param {object} ack - object contains acknowledge() method 
*/
Message._sendToRetry = function (ack, routingKey, message) {
    var self = this;
    var exchangeName = config.amqp.exchange.name;
    var exchangeOptions = config.amqp.exchange.options;
    var queuePrefix = config.amqp.queue.prefix;
    var queueOptions = config.amqp.queue.options;
    var connection = self.connection;
    
    connection.exchange(exchangeName, exchangeOptions, function(exchange) { 
        //TODO error handling if requeued msg publishing failed
        var onPublish = self._onPublish(routingKey, message, ack);
        exchange.publish(routingKey, message, {}, onPublish);
    });

    connection.queue(queuePrefix + 'retry', queueOptions, function(queue) {   
        queue.bind(exchangeName, 'retry.call.*');
    });
}


//TODO implement functionalitys
Message._resendToRetry = function (ack, routingKey, message) {
    var self = this;
    var attemptIndex = message.payload["retry"].length - 1;
    ConsumerStatic.addRetryAttempt(message, message.payload["retry"][attemptIndex]);
    self._sendToRetry(ack, routingKey, message);
    ConsumerStatic.logSubsidairyInfo('back_queue');
    
    //self.connection.queue(queueName, queueOptions, function(queue) {   
        //queue.shift(true, true); can't use because message was changed
    //}); 
}

/** @method _sendToRejected
* @privat 
* @param {string} routingKey
* @param {object} message: object like {payload: {...}} 
* @param {object} ack - object used to set acknowledge
* @return {} nothing
*
* Moves rejected message onto special queue 
* New routingKey looks like "rejected.call.*" where * = stop|start 
*/
Message._sendToRejected = function(ack, routingKey, message) {
    var self = this;
    var exchangeName = config.amqp.exchange.name;
    var exchangeOptions = config.amqp.exchange.options;
    var queuePrefix = config.amqp.queue.prefix;
    var queueOptions = config.amqp.queue.options;
    var connection = self.connection;
    
    console.log ('_sendToRejected');
    connection.exchange(exchangeName, exchangeOptions, function(exchange) { 
        //TODO error handling if requeued msg publishing failed
        var onPublish = self._onPublish(routingKey, message, ack);
        exchange.publish(routingKey, message, {}, onPublish);
    });
    
    connection.queue(queuePrefix + 'rejected', queueOptions, function(queue) {   
        queue.bind(exchangeName, 'rejected.call.*');
    });
};

/** @method _onInsertResult - closes parameters for callback
* @privat
* 
* @param {object} ack - object used to set acknowledge
* @param {string} routingKey
* @param {object} message: object like {payload: {...}} 
*
* @returns {function} - callback 
*/
Message._onInsertResult = function(ack, routingKey, message) {
    self = this;
    /** @callback Consumer~_onInsertResult
    * Processes the result of insertation, used for CouchDb instance 
    * @param {object} insertResult - result of insert (if success) or null otherwise
    * @param {object} insertError - null (if success) or error object
    * @return {} nothing
    */
    return function(insertError, insertResult) {
        if (!insertError) {
            console.log(insertResult);
            self._setAcknowledge(ack);
        } else {
            insertError.log();
            ConsumerStatic.addRetryAttempt(message, insertError);
            self._processReQueue(ack, routingKey, message);
        }
    }
};

/** @method _setAcknowledge
* @privat
* 
* @param {object} ack - {object} ~ amqp.message.deliveryTag 
* @return {} nothing
*/
Message._setAcknowledge = function(ack, cb) {
    ack.acknowledge();
    ConsumerStatic.logSubsidairyInfo('ack');
    //if (typeof(cb) == 'function') cb(true);
};

/** @method _onSelectResult 
* @privat
* Closes context and returns callback to process result of selection
* @param {object} ack - object to send acknowledge
* @param {string} routingKey
* @param {object} message ~ {payload: {}}
* @return {function} @callback 
*/
Message._onSelectResult = function(ack, routingKey, message) {
    var self = this;
    /** @callback Consumer~_onSelectResult 
    * Processes the result of selection, invokes duration checking.
    * @param {object} selectError - new Error if selecting was failed.
    * @param {object} selectResult - successful result of selection or null otherwise.
    * 
    * durationError (if exists) will be added as attempt, when message is putting 
    *      to another queue (rejected)
    */
    return function(selectError, selectResult) {
        var durationError;
        if (selectError) {
            var toLogStack = true;
            selectError.log(toLogStack);
            ConsumerStatic.addRetryAttempt(message, selectError);
            ConsumerStatic.logSubsidairyInfo('re_queue');
            self._processReQueue(ack, routingKey, message);
            return;
        }

        durationError = ConsumerStatic.checkDuration(selectResult.start, message.payload); 
        if (durationError) {
            ConsumerStatic.addRetryAttempt(message, durationError);
            ConsumerStatic.logSubsidairyInfo('re_queue');
            self._processReQueue(ack, routingKey, message);
        } else {
            var docCall = ConsumerStatic.createStartStopDoc(selectResult, message.payload);
            var onResult = self._onInsertResult(ack, routingKey, message);
            self.db.insert(docCall, onResult);
        }
    }
};

exports.Consumer = Consumer;