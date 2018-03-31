"use strict";

var http = require('http');
var url = require('url');
var fs = require('fs');

/*
var net = require('net');

var server = net.createServer(function(socket) {
	socket.write('Echo server\r\n');
	socket.pipe(socket);
});

server.listen(1337, '127.0.0.1');



http.createServer(function (req, res) {
	var millis = Date.now();
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.end('Hello World after reboot two! ' + millis);
}).listen(8080);
*/
/*
http.createServer(function (req, res) {
	var millis = Date.now();
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.end('Hello World after reboot two! ' + millis);
}).listen(80);


http.createServer(function (req, res) {
  fs.readFile('index.html', function(err, data) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    res.end();
  });
}).listen(8080);
*/

var map1units;

fs.readFile('map1/units.js', function(err, data) {
	console.log("units.js");
	var obj = JSON.parse(data);
	console.log(obj);
	map1units = obj;
});

var map1terrain;

fs.readFile('map1/terrain.js', function(err, data) {
	console.log("terrain.js");
	var obj = JSON.parse(data);
	console.log(obj);
	map1terrain = obj;
});



http.createServer(function (req, res) {
	var q = url.parse(req.url, true);

	var qpn = q.pathname;

	console.log(q.pathname);

	var makeSimpleFS = function(path,contentType)
	{
		fs.readFile(path, function(err, data) {
			res.writeHead(200, {'Content-Type': contentType});
			res.write(data);
			res.end();
		});
	}

	switch(qpn) {
		case "/":
			makeSimpleFS('index.html','text/html');
			break;
			
		case "/main.js":
		case "/jquery.js":
			makeSimpleFS(qpn.substr(1),'text/html');
			break;
			
		case "/img/blueTank.png":
		case "/img/blueSoldier.png":
			makeSimpleFS(qpn.substr(1),'image');
			break;

		case "/favicon.ico":
			// icons are stupid
			makeSimpleFS(qpn.substr(1),'image/x-icon');
			break;

		case "/map1/terrain":
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.write(JSON.stringify(map1terrain));
			res.end();
			break;

		case "/map1/units":
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.write(JSON.stringify(map1units));
			res.end();
			break;

		default:
			console.log("UNKNOWN QUERY PATHNAME");
			console.log(q.pathname);
			res.end();
	}
	
}).listen(8080);

console.log("end of hello.js");

