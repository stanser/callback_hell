 var ConsumerSrc = require ('./src/Consumer.js');
var cons_stop = new ConsumerSrc.Consumer('stop');
cons_stop.receiveMessage();