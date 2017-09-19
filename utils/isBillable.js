const { find } = require('underscore');

module.exports = function isBillableTask(id, tasks) {
	return _.find(tasks, function({task_assignment}) {
		if (task_assignment.task_id === id) {
			return task_assignment.billable;
		}
	});
