/**
* Consumer controller 
*/
var config = require('../../config.js');
var connector = require('../connector.js');
var REngError = require('../models/error.js');
var Message = require('../models/message.js');
var Producer = require('../models/producer.js')

var Consumer = {};

//0 prepaire connections
Consumer.init = function() {
    var connection = connector.rabbitmq();
    var db = connector.couch();
    
    connection.on('ready', function() {
        console.log('Connection is ready');
        connection.queue(config.amqp.queue.prefix, 
                         config.amqp.queue.options, 
                         Consumer.startToListen(db, Consumer.onMsgProcessingComplete(connection)));
    });
    connection.on('error', function(e) {
        var error = new REngError(null, e);
        error.log('stack'); 
    });
};

//1 start receiving process with callback
Consumer.startToListen = function(db, onFinished) {
    return function(queue) {
        queue.bind(config.amqp.exchange.name, 'call.*');
        console.log('Start to listen ...');
        queue.subscribe({ack: true}, Consumer.processMessage(db, onFinished));
    }
};

//2 call message processor
Consumer.processMessage = function(db, onFinished) {
    return function(message, headers, deliveryInfo, ack) {
        console.log('Received ' + deliveryInfo.routingKey + ' message');
        console.log('Call-ID: ' + message.payload['Acct-Session-Id']);
        Message.processor(message, headers, deliveryInfo.routingKey, ack, db, onFinished);
    }
};

//3 handle message after validation and processing
Consumer.onMsgProcessingComplete = function(connection) {
    return function (isProcessingSuccess, routingKey, message, ack) {
        console.log('Message has been processed');
        if (isProcessingSuccess === true) {
            Consumer.setAcknowledge(ack)(null, 1);
            return;
        }
        var attemptAmmount = message.payload["retry"].length;
        if (attemptAmmount === 1) {
            routingKey = 'retry.' + routingKey; 
        } else if (attemptAmmount < config.defaultConsumer.reQueueAmmount) {
            var attemptIndex = message.payload.retry.length - 1;
            Message.addRetryAttempt(message, message.payload.retry[attemptIndex]);
        } else {
            routingKey = routingKey.replace('retry', 'rejected');
        }
        console.log("Will be sent to '%s' queue", routingKey.split('.')[0]);
        Producer.sendToQueue(routingKey, message, connection, Consumer.setAcknowledge(ack));
    }
};

//4 finally set acknowledge, end iteration
Consumer.setAcknowledge = function(ack) {
    return function(error, result) {
        if (result === 1) {
            ack.acknowledge();
            console.log('Acknowledge has been set');
            console.log('---------------------');
        } else error.log(); 
        //TODO handling if publishing was failed 
        //routingKey has been changed but message would come back to current queue
    }
};

module.exports = Consumer;