const { find } = require('underscore');

module.exports = function(projects, client_id, name) {
	return find(projects, ({ project }) => {
		return (
			project.client_id === client_id &&
			project.name.toLowerCase().indexOf(name.toLowerCase()) === 0
		);
	});
}; //checkForNewProject
