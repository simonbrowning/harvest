const r = require('request'),
	throttledRequest = require('throttled-request')(r),
	_ = require('underscore'),
	config = require('../config');

//configure request throttle
throttledRequest.configure(config.throttle);

//function for sending requests
const sendRequest = function(method, options, cb) {
	return new Promise(function(resolve, reject) {
		let data = '',
			response;
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
		//Make request
		throttledRequest(_options)
			.on('response', function(resp) {
				response = resp;
				if (/5\d{2}|4\d{2}/.test(response.statusCode)) {
					return reject(response.statusMessage);
				} else if (/201|203/.test(response.statusCode)) {
					return resolve(response);
				}
			})
			.on('data', function(chunk) {
				data += chunk;
			})
			.on('end', function() {
				resolve(JSON.parse(data || '{}'));
			});
	});
}; //sendRequest

module.exports = sendRequest;
