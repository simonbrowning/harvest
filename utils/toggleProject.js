const sendRequest = require('../actions/sendRequest.js'),
	config = require('../config'),
	log = require('../actions/logging.js');

module.exports = function({ old_project }) {
	return new Promise(async function(resolve, reject) {
		let toggle,
			pid = old_project.id;
		if (config.harvest.service_project !== pid) {
			log.info(`${pid} deactivating project`);
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
