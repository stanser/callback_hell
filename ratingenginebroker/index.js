//nodejs broker_index -t 4 -o 2 -n 1 -s 1 -i 200

var BrokerSrc = require ('./src/Broker.js');
var program = require('commander');

/* Create Broker to send messages (to emulate calls) with following parameters:
*
* 1) {integer} countTotal - total amount of calls have to be emulated 
*    One call includes two messages: 1 start and 1 stop
* 2) {integer} countAtOnce - how many calls have to be emulated during 1 iteration
* 3) {integer} countOfStartLess - how many calls should be without start
* 4) {integer} countOfNegativeDuration - how many calls should have negative duration
* 5) {integer} interval - in ms, interval for sending
*
* Every parameter accepts default value if isn't specified.
*/

//get values for Broker from command line
program
  .version('0.1.0')
  .option('-t, --total [total]', 'Total count of calls (pair: start + stop messages)')
  .option('-o, --once [once]', 'Count per one iteration: one portion of messages')
  .option('-s, --start-less [start_less]', 'Count of messages without start')
  .option('-n, --negative-duration [negative_duration]', 
          'Count of messages with negative duration')
  .option('-i, --interval [interval]', 
          'Interval in ms (one portion are being sent during each interval)')
  .parse(process.argv);

var brokerOptions = {
    total: program.total,
    once: program.once,
    startLess: program.startLess,
    negativeDuration: program.negativeDuration,
    interval: program.interval
}

console.log('Your data:');
console.log(brokerOptions);
console.log('--------------');

var broker = new BrokerSrc.Broker(brokerOptions);

if (broker.countTotal) {
    console.log('--------------');
    console.log('Broker:');
    console.log('  Total count:', broker.countTotal);
    console.log('  Count at once:', broker.countAtOnce);
    console.log('  Without start:', broker.countOfStartLess);
    console.log('  With negative duration:', broker.countOfNegativeDuration);
    console.log('  Sending via interval, ms:', broker.interval);
    console.log('--------------');
    broker.sendMsg();
    
}
