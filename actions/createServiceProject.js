const createProject = require('../utils/createProject'),
	getUsers = require('../utils/getUserAssignment.js'),
	getTasks = require('../utils/getTasksAssignment.js'),
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
			.then(function(data) {
				log.info(
					`${new_project.client
						.name}: ${data.new_pid} finished creating services project`
				);
				resolve(data.new_pid);
			})
			.catch(function(err) {
				log.error(err);
				reject(err);
			});
	});
};
