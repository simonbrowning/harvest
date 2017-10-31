const { find } = require('underscore');

module.exports = function(projects, client_id, name) {
	return find(projects, function(project) {
		return (
			project.client.id === client_id &&
			project.name.toLowerCase().indexOf(name.toLowerCase()) === 0
		);
	});
}; //checkForNewProject
