const express = require('express'),
	bodyParser = require('body-parser'),
	_ = require('underscore'),
	{ execFile } = require('child_process');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/client', function(req, res) {
	let args = [`${__dirname}/client.js`];

	let update = req.body;
	//If no hours have been set set to 0
	if (update.client_hours == undefined) {
		update.client_hours = '0';
	}
	if (update.client_bucket == undefined) {
		update.client_bucket = '0';
	}

	console.log(JSON.stringify(update));
	args.push(JSON.stringify(update));

	const sub = execFile('node', args, {
		detached: true,
		stdio: 'ignore'
	});
	return res.send('');
});

const server = app.listen(3000, function() {
	console.log(`Listening on port ${server.address().port}`);
});
