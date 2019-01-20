const r = require('request'),
	throttledRequest = require('throttled-request')(r),
	throttlecache = require('throttled-request')(r),
	_ = require('underscore'),
	config = require('../config'),
	log = require('../actions/logging.js');

//configure request throttle
throttledRequest.configure(config.throttle);
throttlecache.configure(config.cache.throttle);

//function for sending requests
const sendRequest = function(method, options) {
	return new Promise(function(resolve, reject) {
		let response;
		if (!_.has(options, 'path') || !method) {
			log.info('No path / method was set');
		}
		//Options for reqest
		const _options = {
			method: method,
			uri: config.harvestv2.project_url,
			headers: {
				'User-Agent': config.harvestv2.useragent,
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'Harvest-Account-ID': config.harvestv2.accountID,
				Authorization: config.harvestv2.auth
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
				})
				.on('data', function(chunk) {
					data += chunk;
				})
				.on('end', function(res) {
					// if (/201|203/.test(response.statusCode)) {
					// 	cb('success', response.headers.location.match(/\d+$/)[0]); //return resolve(response);
					// } else
					if (response.statusCode == 429) {
						if (config.retry.maxRetryies > retry) {
							log.warn('Throttled, retrying');
							setTimeout(function() {
								send(options, cb, ++retry);
							}, Math.floor(config.retry.timeout * (Math.random() * 10)));
						} else {
							log.warn('Giving up');
							return cb('failed', data || response.statusMessage);
						}
					} else if (/4\d{2}/.test(response.statusCode)) {
						let error = JSON.parse(data);
						return cb('failed', error.error || error.error_description || data);
					}
					if (/2\d{2}/.test(response.statusCode)) {
						if (response.request.method == "GET") {
							let name = options.uri.substr(29);
							r(
                                {
									uri: config.cache.url,
									method: "POST",
                                    form: {
                                        name: name,
                                        value: data
                                    }
                                },
                                function(err, resp, body) {
                                    return cb(
                                        "success",
                                        JSON.parse(
                                            data || "{}"
                                        )
                                    );
                                }
                            );
						} else {
							return cb("success", JSON.parse(data || "{}"));
						}
						
					} else {
						return cb('failed', data);
					}
				});
		};

		if (method === "GET") {
			r.get(
				`${config.cache.url}?key=${options.path}`,
				function (err, resp, body) {
					let data;
					if (body) {
						try {
							data = JSON.parse(body);
						} catch (e) {
							log.warn(`failed to parse ${body}`);
						}
						if (data) {
							return resolve(data);
						}
					} else {
						send(
							_options,
							function (status, response) {
								return status === 'success' ? resolve(response) : reject(response);
							},
							0
						);
					}
				}
			);
		} else { 
			send(
				_options,
				function (status, response) {
					return status === 'success' ? resolve(response) : reject(response);
				},
				0
			);
		}
		
	});
}; //sendRequest

module.exports = sendRequest;
