process.env.log = 'http';

let last_request = {},
	previous_process;

const fastify = require('fastify')(),
	_ = require('underscore'),
	{ execFile } = require('child_process'),
	log = require('../actions/logging.js');

function spwanClient(update) {
	let args = [`${__dirname}/client.js`],
		sub;

	args.push(JSON.stringify(update));

	previous_process = sub = execFile('node', args, {
		detached: true,
		stdio: 'ignore'
	});
	sub.on('exit', function() {
		log.info(sub.pid + ' current process finished');
	});
}

function waitForPrevious(update) {
	if (previous_process._closesGot !== previous_process._closesNeeded) {
		log.info(
			previous_process.pid + ' previous request still active ... waiting'
		);
		previous_process.on('exit', function() {
			log.info(previous_process.pid + ' previous request exited');
			log.info(previous_process.pid + ' spawn client');
			spwanClient(update);
		});
	} else {
		log.info(previous_process.pid + ' previous request not running');
		log.info(previous_process.pid + ' spawn client');
		spwanClient(update);
	}
}

fastify.get('/api/status', function(req, res) {
	res.send('Not dead yet.');
});

fastify.post('/api/client', function(req, res) {
	let update = req.body;

	//If no hours have been set set to 0
	if (update.client_hours == undefined) {
		update.client_hours = '0';
	}
	if (update.client_bucket == undefined) {
		update.client_bucket = '0';
	}
	log.info(JSON.stringify(update));
	if (last_request.account === update.account) {
		if (update.account_update) {
			if (
				last_request.client_hours == update.client_hours &&
				last_request.client_bucket == update.client_bucket
			) {
				log.info('dupliacte account update ignoring');
				return res.send('duplicate');
			} else {
				last_request = update;
				waitForPrevious(update);
			}
		} else if (
			!!last_request.deployment_project &&
			last_request.deployment_project === update.deployment_project
		) {
			log.info('dupliacte deployment ignoring');
			res.type('json');
			return res.send(JSON.stringify({result:'duplicate'}));
		} else {
			last_request = update;
			waitForPrevious(update);
		}
	} else {
		last_request = update;
		spwanClient(update);
	}

	res.type('json');
	return res.send(JSON.stringify({result:'ok'}));
});

fastify.listen(3000, function(err) {
	if (err) throw err;
	log.info(`server listening on ${fastify.server.address().port}`);
});
