const cleanUp = require('../actions/checkupdate'),
	request = require('request');

async function start() {
	console.log('starting');
	await cleanUp();
	request.delete('http://127.0.0.1:3002/cache', function () {
		console.log('New Services project created clearing cache');
	});
	console.log('finished');
}

start();
