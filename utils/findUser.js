const { find, filter, intersection } = require('underscore'),
	log = require('../actions/logging');

module.exports = function(users, name, roles) {
	if (roles) {
		return filter(users, function(user) {
			return intersection(user.roles, roles).length == roles.length;
		});
	} else {
		return find(users, function(user) {
			if (user.email) {
				return user.email.toLowerCase().indexOf(name.toLowerCase().replace(' ', '.')) == 0;
			} else {
				return user.user.name.toLowerCase() === name.toLowerCase();
			}
		});
	}
}; //checkForNewProject
