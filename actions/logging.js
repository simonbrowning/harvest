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
		slack(
			{ channel: config.slack.channel },
			`Unhandled Rejection at: ${pos}, reason: ${reason}`
		);
	});

	process.on('exit', function() {
		logger.kill();
	});
} else {
	module.exports = {
		info: function(msg) {},
		debug: function(msg) {},
		warn: function(msg) {},
		error: function(msg) {},
		close: function() {}
	};
}
