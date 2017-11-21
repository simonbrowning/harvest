const cleanUp = require('../actions/checkupdate');

async function start() {
	console.log('starting');
	await cleanUp();
	console.log('finished');
}

start();
