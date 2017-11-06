const getPages = require('../actions/getPages.js'),
log = require('../actions/logging.js');

module.exports = function(data) {
	return new Promise(async function(resolve, reject) {
    try {
     data.users = await getPages('tasks');
    } catch (e) {
      log.warn('Failed to get users '+e);
      reject(e;
    }
    resolve(data);
	});
};
