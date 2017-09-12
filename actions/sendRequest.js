const r = require('request'),
	throttledRequest = require('throttled-request')(r),
	_ = require('underscore'),
	config = require('../config'),
	retry = require('retry');

//configure request throttle
throttledRequest.configure(config.throttle);

const operation = retry.operation(config.retry);

//function for sending requests
const sendRequest = function(method, options, cb) {
	return new Promise(function(resolve, reject) {
		operation.attempt(function(currentAttempt) {
			let response,
				data = '';
			if (!_.has(options, 'path') || !method) {
				log.info('No path / method was set');
			}
			//Options for reqest
			const _options = {
				method: method,
				uri: config.harvest.project_url,
				headers: {
					'User-Agent': 'node-harvest',
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: config.harvest.auth
				},
				json: true // Automatically parses the JSON string in the response
			};
			//Loop through and merge options
			for (let key in options) {
				if (options.hasOwnProperty(key)) {
					if (key === 'path') {
						_options.uri += options[key];
					} else {
						_options[key] = options[key];
					}
				}
			}
			console.log('Attempt operation');
			//Make request

			throttledRequest(_options)
				//TODO: Add rety method for failed requests
				.on('response', function(resp) {
					response = resp;
					console.log(`Code: ${response.statusCode}`);
					console.log(`Attempt: ${currentAttempt}`);
					if (/201|203/.test(response.statusCode)) {
						return resolve(response);
					}
				})
				.on('data', function(chunk) {
					data += chunk;
				})
				.on('end', function() {
					if (/4\d{2}/.test(response.statusCode)) {
						console.log('reject');
						return reject(response.statusMessage);
					}
					if (operation.retry(response.statusCode == 503)) {
						console.log('retry');
						return;
					}
					return resolve(JSON.parse(data || '{}'));
				});
		});
	});
}; //sendRequest

module.exports = sendRequest;
