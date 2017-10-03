const { find } = require('underscore');

module.exports = function(users, name) {
	return find(users, function({ user }) {
		return (
			user.email.toLowerCase().indexOf(name.toLowerCase().replace(' ', '.')) ==
			0
		);
	});
}; //checkForNewProject
