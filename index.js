const api = require('./api');
const Influx = require("influx");
const influx = new Influx.InfluxDB({
    host: '192.168.0.108',
    database: 'bandwidth_db',
    schema: [
        {
            measurement: 'bandwidth',
            fields: {
                bandwidth: Influx.FieldType.INTEGER
            }, tags: [
                'unit'
            ]

        }
    ]
})

influx.getDatabaseNames()
    .then(names => {
        if (!names.includes('bandwidth_db')) {
            return influx.createDatabase('bandwidth_db');
        }
    })
    .catch(err => {
        console.error(`Error creating Influx database!`);
    })

var crontab = require('node-crontab');
var jobId = crontab.scheduleJob("*/10 * * * *", function () {
    api()
        .forEach(result => {
            console.log(`Speed ${result.speed} ${result.unit}`)
        })
        .then(() => {
            console.log("DONE");
        })
        .catch(err => {
            console.error(err.message);
        });
});

