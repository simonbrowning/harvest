const getPages = require('../actions/getPages.js');

console.log('getting projects...');
getPages('projects')
	.then(function(results) {
		let support_projects = 0;
		console.log('finished!', results.length);
		results.forEach(function(project) {
			if (project.is_active && project.name.includes('2018-01')) {
				support_projects++;
			}
		});
		console.log(`Number of Support projects active ${support_projects}`);
	})
	.catch(function(reason) {
		console.error(reason);
	});
