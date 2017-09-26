const { filter } = require('underscore');

module.exports = function(tasks, name) {
	return filter(tasks, function({ task }) {
		return task.name.toLowerCase().indexOf(name.toLowerCase()) == 0;
	});
}; //checkForNewProject
