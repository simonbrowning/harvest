const { find, filter, intersection } = require('underscore');

module.exports = function(users, name, roles) {
	if (roles) {
		return filter(users, function(user) {
			return intersection(user.roles, roles).length == roles.length;
		});
	} else {
		return find(users, function(user) {
			return (
				user.email
					.toLowerCase()
					.indexOf(name.toLowerCase().replace(' ', '.')) == 0
			);
		});
	}
}; //checkForNewProject
