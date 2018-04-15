"use strict";

var http = require('http');
var url = require('url');
var fs = require('fs');
var shared = require('./shared.js');

/*
var net = require('net');

var server = net.createServer(function(socket) {
	socket.write('Echo server\r\n');
	socket.pipe(socket);
});

server.listen(1337, '127.0.0.1');
*/


var useCache = false;


// files to make available to clients
// key is url
// path is relative path to file on disk
// contentType is type of file to tell the client
// cached into memory at server startup
var clientFileData = new Map();

clientFileData.set('/',{
	"path": "index.html",
	"contentType": 'text/html'
});

clientFileData.set('/client.js',{
	"path": "client.js",
	"contentType": 'text/javascript'
});

clientFileData.set('/jquery.js',{
	"path": "jquery.js",
	"contentType": 'text/javascript'
});

clientFileData.set('/shared.js',{
	"path": "shared.js",
	"contentType": 'text/javascript'
});

clientFileData.set('/client.css',{
	"path": "client.css",
	"contentType": 'text/css'
});

clientFileData.set('/favicon.ico',{
	"path": "favicon.ico",
	"contentType": 'image/x-icon'
});
/*
clientFileData.set('/audio/pop.mp3',{
	"path": "audio/pop.mp3",
	"contentType": 'audio/mpeg'
});

clientFileData.set('/audio/clap.mp3',{
	"path": "audio/clap.mp3",
	"contentType": 'audio/mpeg'
});
*/
// list of promises for each of the files we need to read from disk
var clientFilePromises = [];


clientFileData.forEach(function(value, key, map)
{
	var p = new Promise(function(resolve, reject)
	{
		var url = key;
		var filePath = value.path;
	
		fs.readFile(filePath, function(err, data) {
		
				value.data = data;
				resolve();
		});
	});
	
	clientFilePromises.push(p);
});


// collect all of the .png files from the `img` folder and make them available to clients
// Added MP3 collection from 'audio' dir.
new Promise(function(resolve, reject) {

	fs.readdir("img", (err, files) => {
		files.forEach(file => {
			if (file.endsWith(".png"))
			{
				var p = new Promise(function(resolve, reject)
				{
					var filePath = 'img/'+file;
					fs.readFile(filePath, function(err, data) {

						var url = '/' + filePath;
						clientFileData.set(url,{
							"data": data,
							"contentType": 'image',
							"path": filePath
						});

						resolve();
					});   
				});
				
				clientFilePromises.push(p);
			}
			else
			{
				console.log("img!",file);
			}
		});
		resolve(files.length);
	});
	
	fs.readdir("audio", (err, files) => {
		files.forEach(file => {
			if (file.endsWith(".mp3"))
			{
				console.log('mp3 found');
				var q = new Promise(function(resolve, reject)
				{
					var filePath = 'audio/'+file;
					fs.readFile(filePath, function(err, data) {

						var url = '/' + filePath;
						clientFileData.set(url,{
							"data": data,
							"contentType": 'audio',
							"path": filePath
						});

						resolve();
					});   
				});
				
				clientFilePromises.push(q);
			}
			else
			{
				console.log("audio!",file);
			}
		});
		resolve(files.length);
	});

}).then(function(value) {
	console.log('readdir complete',value);
	
	Promise.all(clientFilePromises).then(function(values) {
		// all of the client files have been read into cache
		console.log("client files cached");
		clientFileData.forEach(function(value, key, map)
		{
			console.log('\t',value.path,key,value.contentType,value.data.length);
		});
	});
});







var map1hash = 1;

var map1units;

fs.readFile('map1/units.json', function(err, data) {
	console.log('map1/units.json');
	var obj = JSON.parse(data);
	console.log(obj);
	map1units = obj;
	
	setTimeout(function()
	{
		endTurn();
	}, 1000);
});

// Map legend:
// P Plains
// W Water
// M Mountains
// F Forest
// R Roads
// S Swamp

var map1terrain;

fs.readFile('map1/terrain.json', function(err, data) {
	console.log('map1/terrain.json');
	map1terrain = JSON.parse(data);
	
	// display map 1
	var r = 0;
	map1terrain.Map.forEach(function(row)
	{
		var c = 0;
		var sb = "";
		row.forEach(function(el)
		{
			sb += el;
		});
		console.log(sb);
	});
	
});


