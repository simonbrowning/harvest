const getPages = require('../actions/getPages.js');

getPages('projects')
	.then(function(result) {
		console.log('finished!');
	})
	.catch(function(reason) {
		console.error(reason);
	});
