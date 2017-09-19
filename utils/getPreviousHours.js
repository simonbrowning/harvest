const moment = require('moment'),
	sendRequest = require('../actions/sendRequest.js');

module.exports = function(pid, start, end) {
	return new Promise(async function(resolve, reject) {
		let start_date = moment()
				.subtract(start, 'month')
				.startOf('month')
				.format('YYYYMMDD'),
			end_date = moment()
				.subtract(end, 'month')
				.endOf('month')
				.format('YYYYMMDD');

		let report,
			tasks,
			hours_used = 0;
		try {
			report = await sendRequest('GET', {
				path: `/projects/${pid}/entries?from=${start_date}&to=${end_date}`
			});
		} catch (e) {
			reject(`failed to get report for ${pid}`);
		}

		try {
			tasks = sendRequest('GET', {
				path: `/projects/${pid}/task_assignments`
			});
		} catch (e) {
			reject(`failed to get tasks for ${pid}`);
		}

		let hours_used = 0;
		_.each(report, function(entry) {
			let day = entry.day_entry;
			if (isBillableTask(day.task_id, tasks)) {
				hours_used += day.hours;
			}
		});
		return resolve(hours_used);
	});
};
