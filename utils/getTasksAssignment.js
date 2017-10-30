const getPages = require('../actions/getPages.js'),
log = require('../actions/logging.js');

module.exports = function(data) {
	return new Promise(async function(resolve, reject) {
    try {
     data.tasks = await getPages('tasks');
    } catch (e) {
      log.warn('Failed to get tasks '+e);
      reject(e;
    }
    resolve(data);
	});
};
