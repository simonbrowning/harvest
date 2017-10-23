const sendRequest = require('../actions/sendRequest'),
	log = require('../actions/logging.js');

module.exports = function(item) {
	return new Promise(function(resolve, reject) {
		console.log(`Getting full list of ${item}s`);
		(async function() {
			let data = [],
				numOfPages,
				promises = [];

			function getPage(page) {
				return new Promise(function(resolve, reject) {
					sendRequest('GET', {
						path: `/${item}/?page=${page}`
					})
						.then(function(response) {
							data = data.concat(response[item]);
							console.log(page, data.length);
							resolve();
						})
						.catch(function(reason) {
							//log.error(`Failed to get page ${i} of projects: ${reason}`);
							console.error(`Failed to get page ${i} of ${item}s: ${reason}`);
							resolve();
						});
				});
			}

			//console.log(``);
			await sendRequest('GET', {
				path: `/${item}/`
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
						console.log(data.length);
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
