const getPreviousHours = require('../utils/getPreviousHours.js');

getPreviousHours(15280946, 0, 0)
	.then(function(result) {
		console.log(result);
	})
	.catch(function(reason) {
		console.error(reason);
	});
