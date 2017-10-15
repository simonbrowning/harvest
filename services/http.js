process.env.log = 'http';

let last_request = {};

const fastify = require('fastify')(),
	_ = require('underscore'),
	{ execFile } = require('child_process'),
	log = require('../actions/logging.js');

fastify.get('/api/status', function(req, res) {
	res.send('Not dead yet.');
});

fastify.post('/api/client', function(req, res) {
	let args = [`${__dirname}/client.js`];

	let update = req.body;
	log.info(JSON.stringify(update));

	if (
		last_request.account === update.account &&
		update.deployment_project &&
		last_request.deployment_project === update.deployment_project
	) {
		log.info('dupliacte update ignoring');
		return res.send('duplicate');
	} else {
		last_request = update;
	}

	//If no hours have been set set to 0
	if (update.client_hours == undefined) {
		update.client_hours = '0';
	}
	if (update.client_bucket == undefined) {
		update.client_bucket = '0';
	}

	args.push(JSON.stringify(update));

	const sub = execFile('node', args, {
		detached: true,
		stdio: 'ignore'
	});
	return res.send('ok');
});

fastify.listen(3000, function(err) {
	if (err) throw err;
	console.log(`server listening on ${fastify.server.address().port}`);
});
