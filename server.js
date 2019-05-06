/**
 * Created by mileesingh on 12/19/16.
 */

var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var R = require("r-script");
var server = require('http').Server(app);
var io = require('socket.io')(server);
var app = express();

app.use(bodyParser.json({limit: '50mb'})); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true,limit: '50mb'})); // support encoded bodies
app.use(cors());
io.on('connection', function (socket) {
    console.log('new connection');

    app.post('/api/data', function (req, res, next) {
        var cope = JSON.stringify(req.body.data);
        R("Script.R")
            .data({df: JSON.parse(cope)})
            .call(function (err, d) {
                if (err) throw err;
                console.log(d);
                io.emit('data', {
                    message: d

                });
            });
        return res.send("Ok");
    });

});
server.listen(4041, function () {
    console.log('server up and running at 4041 port');
});
app.listen(8080);
