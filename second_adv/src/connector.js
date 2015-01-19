/*
* Establishes connestions
*/
var amqp = require('amqp'); //rabbit mq
var config = require('../config');
var couch = require('./models/CouchDb.js')

var connector = {};

connector.rabbitmq = function() {
    return amqp.createConnection(config.amqp.connection.options[0], 
                                 config.amqp.connection.options[1]);
}

connector.couch = function() {
    return couch.CouchDb.getInstanceOfCouchDb();
}

module.exports = connector;