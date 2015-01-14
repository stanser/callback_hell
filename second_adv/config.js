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
        prefix: 'test_stud_queue_',
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
    
var config = {
    defaultConsumer: defaultConsumer,
    amqp: amqp,
    db: db,
    timeZoneOffset: timeZoneOffset
}

module.exports = config;