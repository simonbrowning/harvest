const config = require('../config');

config.logger.logDirectory += `${process.env.log}/`;

let manager, log;
if (process.env.process) {
	manager = require('simple-node-logger').createLogManager(config.logger);
	log = manager.createLogger(process.env.process);
} else {
	log = require('simple-node-logger').createRollingFileLogger(config.logger);
}

process.on('message', function({ event, msg }) {
	if (event) {
		log[event](msg);
	}
});
