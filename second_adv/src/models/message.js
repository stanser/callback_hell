/**
* Message model
*/

var MessageUtils = require('./message_utils'); 
var REngError = require('./error');
var Message = {};

/** @method @public processor
* Validates message, processes message depending on validation's result
*
* @param {object} message - message ~ {payload: {}} received from RabbitMQ
* @param {object} headers
* @param {object} ack - contains acknowledge method
* @param {CouchDb object} - database resource
* @param {function} backToController -function to be invoked after processing completed
*         parameters are following: (<bool> isSuccess, routingKey, message, ack) 
*/
Message.processor = function(message, headers, routingKey, ack, db, backToController) {
    Message.validate(message);   
    if (message.payload.hasOwnProperty('retry')) {
        console.log('Rejected during validation');
        backToController(false, routingKey, message, ack);
    } else {
        var dbCallbacks = {
            onInsertResult: Message._onInsertResult(ack, routingKey, message, backToController),
            onSelectResult: Message._onSelectResult(ack, routingKey, message, db, backToController)
        };
        switch (routingKey) {
            case 'call.start':     
                var startDoc = MessageUtils.getStartDoc(routingKey, message.payload);
                db.insert(startDoc, dbCallbacks.onInsertResult);
                break;
            case 'call.stop': 
                db.selectStartDoc(message.payload['Acct-Session-Id'],
                                  dbCallbacks.onSelectResult);
                break;            
            default: 
                return false;
                break;
        }
    }
};


/** @method validate - checks message's fields for errors.
* If some ones exist adds attempt-field to message: [retry]
*
* @param {object} message ~ message like {payload: {}} received from RabbitMQ
* @return {} nothing
*/
Message.validate = function(message) {
    var errorSet = [];
    var currentError;
    var validators = {checkTimestamp: MessageUtils.checkTimestamp, 
                      checkSipMethod: MessageUtils.checkSipMethod, 
                      checkPhones: MessageUtils.checkPhones};
    for (var key in validators) {
        currentError = validators[key](message.payload);
        if (currentError) errorSet.push(currentError);
    }
    switch (errorSet.length) {   
        case 0: break;
        case 1: Message.addRetryAttempt(message, errorSet[0]); break;
        default: Message.addRetryAttempt(message, errorSet); break;
    }
};

/** @method @static addRetryFields - adds to rabbit message new field [retry]
* (if validation was failed). Later message will be put to 'retry'/'rejected' queue
*
* @param {object} message - message received from Rabbit
* @param {object} fieldSource - object or array of objects,  
*        contains the reason of resending message (usually {REngError object})
*/
Message.addRetryAttempt = function(message, fieldSource) {
    var attempt;
    if (!message.payload.hasOwnProperty('retry')) {
        message.payload.retry = [];
    }
    if (fieldSource instanceof Array) {
        attempt = {date: new Date().toISOString(),
                   invalid: [],
                   description: []};  
        for (var i = 0; i < fieldSource.length; i++) {
            attempt.invalid.push(fieldSource[i].invalid);
            attempt.description.push(fieldSource[i].description);
        }
    } else {
        attempt = {date: new Date().toISOString(),
                   invalid: fieldSource.invalid,
                   description: fieldSource.description}
    }
    message.payload.retry.push(attempt);
};
    
/** @method @privat _onInsertResult - closes parameters for callback
* 
* @param {object} ack - object used to set acknowledge
* @param {string} routingKey
* @param {object} message: - object like {payload: {...}} 
* @param {function} doNext - callback for next handling
* @returns {function} - callback to process result of insertation
*/
Message._onInsertResult = function(ack, routingKey, message, doNext) {
    /** @callback Message~_onInsertResult 
    * Processes the result of insertation, set acknowledge if success
    * @param {object} insertResult - result of insert (if success) or null otherwise
    * @param {object} insertError - null (if success) or error object
    * @return {} nothing
    */
    return function(insertError, insertResult) {
        if (insertError) {
            insertError.log();
            Message.addRetryAttempt(message, insertError);
            console.log('Rejected during insertation');
            doNext(false, routingKey, message, ack);
        } else {
            console.log(insertResult);
            doNext(true, routingKey, message, ack);
        }
    }
};

/** @method @privat _onSelectResult - closes parameters for callback
* 
* @param {object} ack - object to send acknowledge
* @param {string} routingKey
* @param {object} message ~ {payload: {}}
* @param {object} db - Couch object
* @param {function} doNext - callback for next handling
* @return {function} @callback - handles result of selection
*/
Message._onSelectResult = function(ack, routingKey, message, db, doNext) {
    /** @callback Message~_onSelectResult 
    * Processes the result of selection, invokes duration checking.
    * @param {object} selectError - new Error if selecting was failed.
    * @param {object} selectResult - successful result of selecting or null otherwise.
    * 
    * durationError (if exists) will be added as attempt before message will be send 
    *      to another queue (retry or rejected)
    */
    return function(selectError, selectResult) {
        if (selectError) {
            selectError.log();
            Message.addRetryAttempt(message, selectError);
            console.log('Rejected during selection');
            console.log(doNext);
            doNext(false, routingKey, message, ack);
        } else {
            var durationError = MessageUtils.checkDuration(selectResult.start, message.payload);
            if (durationError) {
                Message.addRetryAttempt(message, durationError);
                console.log('Rejected during duration validation');
                doNext(false, routingKey, message, ack);
            } else {
                var docCall = MessageUtils.createStartStopDoc(selectResult, message.payload);
                db.insert(docCall, Message._onInsertResult(ack, 
                                                           routingKey, 
                                                           message, 
                                                           doNext));
            }
        }
    }
};
module.exports = Message;