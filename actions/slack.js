const request = require('request'),
	config = require('../config');

let options = {
	method: 'POST',
	url: config.slack.hook,
	headers: {
		'cache-control': 'no-cache',
		'content-type': 'application/json'
	},
	json: true
};

module.exports = function({ channel, project, client, pid, role }) {
	return new Promise(function(resolve, reject) {
		options.body = {
			channel: `${channel}`,
			text: `Just to let you have been added as the ${role} to a new deployment project called <${config
				.harvest
				.project_url}/projects/${pid}|${project}> has been created for ${client}.`
		};

		request(options, function(error, response, body) {
			debugger;
			if (error) {
				console.log(error);
				reject(error);
			} else if (response.statusCode == 404) {
				console.log(response.body);
				reject(response.body);
			} else {
				resolve();
			}
		});
	});
};
