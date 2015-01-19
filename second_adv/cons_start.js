var ConsumerSrc = require('./src/Consumer.js');
var Promise = require('bluebird');

var cons_start = new ConsumerSrc.Consumer('start');
console.log('Promise paradise comes true...');

//cons_start.receiveMessage('start');
