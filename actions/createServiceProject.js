const createProject = require('../utils/createProject'),
	getUsers = require('../utils/getUsers.js'),
	getTasks = require('../utils/getTasks.js'),
	processTasks = require('../utils/processTasks.js'),
	processUsers = require('../utils/processUsers.js'),
	toggleProject = require('../utils/toggleProject.js');
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
				console.log(
					`finished creating project ${old_project.id} for ${old_project.client_id}`
				);
				resolve();
			})
			.catch(function(err) {
				console.error(`Something bad happend, ${err}`);
				reject();
			});
	});
};
