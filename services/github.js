let last_request = {},
	previous_process;

const fastify = require('fastify')(),
	_ = require('underscore'),
	{ exec } = require('child_process');

fastify.post('/github-commit', function(req, res) {
	exec('cd /home/simon/harvest && git pull');
	res.send(202, 'Accepted\n');
});

fastify.listen(3001, function(err) {
	if (err) throw err;
	console.log(`server listening on ${fastify.server.address().port}`);
});
