const r = require('request'),
	throttledRequest = require('throttled-request')(r),
	_ = require('underscore'),
	config = require('../config');

//configure request throttle
throttledRequest.configure(config.throttle);

//function for sending requests
const sendRequest = function(method, options, cb) {
	return new Promise(function(resolve, reject) {
		let response;
		if (!_.has(options, 'path') || !method) {
			console.log('No path / method was set');
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
		//Make request

		const send = function(options, cb, retry) {
			let data = '';
			throttledRequest(options)
				.on('response', function(resp) {
					response = resp;
					if (/201|203/.test(response.statusCode)) {
						cb('success', response); //return resolve(response);
					} else if (/5\d{2}/.test(response.statusCode)) {
						if (config.retry.maxRetryies > retry) {
							console.log('500 error, retrying');
							setTimeout(function() {
								send(options, cb, ++retry);
							}, (Math.floor(config.retry.timeout * (Math.random() * 10)));
						} else {
							console.log('Giving up');
							cb('failed', response.statusMessage);
						}
					} else if (/4\d{2}/.test(response.statusCode)) {
						cb('failed', response.statusMessage);
					}
				})
				.on('data', function(chunk) {
					data += chunk;
				})
				.on('end', function() {
					if (!/5\d{2}/.test(response.statusCode)) {
						cb('success', JSON.parse(data || '{}'));
					}
				});
		};
		send(
			_options,
			function(status, response) {
				return status === 'success' ? resolve(response) : reject(response);
			},
			0
		);
	});
}; //sendRequest

module.exports = sendRequest;
