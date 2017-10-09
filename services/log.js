const config = require('../config');

config.logger.logDirectory += `${process.env.log}/`;

const log = require('simple-node-logger').createRollingFileLogger(
	config.logger
);

process.on('message', function({ event, msg }) {
	if (event) {
		log[event](msg);
	}
});
