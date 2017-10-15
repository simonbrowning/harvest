const { find } = require('underscore');

module.exports = function(name, clients) {
	return find(clients, ({ client }) => {
		return name.toLowerCase() === client.name.toLowerCase();
	});
};