function moveunit(query,response)
{
	console.log(query);
	console.log(map1units);
	
	try
	{
		var id = parseInt(query.id);
		
		var x = parseInt(query.x);
		var y = parseInt(query.y);
		
		
		if (Math.abs(map1units.Units[id].location[0] - x)>1 || Math.abs(map1units.Units[id].location[1] - y)>1)
		{
			var err = "Invalid Movement";
			response.write(err);
			throw err;
		}
		
		var moveTile = map1terrain.Map[y][x];
		console.log('moveTile',moveTile);
		
		var mmm = map1units.Units[id].moveMatrix[moveTile] || Infinity;
		console.log('mmm',mmm);
		
		var cost = Math.hypot(map1units.Units[id].location[0] - x,map1units.Units[id].location[1] - y)*mmm;
		
		if ((map1units.Units[id].actionPoints||0) < cost)
		{
			var err = "Not Enough Action Points";
			response.write(err);
			throw err;
		}
		

		var location = [x,y];

		map1units.Units[id].location = location;
		map1units.Units[id].actionPoints -= cost;
	}
	catch(err)
	{
		console.trace(err);
	}
	
	map1hash++;
	console.log('map1hash',map1hash);
}

function endTurn(query)
{
	console.log('endTurn',query);
	
	map1units.Units.forEach(function(unit)
	{
		unit.actionPoints = (unit.actionPoints||0) + unit.baseActionPoints;
		
		if (unit.actionPoints>unit.baseActionPoints*2)
		{
			unit.actionPoints=unit.baseActionPoints*2;
		}
		
	});
	
	map1hash++;
	console.log('map1hash',map1hash);
}


function attack(query)
{
	try
	{
		var attackerId = parseInt(query.attacker);
		var defenderId = parseInt(query.defender);
		console.log(query,attackerId, defenderId);
		
		var attacker = map1units.Units[attackerId];
		var defender = map1units.Units[defenderId];
		
		var validResponse = shared.checkValidAttack(attacker,defender);
		
		if (validResponse !== true)
		{
			throw validResponse;
		}
		
		attacker.health -= defender.damage._base;
		defender.health -=attacker.damage._base;
		
		attacker.health -= attacker.attackCost;
		
		console.log(attacker,attacker.damage._base,attacker.health);
		console.log(defender,defender.damage._base,defender.health);
	}
	catch(err)
	{
		console.trace(err);
	}
	
	checkForWin();
	
	map1hash++;
	console.log('map1hash',map1hash);
}

function checkForWin()
{
	const teamsAlive = new Set();

	map1units.Units.forEach(function(unit) {
		
		console.log(unit.team,unit.health);
		if (unit.health>0)
		{
			teamsAlive.add(unit.team);
		}
		
	});
	
	console.log(teamsAlive.size,teamsAlive);
	
	// last team standing wins
	if (teamsAlive.size==1)
	{
		map1units.winner = teamsAlive.values().next().value;
		console.log(map1units.winner);
	}
}



///////////////////////////////////////////////////////////////////////////////////////////////////
// handle server requests
///////////////////////////////////////////////////////////////////////////////////////////////////
function dothething(request, response) {

	var milliseconds = (new Date).getTime();

	var q = url.parse(request.url, true);
	var qpn = q.pathname;
	
	response.requestTime = milliseconds;
	response.endLog = function()
	{
		var milliseconds = (new Date).getTime();
		this.end();
		
		var delta = milliseconds-this.requestTime;
		if (delta > 30)
		{
			console.log(milliseconds-this.requestTime+'ms', qpn, request.connection.remoteAddress);
		}
	};
	
	if (qpn!="/map1/hash")
	{
		console.log(q.pathname,request.connection.remoteAddress);
	}
	
	if (clientFileData.has(qpn))
	{
		var fileData = clientFileData.get(qpn);
		
		if (useCache)
		{
			response.writeHead(200, {'Content-Type': fileData.contentType});
			response.write(fileData.data);
			response.endLog();
		}
		else
		{
			fs.readFile(fileData.path, function(err, data) {
				response.writeHead(200, {'Content-Type': fileData.contentType});
				response.write(data);
				response.endLog();
			});
		}
		return;
	}

	switch(qpn) {
		case "/map1/terrain":
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.write(JSON.stringify(map1terrain));
			response.endLog();
			break;

		case "/map1/units":
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.write(JSON.stringify(map1units));
			response.endLog();
			break;
			
		case "/map1/moveunit":
			moveunit(q.query,response);
			response.endLog();
			break;
			
		case "/map1/endturn":
			endTurn(q.query);
			response.endLog();
			break;
			
		case "/map1/attack":
			attack(q.query);
			response.endLog();
			break;
			
		case "/map1/hash":
			response.writeHead(200, {'Content-Type': 'application/json'});
			response.write(JSON.stringify(map1hash));
			response.endLog();
			break;

		default:
			console.log("UNKNOWN QUERY PATHNAME");
			console.log(q.pathname);
			response.endLog();
	}	
}


http.createServer(dothething).listen(8080);

console.log(shared.xkcdRandom());

console.log("end of hello.js");



