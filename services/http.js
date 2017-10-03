const fastify = require('fastify')(),
	_ = require('underscore'),
	{ execFile } = require('child_process');

fastify.post('/api/client', function(req, res) {
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
	return res.send('ok');
});

fastify.listen(3000, function(err) {
	if (err) throw err;
	console.log(`server listening on ${fastify.server.address().port}`);
});
// const server = fastify.listen(3000, function() {
// 	console.log(`Listening on port ${server.address().port}`);
// });
