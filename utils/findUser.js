const { find, filter, intersection } = require('underscore'),
	log = require('../actions/logging');

module.exports = function(users, name, roles) {
	if (roles) {
		return filter(users, function(user) {
			return user.is_active && intersection(user.roles, roles).length == roles.length;
		});
	} else {
		return find(users, function(user) {
			if (user.email) {
				return user.is_active && user.email.toLowerCase().indexOf(name.toLowerCase().replace(' ', '.')+"@tealium.com") == 0;
			} else {
				return user.is_active && user.user.name.toLowerCase() === name.toLowerCase();
			}
		});
	}
}; //checkForNewProject
