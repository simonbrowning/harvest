let last_request = {},
	previous_process;

const express = require('express'),
	_ = require('underscore'),
	{ spawn } = require('child_process');

	const app = express();

	//Here we are configuring express to use body-parser as middle-ware.
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());
	app.post('/github-commit', function(req, res) {
	let git = spawn('git', ['pull']),
		result = '';

	git.stdout.on('data', function(data) {
		result += data;
	});

	git.stdout.on('end', function(data) {
		console.log(result);
	});

	git.on('close', function(code) {
		console.log(`child process exited with code ${code}`);
		res.send('commit');
	});
});

app.listen(3001, function(err) {
	if (err) throw err;
	console.log(`server listening on ${3001}`);
});
