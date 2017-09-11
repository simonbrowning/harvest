const http = require('http');
const { fork } = require('child_process');

const server = http.createServer();

server.on('request', (req, res) => {
	if (req.url === '/api/client') {
		const compute = fork('client.js');
		compute.send('start');
		compute.on('message', msg => {
			console.log(compute.pid);
			compute.kill();
			res.end(msg);
		});
		//res.end(req.body);
	} else {
		console.log(req.url);
		res.statusCode = 503;
		res.end('not here');
	}
});

server.listen(3000);
console.log(`Server is listening on http://localhost:3000`);
