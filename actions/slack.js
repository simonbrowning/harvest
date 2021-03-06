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

module.exports = function({ channel, project, client, pid, role }, text) {
	return new Promise(function(resolve, reject) {
		if (!text && role) {
			text = `Just to let you have been added as the ${role} to a new deployment project called <${
				config.harvest.project_url
			}/projects/${pid}|${project}> has been created for ${client}.`;
		}
		if (!role && !text) {
			text = `${client}'s hours has been updated.`;
		}

		options.body = {
			channel: channel,
			text: text
		};

		request(options, function(error, response, body) {
			resolve();
		});
	});
};
