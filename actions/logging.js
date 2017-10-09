const config = require('../config'),
	slack = require('./slack');

config.logger.logDirectory += `${process.env.log}/`;
console.log(config.logger.logDirectory);

const log = require('simple-node-logger').createRollingFileLogger(
	config.logger
);

module.exports = {
	info: function(msg) {
		log.info(msg);
	},
	error: function(msg) {
		log.error(msg);
		slack({}, msg);
	}
};
