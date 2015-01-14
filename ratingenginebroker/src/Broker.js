var gen = require('../node_modules/kwbl-gen');
var amqp = require('../node_modules/amqp'); //rabbit mq
var BrokerStatic = require('./Broker_static');
var config = require('../config');
var REngError = require('./error.js');

/** Broker
* @constructor
* 
* @param {object} options - includes parameters as following:
*
* @property {integer} options.total - General ammount of calls have to be emulated
*        1 call includes 2 messages: 1 start and 1 stop
* @property {integer} options.once - how many calls have to be emulated during 1 iteration
* @property {integer} options.startLess - how many calls should be without start
* @property {integer} options.negativeDuration - how many calls should have negativ duration
* @property {integer} options.interval - in ms, interval for sending
*
* Invokes function to validate incoming parameters. 
* Defines default values.
*/
function Broker(options) {
    options = options ? options: BrokerStatic.getEmptyOptionsObject();
    
    var defaultValues = config.defaultBroker.values;
    BrokerStatic.validateIntegerArguments(options, defaultValues);
    
    var countOfInvalid = options.startLess + options.negativeDuration;
    
    var descriptionError;
    if (countOfInvalid > options.total) {
        descriptionError = 'total ammount (-t) is less than invalid calls (-s + -n)';
    } else if (options.once > options.total) {
        descriptionError = 'Total ammount (-t) is less than ammount for 1 portion (-o)'; 
    }
    if (descriptionError) {
        var optionsError;
        var error;
        optionsError = {
            code: 'BRINP', 
            invalid: 'input', 
            description: descriptionError, 
            location: 'Broker@constructor'
        };
        error = new REngError(optionsError);
        error.log('nostack');
        return;
    }
    this.countTotal = options.total;
    this.countAtOnce = options.once;
    this.countOfStartLess = options.startLess;
    this.countOfNegativeDuration = options.negativeDuration;
    this.interval = options.interval;

    //to simplify sending by portion
    countOfCorrect = this.countTotal - countOfInvalid;
    var reminder = countOfCorrect % this.countAtOnce;
    var difference = 0;
    if (reminder) {
        difference = this.countAtOnce - reminder;
        console.log ('  Total ammount of calls will increased by', difference);
    }
    
    this.countTotal = this.countTotal + difference;
    this.countOfCorrect = countOfCorrect + difference;
}

/** Establishes connection to Exchange   
* Invokes sending of messages.
*
* First of all sends invalid messages, then sends correct ones
*/
Broker.prototype.sendMsg = function() {
    var self = this;  
    connection = amqp.createConnection(config.amqp.connection.options[0], 
                                       config.amqp.connection.options[1]);

    connection.on ('ready', function() {
        console.log('connection is ready');
        console.log('--------------');
        connection.exchange(config.amqp.exchange.name, 
                            config.amqp.exchange.options,
                            function(exchange) {
            self.connection = connection;
            self.exchange = exchange;
            
            if (self.countOfStartLess) {
                console.log ('Sending calls without start...');
                self._sendInLoop(self.countOfStartLess, 'undefined_start');
            }
            if (self.countOfNegativeDuration) {
                console.log ('Sending calls with negative duration...');
                self._sendInLoop(self.countOfNegativeDuration, 'negative_duration');
            }
            self.intervalId = setInterval(self._setSendingProcess(), self.interval);
        });
    });
}


/** @method _setSendingProcess
* @returns {function} - callback for setInterval function
*/
Broker.prototype._setSendingProcess = function() {
    var self = this;
    var counterOfIterations = 0;
    var numberOfIterations = self.countOfCorrect / self.countAtOnce; 
    /** @callback Broker~_setSendingProcess 
    * Sets correct call' sending process
    * For each countAtOnce of calls invokes _sendInLoop function to direct sending
    * (countAtOnce = ammount of messages are sent per 1 iteration)
    *
    * Stop sending if general countTotal is reached
    * (all iterations by countAtOnce msgs has been sent)
    */
    return function() {
        //repeats sending by iterations while general ammount isn't reached
        if (counterOfIterations < numberOfIterations) {
            self._sendInLoop(self.countAtOnce); 
            counterOfIterations++;
        } else {
            clearInterval(self.intervalId);
            console.log('--------------');
            console.log('Asynchronical sending...');
            //BrokerStatic.stopConnection(broker); 
        }
     }                                                                  
};

/** Invokes function '_send' in loop depending on type of msgs should be created.
* @param {integer} value - upper limit of loop indexes ~ 
*       ~ ammount of calls should be emulated by one iteration 
* @param {string} typeOfMsg - optional, 'undefined_start' || 'negative_duration'  
* @return {} nothing
* If typeOfMsg isn't specified sends correct messages
* If typeOfMsg is invalid logs UNKERR error and does nothing
*/
Broker.prototype._sendInLoop = function(value, typeOfMsg) {
    var self = this;
    var messages;
    var durationInMs;
    var sendLater;
    if (!typeOfMsg) {
        console.log('--------------');
        console.log ('Sending usual calls:');
        for (var i = 0; i < value; i++){ 
            messages = BrokerStatic.setCall();

            durationInMs = BrokerStatic.getDurationInMs(messages);

            self._send('call.start', messages['call.start'])();
            sendLater = self._send('call.stop', messages['call.stop']);
            setTimeout(sendLater, durationInMs);
        }
    } else if (typeOfMsg === 'undefined_start' || typeOfMsg === 'negative_duration') {
        for (var i = 0; i < value; i++) {
            messages = BrokerStatic.createInvalidCall(typeOfMsg);
            for (var key in messages) {
                self._send(key, messages[key])();
            }
        }  
    } else {
        var error = new REngError(null, 'unknown type of messages in Broker._sendInLoop');
        error.log();
    }
    return;        
},

/** Creates closure to save variable;
* @param {string} routingKey
* @param {object} message ~ {payload: {...}} 
* @return {function} - sends messages to exchange
*/
Broker.prototype._send = function(routingKey, message) {
    var self = this;
    /** Sends messages to exchange
    */
    return function() {
        var onPublish = BrokerStatic._onPublish(routingKey, message);
        self.exchange.publish(routingKey, message, {}, onPublish);
    }
};

exports.Broker = Broker;     