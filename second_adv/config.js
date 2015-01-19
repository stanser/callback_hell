/* Default values
*/
var amqp = { 
    connection: { 
        options: [
            {host: '10-60-8-149-pure.kwebbl.dev'}, //options object
            {reconnect: false} //custom options object
        ]
    },
    exchange: {
        name: 'test_stud',
        options: {
            autoDelete: false, 
            confirm: true
        } 
    },
    queue: {
<<<<<<< HEAD
        prefix: 'test_stud_queue',
=======
        prefix: 'test_stud_queue_',
>>>>>>> bf3b1ae59856a780287418a2e9467cfaf0880cc0
        options: {
            autoDelete: false
        }
    }    
};

var db = {
    url: 'http://couchdb-ha.kwebbl.dev:5984',
    name: 'test_a_studenyak',
    searchCall: {
        view: 'session',
        design: 'calls'
    }
};

var defaultConsumer = {
    reQueueAmmount: 2
};

var timeZoneOffset = {
    CEST: 2,
    CET: 1
};
<<<<<<< HEAD

var path = {
    models: 'src/Models',
    controllers: 'src/Controllers',
    connector: 'src'
};
=======
>>>>>>> bf3b1ae59856a780287418a2e9467cfaf0880cc0
    
var config = {
    defaultConsumer: defaultConsumer,
    amqp: amqp,
    db: db,
<<<<<<< HEAD
    timeZoneOffset: timeZoneOffset,
    path: path
=======
    timeZoneOffset: timeZoneOffset
>>>>>>> bf3b1ae59856a780287418a2e9467cfaf0880cc0
}

module.exports = config;