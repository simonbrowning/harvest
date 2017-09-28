const sendRequest = require('../actions/sendRequest.js'),
	config = require('../config');

module.exports = function({ old_project }) {
	return new Promise(async function(resolve, reject) {
		let toggle,
			pid = old_project.id;
		if (config.harvest.service_project !== pid) {
			console.log(`Toggling old project ${pid}`);
			try {
				toggle = sendRequest('PUT', {
					path: `/projects/${pid}/toggle`
				});
			} catch (e) {
				reject(`failed to toggle ${pid}`);
			}
		}
		resolve();
	});
};
