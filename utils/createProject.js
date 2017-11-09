const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');
//Create new project
module.exports = function(data) {
	return new Promise(async function(resolve, reject) {
		let new_project;
		log.info(data.client_name + ': Create new project');
		try {
			data.new_project = await sendRequest('POST', {
				path: '/projects',
				form: data.new_project
			});
			log.info(JSON.stringify(data.new_project));
			log.info(
				`${data.client_name}: ${data.new_project
					.id} new service project created`
			);
		} catch (e) {
			log.warn(`${data.client_name} failed to create new project: ${e}`);
			reject(` failed to create new project: ${e}`);
		}
		data.new_pid = data.new_project.id;
		resolve(data);
	});
};
