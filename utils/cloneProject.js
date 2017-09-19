//clone project
const { each, has } = require('underscore'),
	{ exclude_fields } = require('../config');

module.exports = function(old_project, new_project) {
	//Clone project
	_.each(old_project, function(value, key, list) {
		if (_.has(list, key) && !exclude_fields.includes(key)) {
			new_project[key] = value;
		}
	});
};
