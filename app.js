const { execFile } = require('child_process');
console.log(process.env.NODE_ENV);

execFile('node', [`${__dirname}/services/http.js`], {
	detached: true,
	stdio: 'ignore'
});

//TODO: sort out cronjob
//cron job for monthly roll over
// const monthlyRolloverJob = new CronJob(
// 	'* * * 06 */1 *',
// 	function() {
// 		console.log('Monthly rollover triggered');
// 		execFile('node', [`${__dirname}/services/monthly.js`], {
// 			detached: true,
// 			stdio: 'ignore'
// 		});
// 	},
// 	function() {
// 		/* This function is executed when the job stops */
// 		console.error('monthlyRolloverJob stopped');
// 	},
// 	true /* Start the job right now */
// );
