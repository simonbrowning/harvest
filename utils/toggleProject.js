const sendRequest = require('../actions/sendRequest.js'),
	config = require('../config'),
	log = require('../actions/logging.js');

module.exports = function(data) {
	return new Promise(async function(resolve, reject) {
		let toggle,
			pid = data.old_project.id;
		if (config.harvest.default_project !== pid) {
			log.info(
				`${data.new_project.client.name}: ${data.old_project
					.id} deactivating project`
			);
			try {
				toggle = await sendRequest('PATCH', {
					path: `/projects/${pid}`,
					form: {
						is_active: false
					}
				});

				log.info(
					`${data.new_project.client.name}: ${data.old_project
						.id} project ${!toggle.is_active ? 'deactivated' : 'still active'}`
				);
			} catch (e) {
				reject(
					`${data.new_project.client.name}: ${data.old_project
						.id} failed to deactivate: ${e}`
				);
			}
		} else {
			log.info('"old" project is the Template ignoring');
		}
		resolve(data);
	});
};
