const createProject = require('../utils/createProject'),
  getUsers = require('../utils/getUsers.js'),
  getTasks = require('../utils/getUsers.js'),
  proccessTasks = require('../utils/proccessTasks.js'),
  proccessUsers = require('../utils/proccessUsers.js'),
  toggleProject = require('../utils/toggleProject.js'),
//END dependies

module.exports = function(new_project, old_project) {
	return new Promise(function(resolve, reject) {
		createProject({ old_project: old_project, new_project: new_project })
			.then(getUsers)
			.then(processUsers)
			.then(getTasks)
			.then(proccessTasks)
			.then(toggleProject)
			.then(function() {
        console.log(`finished rollover for services project ${old_project.id}`);
				resolve();
			})
			.catch(function(err) {
				console.error(`Something bad happend, ${err}`);
				reject();
			});
	});
};
