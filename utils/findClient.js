const { find } = require('underscore');

module.exports = function(name, clients) {
	return find(clients, ({ client }) => {
		return name === client.name;
	});
};
