const sendRequest = require('../actions/sendRequest'),
	log = require('../actions/logging.js');

module.exports = function(item, options) {
	return new Promise(function(resolve, reject) {
		log.info(`Getting full list of ${item}`);
		(async function() {
			let data = [],
				numOfPages,
				promises = [],
				path = `/${item}/`;

			function getPage(page) {
				return new Promise(function(resolve, reject) {
					if (path.indexOf('?') > -1) {
						path = `${path}&page=${page}`;
					}
					sendRequest('GET', {
						path
					})
						.then(function(response) {
							data = data.concat(response[item]);
							resolve();
						})
						.catch(function(reason) {
							log.error(`Failed to get page ${i} of projects: ${reason}`);
							resolve();
						});
				});
			}

			if (options) {
				let query = [];
				for (var key in options) {
					if (options.hasOwnProperty(key)) {
						query.push(`${key}=${options[key]}`);
					}
				}
				path = `${path}?${query.join('&')}`;
			}
			await sendRequest('GET', {
				path
			})
				.then(function(response) {
					numOfPages = response.total_pages + 1;
					data = data.concat(response[item]);

					for (let i = 2; i < numOfPages; ++i) {
						promises.push(getPage(i));
					}

					Promise.all(promises).then(function() {
						log.info('finished looping, total entries: ', data.length);
						resolve(data);
					});
				})
				.catch(function(reason) {
					log.error(`Failed to get projects`);
					reject(reason);
				});
		})();
	});
};
