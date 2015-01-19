// -----general flow-----
var config = require('./config.js');
//var Consumer = require('./' + config.path.models + '/consumer.js');
var Consumer = require('./src/controllers/consumer.js');
Consumer.init();