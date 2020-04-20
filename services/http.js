process.env.log = 'http';

let last_request = {},
	previous_process;

const express = require('express'),
	_ = require('underscore'),
	{ execFile } = require('child_process'),
	log = require('../actions/logging.js'),
	bodyParser = require("body-parser");
const app = express();

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function spwanUser(update) {
	let args = [`${__dirname}/addUser.js`],
		sub;

	args.push(JSON.stringify(update));

	sub = execFile('node', args, {
		detached: true,
		stdio: 'ignore'
	});
	sub.on('exit', function() {
		log.info(sub.pid + ' current process finished');
	});
}

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

function spwanTime(update) {
	return new Promise(function (resolve, reject) {
		let args = [`${__dirname}/track_time.js`],
			sub;

		let timeout = setTimeout(function () {
			log.info('Response taken too long, timing out.')
			resolve(JSON.stringify({ message: "Request timed out" }));
		}, 4500);

		args.push(JSON.stringify(update));

		sub = execFile('node', args, {
			detached: true,
			stdio: 'ignore'
		}, function (error, stdout, stderr) {
				clearTimeout(timeout);
				if(error || stderr) {
					log.info(sub.pid + " " + stderr);
					resolve(JSON.stringify({message: stderr}));
				 }else if (stdout) {
					log.info(sub.pid + " Harvest ID:" + stdout);
					resolve(JSON.stringify({ id: stdout }));
				}
		});
		sub.on('exit', function () {
			log.info(sub.pid + ' current process finished');
		});
		sub.on("error", function () {
			resolve(null);
            log.info(sub.pid + " current process finished");
        });
	}).catch(function (reason) {

	})
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

app.get('/api/status', function(req, res) {
	log.info(`status api called`);
	res.send('Not dead yet.');
});

app.post('/api/user',function(req,res){
	log.info(`user api called`);
	log.info(JSON.stringify(req.body));
	let update = {};
	update.user = req.body.user;
 	update.project = req.body.project;


 	spwanUser(update);
 	res.type('json');
 	res.send(JSON.stringify({result:'ok'}));
});

app.post('/api/time_entry', async function (req, res) { 
	let time_tracked = req.body;
	log.info(`time api called`);
	log.info(JSON.stringify(time_tracked));

	let response = await spwanTime(time_tracked);
	return res.send(response);	
})

app.post('/api/client', function(req, res) {
	log.info(`client api called`);
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

app.delete('api/cache', function (req, response) {
	var options = {
		"method": "DELETE",
		"hostname": ["127", "0", "0", "1"],
		"port": "3002",
		"path": "cache"
	};
	var req = http.request(options, function (res) {
		var chunks = [];

		res.on("data", function (chunk) {
			chunks.push(chunk);
		});
		res.on("end", function () {
			response.send(chuncks);
		})
	});
});

app.listen(3000, function(err) {
	if (err) throw err;
	log.info(`Express server listening on 3000`);
});
