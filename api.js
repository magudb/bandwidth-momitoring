'use strict';
/* eslint-env browser */
const driver = require('promise-phantom');
const phantomjs = require('phantomjs-prebuilt');
const Observable = require('zen-observable');
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
var pushMetric = (val, unit) => {
    console.log(`Adding ${val} ${unit}`);
    return influx.writePoints([
        {
            measurement: 'bandwidth',
            fields: { bandwidth: val },
            tags: { unit: unit },
        }
    ]);
};
function init(page, observer, prevSpeed) {
    // TODO: doesn't work with arrow function. open issue on `promise-phantom`
    page.evaluate(function () { // eslint-disable-line prefer-arrow-callback
        const $ = document.querySelector.bind(document);

        return {
            speed: Number($('#speed-value').textContent),
            unit: $('#speed-units').textContent.trim(),
            // somehow it didn't work with `Boolean($('#speed-value.succeeded'))`
            isDone: document.querySelectorAll('.succeeded').length > 0
        };
    })
        .then(result => {
            if (result.speed > 0 && result.speed !== prevSpeed) {
                observer.next(result);
            }

            if (result.isDone) {
                pushMetric(result.speed, result.unit)
                    .then(() => {
                        page.close();
                        observer.complete();
                    })
                    .catch(err => observer.error(err));

            } else {
                setTimeout(init, 100, page, observer, result.speed);
            }
        })
        .catch(err => observer.error(err));
}

module.exports = () => new Observable(observer => {
    driver.create({ path: phantomjs.path })
        .then(phantom => phantom.createPage())
        .then(page => page.open('http://fast.com').then(() => {
            init(page, observer);
        }))
        .catch(err => observer.error(err));
});