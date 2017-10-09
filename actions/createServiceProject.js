const createProject = require('../utils/createProject'),
	getUsers = require('../utils/getUsers.js'),
	getTasks = require('../utils/getTasks.js'),
	processTasks = require('../utils/processTasks.js'),
	processUsers = require('../utils/processUsers.js'),
	toggleProject = require('../utils/toggleProject.js'),
	log = require('../actions/logging.js');
//END dependies

module.exports = function(new_project, old_project) {
	return new Promise(function(resolve, reject) {
		createProject({ old_project: old_project, new_project: new_project })
			.then(getUsers)
			.then(processUsers)
			.then(getTasks)
			.then(processTasks)
			.then(toggleProject)
			.then(function() {
				log.info(`${new_project.client_id} finished creating services project`);
				resolve();
			})
			.catch(function(err) {
				log.error(`Something bad happend, ${err}`);
				reject();
			});
	});
};
