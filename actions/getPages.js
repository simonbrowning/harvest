const sendRequest = require('../actions/sendRequest'),
	log = require('../actions/logging.js');

module.exports = function(item, options) {
	return new Promise(function(resolve, reject) {
		(async function() {
			let data = [],
				numOfPages,
				promises = [],
				path = `/${item}/`;

			function getPage(page) {
				return new Promise(function(resolve, reject) {
					if (path.includes('?')) {
						if (/page\=\d+/.test(path)) {
							path = path.replace(/page\=\d+/, `page=${page}`);
						}
					} else {
						path = `${path}?page=${page}`;
					}

					sendRequest('GET', {
						path
					})
						.then(function(response) {
							data = data.concat(response[item]);
							resolve();
						})
						.catch(function(reason) {
							log.error(`Failed to get page ${page} of ${item}: ${reason}`);
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
					numOfPages = response.total_pages;
					data = data.concat(response[item]);

					for (let i = 2; i <= numOfPages; ++i) {
						promises.push(getPage(i));
					}

					Promise.all(promises).then(function() {
						resolve(data);
					});
				})
				.catch(function(reason) {
					log.warn(`Failed to get ${item}`);
					log.info(reason);
					log.info(path);
					reject(reason);
				});
		})();
	});
};
