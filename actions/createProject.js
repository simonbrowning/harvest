const _ = require('underscore'),
	moment = require('moment'),
	SimpleNodeLogger = require('simple-node-logger'),
	config = require('../config');

(sendRequest = require('../actions/sendRequest')),
	(createProject = require('../utils/createProject'));
//END dependies

module.exports = function(new_project, old_project) {
	return new Promise(function(resolve, reject) {
		createProject({ old_project: old_project, new_project: new_project })
			.then(getUsers)
			.then(processUsers)
			.then(getTasks)
			.then(proccessTasks)
			.then(toggleOldProject)
			.then(function() {
				resolve();
			})
			.catch(function(err) {
				log.warn(`Something bad happend, ${err}`);
				reject();
			});
	});
};
