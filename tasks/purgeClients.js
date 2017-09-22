var r = require('request'),
	throttledRequest = require('throttled-request')(r),
	config = require('../config'),
	sendRequest = require('../actions/sendRequest');

// throttledRequest.on('request', function () {
//   console.log('Making a request. Elapsed time: %d ms', Date.now() - startedAt);
// });

function callback(body) {
	console.log('Got clients now loop');
	//var projects = JSON.parse(body);
	body.forEach(function({ client }) {
		let CID = client.id;
		console.log(`${CID} to be deleted.`);
		sendRequest('DELETE', { path: `/clients/${CID}/` })
			.then(function() {
				console.log(`${CID} deleted.`);
			})
			.catch(function(reason) {
				console.log(`${CID} failed, ${reason}`);
			});
	});
}
console.log(config.harvest.project_url);
console.log('Get Clients');
sendRequest('GET', { path: '/clients' })
	.then(callback)
	.catch(function(reason) {
		console.log(`Failed: ${reason}`);
	});
