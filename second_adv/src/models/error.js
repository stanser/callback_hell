//Errors
/**
Codes:
ICID - invalid call_id
CBMISS - callback missing or invalid
EXTERR - error was caused in external process (Couch, AMQP connection, etc.)
UNKERR - unknown error if externalError is not an instance of {Error}
ITMSMP - invalid timestamp
IDUR - negative duration
MSNPUB - message was bnot published
IRTKY - invalid routing key
ISPMTD - invalid sip-method
MISPROP - property is missing
IPHN - invalid phone's number

WARN - Warning, some non-critical issue has happened (used for log)

BRINP - broker input

*/

var util = require('../../node_modules/util');
/** @class REngError
* @param {string} code - literal code of Error
* @param {string, object array} invalid - what is invalid
* @param {string} description - detiled description
* @param {string} location - error location
* @param {string} notice - optional notice
* @param {externalError} - external Error (was born in some service)
*
* Properties  may be instancea of Array.
*
* @example new REngError(): creates default error UNKERR
* @example new REngError(null, 'some error clarification'): 
*          creates UNKERR where REngError.description === 'some error clarification'
* @example new REngError(null, <object> Error):
           creates EXTERR with Error's own name, message and stack
*/
function REngError(options, externalError) {
    if (options && options.hasOwnProperty('code')) {
        this.code = options.code;
        this.invalid = options.invalid;
        this.description = options.description;
        this.location = options.location;
        this.notice = options.notice;
        Error.captureStackTrace(this, REngError);
    } else if (util.isError(externalError)) {
        this.setREngErrorProperties(externalError);
    } else {
        this.setPropertiesForUnknown(externalError);  
    }
};

util.inherits(REngError, Error);
REngError.prototype.name = 'REngError';

/** @method setREngErrorProperties 
* Sets properties if external error was passed to constructor
* @param {Error} externalError - an {Error} instance
*/
REngError.prototype.setREngErrorProperties = function(externalError) {
    if (externalError) {
        console.log (externalError);
        this.code = 'EXTERR ' + externalError.name;
        this.invalid = 'service';
        this.description = externalError.message;
        this.location = 'library';
        this.notice = 'check couch, amqp or other external services';
        this.stack = externalError.stack;
    }
}

/** @method setPropertiesForUnknown 
* Sets properties if unknown data was passed to constructor
* @param {any} externalError
*/
REngError.prototype.setPropertiesForUnknown = function(externalError) {
    this.code = 'UNKERR';
    this.invalid = '';
    this.description = externalError ? String(externalError) : 'default error';    
    this.location = '';
}

/** @method log
* @static
* Logs the error
* @param {object} value - error needs to be logged
*/
REngError.prototype.log = function(toLogStack) {
    toLogStack = toLogStack === 'stack' ? true : false;
    var type = (this.code === "WARN") ? 'Warning:' : 'REngError:';
    var msgToLog = util.format('    %s\n    invalid: %s\n    location: %s', 
                                this.description, this.invalid, this.location);
    console.log(type, this.code);
    console.log(msgToLog);
    if (this.notice) console.log('    notice: %s', this.notice);
    if (toLogStack && this.code !== 'WARN' && this.stack) console.log(this.stack);
};

module.exports = REngError;