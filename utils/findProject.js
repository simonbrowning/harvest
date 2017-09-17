const { find } = require('underscore');

module.exports = function(projects, client_id, name) {
	return find(projects, function({ project }) {
		return project.client_id === client_id && project.name.indexOf(name) === 0;
	});
}; //checkForNewProject
