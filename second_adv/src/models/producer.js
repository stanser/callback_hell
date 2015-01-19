/*
* Producer - sends messages to RabbitMQ exchange
*/
var Producer = {};
var config = require('../../config');
var REngError = require('./error.js');


/** @method sendToQueue
* Publishes message to 'retry' queue
* @param {string} routingKey - type of messages are listened to
* @param {object} message ~ {payload: {}}
* @param {object} connection === amqp connection
* @param {function} backToController(<error>, <result>) - callback.
*        where result === 1 if sending was successful
*/
Producer.sendToQueue = function (routingKey, message, connection, backToController) {
    var type = routingKey.split('.')[0];
    connection.exchange(
        config.amqp.exchange.name, 
        config.amqp.exchange.options, 
        function(exchange) {
            exchange.publish(routingKey, 
                             message, 
                             {}, 
                             Producer._onPublish(routingKey, message, backToController));
        }
    );
    connection.queue(
        config.amqp.queue.prefix.concat('_', type), 
        config.amqp.queue.options,
        function(queue) {   
            queue.bind(config.amqp.exchange.name, type.concat('.call.*'));
        }
    );
};

/** @method onPublish
* Provides closure with parameters 
* @param {string} routingKey of message has been published
* @param {object} message
* @param {function} doNext(<error>, <result>), where result === 1 if publishing was successful
* @return {function} - error handler.
*/
Producer._onPublish = function(routingKey, message, doNext) {
    /** @callback Producer~onPublish
    * This is callback for exchange.publish method (if exchange is in confirm mode).
    * Invokes callback function with parameters: (<error>, <result>).
    * @param {boolean} isErrorOccured is the presense of an error. 
    *       true means an error occured
    *       false means the publish was successfull
    * @return {} nothing
    */
    return function(isErrorOccured) {
        if (!isErrorOccured) {
            doNext(null, 1);
            return;
        }
        var strNotice = util.format('routingKey = %s, body = %s', 
                                     routingKey, JSON.stringify(message.payload));
        var optionsError = {code: 'MSNPUB', 
                            invalid: 'publish', 
                            description: 'message has not been sent to queue', 
                            source: 'Consumer._onPublish',
                            notice: strNotice};
        doNext(new REngError(optionsError), 0);
    }
};

module.exports = Producer;