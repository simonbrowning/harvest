let last_request = {},
	previous_process;

const fastify = require('fastify')(),
	_ = require('underscore'),
	{ spawn } = require('child_process');

fastify.post('/github-commit', function(req, res) {
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

fastify.listen(3001, function(err) {
	if (err) throw err;
	console.log(`server listening on ${fastify.server.address().port}`);
});
