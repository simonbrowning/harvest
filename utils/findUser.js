const { find } = require('underscore');

module.exports = function(users, email) {
	return find(users, function({ user }) {
		return user.email.toLowerCase() === email.toLowerCase();
	});
}; //checkForNewProject
