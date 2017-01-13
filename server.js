#!/usr/bin/env node

var argv = require('optimist').argv,
    express = require('express'),
    app = express(),
    app2 = express();

app.use(express.static(__dirname + '/testIE'));
app.listen(8001);
app2.use(express.static(__dirname + '/testIE'));
app2.listen(8002);

console.log('Webservers now listening to port 8001 and port 8002');
