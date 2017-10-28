const sendRequest = require('../actions/sendRequest'),
	log = require('../actions/logging.js');

module.exports = function(item, options) {
	return new Promise(function(resolve, reject) {
		console.log(`Getting full list of ${item}s`);
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
							//console.log(page, data.length);
							resolve();
						})
						.catch(function(reason) {
							//log.error(`Failed to get page ${i} of projects: ${reason}`);
							console.error(`Failed to get page ${i} of ${item}s: ${reason}`);
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
			//console.log(``);
			await sendRequest('GET', {
				path
			})
				.then(function(response) {
					numOfPages = response.total_pages + 1;
					data = data.concat(response[item]);

					console.log('loop pages');
					for (let i = 2; i < numOfPages; ++i) {
						console.log(`get page ${i}`);
						promises.push(getPage(i));
					}

					Promise.all(promises).then(function() {
						console.log('finished looping, total entries: ', data.length);
						resolve(data);
					});
				})
				.catch(function(reason) {
					// log.error(`Failed to get projects`);
					console.error(reason);
					reject(reason);
				});
		})();
	});
};
