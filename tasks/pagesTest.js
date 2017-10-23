const getPages = require('../utils/getPages.js');

getPages('')
	.then(function(result) {
		console.log('finished!');
	})
	.catch(function(reason) {
		console.error(reason);
	});
