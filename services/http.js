const express = require('express'),
	bodyParser = require('body-parser'),
	_ = require('underscore'),
	{ execFile } = require('child_process');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/client', function(req, res) {
	//TODO: validate request, account etc..
	let args = [`${__dirname}/client.js`];

	_.each(req.body, function(value, key) {
		args.push(`${key}='${value}'`);
	});

	const sub = execFile('node', args, {
		detached: true,
		stdio: 'ignore'
	});
	return res.send('');
});

const server = app.listen(3000, function() {
	console.log('Listening on port %s...', server.address().port);
});
