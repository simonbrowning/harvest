const sendRequest = require('../actions/sendRequest.js');

module.exports = function({ old_project }) {
	return new Promise(async function(resolve, reject) {
		let toggle,
			pid = old_project.id;
		console.log(`create new task for ${pid}`);
		try {
			toggle = sendRequest('PUT', {
				path: `/projects/${pid}/toggle`
			});
		} catch (e) {
			reject(`failed to toggle ${pid}`);
		}
		resolve();
	});
};
