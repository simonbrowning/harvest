if (process.env.log) {
	const { fork } = require('child_process'),
		logger = fork(`${process.cwd()}/services/log.js`),
		slack = require('./slack.js'),
		config = require('../config');

	module.exports = {
		info: function(msg) {
			logger.send({ event: 'info', msg: msg });
		},
		debug: function(msg) {
			logger.send({ event: 'debug', msg: msg });
		},
		warn: function(msg) {
			logger.send({ event: 'warn', msg: msg });
		},
		error: function(msg) {
			logger.send({ event: 'error', msg: msg });
			slack({ channel: config.slack.channel }, msg);
		},
		close: function() {
			setTimeout(function() {
				logger.kill();
			}, 5000);
		}
	};

	process.on('unhandledRejection', function(reason, pos) {
		logger.send({ event: 'error', msg: reason.stack });
		slack(
			{ channel: config.slack.channel },
			`Unhandled Rejection:
			${reason.stack}`
		);
		process.exit(1);
	});

	process.on('exit', function() {
		logger.kill();
	});
} else {
	module.exports = {
		info: function(msg) {},
		info: function(msg) {},
		warn: function(msg) {},
		error: function(msg) {},
		close: function() {}
	};
}
