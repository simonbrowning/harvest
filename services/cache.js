process.env.log = 'cache';

let last_request = {},
    previous_process;

const express = require('express'),
    _ = require('underscore'),
    { execFile } = require('child_process'),
    log = require('../actions/logging.js'),
    bodyParser = require("body-parser"),
    NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 72000 });
const app = express();

//Here we are configuring express to use body-parser as middle-ware.

app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));



app.delete('/cache', function (req, res) {
    myCache.flushAll();
    res.type("json");
    return res.send(JSON.stringify({ message: "cache flushed" }));
});
app.get("/cache/stats", function(req, res) {
    res.type("json");
    return res.send(JSON.stringify(myCache.stats));
});

app.get('/cache', function (req, res) {
    let key = decodeURI(req.query.key);
    log.info(`New request for ${key}`);
    res.type("json");

    if (!key) {
        return res.send(JSON.stringify({ 'message': "no key provided" }));
    }

    myCache.get(key, function (err, value) { 
        if (err) {
            log.info(`Error ${err}`);
            return res.send(JSON.stringify({ 'message': err }));  
        }
        log.info(`${value ?  'SENDING CACHE' : 'NO CACHED VALUE'}`);
        return res.send(value? JSON.stringify(value) : null);
    });
})

app.post('/cache', function (req, res) {
    let new_entry = req.body;
    res.type("json");
    let data = JSON.parse(new_entry.value);
    log.info(`Set entry ${new_entry.name}`);
    myCache.set(new_entry.name, data, function (err,success) { 
        if (err) { 
            return res.send(JSON.stringify({ 'message': err }));
        }
        log.info(`Cache set: ${success}`)
        return res.send(JSON.stringify({ 'message': success ? "Cache Set": "Cache Not Set" }));
    })
});

app.listen(3002, function (err) {
    if (err) throw err;
    log.info(`Express server listening on 3000`);
});
