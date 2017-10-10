const moment = require('moment'),
	_ = require('underscore'),
	sendRequest = require('../actions/sendRequest.js'),
	isBillable = require('../utils/isBillable.js'),
	log = require('../actions/logging.js');

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
			log.debug(`${pid} get time report`);
			report = await sendRequest('GET', {
				path: `/projects/${pid}/entries?from=${start_date}&to=${end_date}`
			});
		} catch (e) {
			reject(`failed to get report for ${pid}`);
		}

		try {
			log.debug(`${pid} get tasks for entries`);
			tasks = await sendRequest('GET', {
				path: `/projects/${pid}/task_assignments`
			});
		} catch (e) {
			reject(`failed to get tasks for ${pid}`);
		}
		_.each(report, function({ day_entry }) {
			if (isBillable(day_entry.task_id, tasks)) {
				hours_used += day_entry.hours;
			}
		});
		return resolve(hours_used);
	});
};
