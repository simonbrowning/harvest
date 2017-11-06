const moment = require('moment'),
	_ = require('underscore'),
	sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js'),
	getPages = require('../actions/getPages.js');

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
			log.info(`${pid} get time report`);
			report = await getPages('time_entries', {
				project_id: pid,
				from: start_date,
				to: end_date
			});
		} catch (e) {
			reject(`failed to get report for ${pid}`);
		}

		_.each(report, function(entry) {
			if (entry.billable) {
				hours_used += entry.hours;
			}
		});
		return resolve(hours_used);
	});
};
