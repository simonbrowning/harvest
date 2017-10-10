const { execFile } = require('child_process'),
	CronJob = require('cron').CronJob,
	slack = require('./actions/slack'),
	config = require('./config');

execFile('node', [`${__dirname}/services/http.js`], {
	detached: true,
	stdio: 'ignore'
});

console.log('starting');
const monthlyRolloverJob = new CronJob(
	'00 00 01 01 */1 *',
	function() {
		slack({ channel: config.slack.channel }, 'Monthly rollover is rolling!');
		execFile('node', [`${__dirname}/services/monthly.js`], {
			detached: true,
			stdio: 'ignore'
		});
	},
	function() {
		/* This function is executed when the job stops */
		slack(
			{ channel: config.slack.channel },
			'Monthly rollover cron job has stopped'
		);
	},
	true /* Start the job right now */
);

console.log(monthlyRolloverJob);
