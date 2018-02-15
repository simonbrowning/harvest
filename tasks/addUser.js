(async function() {
	const config = require('../config'),
		getPages = require('../actions/getPages'),
		sendRequest = require('../actions/sendRequest'),
		addUser = require('../utils/addUser.js'),
		findUser = require('../utils/findUser.js');

	console.log(process.argv);
	const users = process.argv[2].split(' ');
	let projects,
		people,
		userObjs = [];

	console.log('getting projects');
	try {
		projects = await getPages('projects');
	} catch (e) {
		console.error('failed get projects');
		process.exit(1);
	}

	console.log('getting users');
	try {
		people = await getPages('users');
	} catch (e) {
		console.error('failed get users');
		process.exit(1);
	}

	console.log('identifying user(s) to add');
	users.forEach(function(email) {
		userObjs.push(findUser(people, email));
	});

	console.log('adding user(s) to projects');
	projects.forEach(function(project) {
		if (
			/^services/i.test(project.name) &&
			(project.is_active || project.id === config.harvest.default_project)
		) {
			console.log(`adding users to ${project.id}`);
			userObjs.forEach(function(user) {
				let uid = addUser(project.id, user.id).catch(function(e) {
					console.error(e);
					return null;
				});
				if (uid == null) {
					console.error(`failed to add ${user.email} to project ${project.id}`);
				}
				console.log(`user ${user.email} added to ${project.id}`);
			});
		}
	});
	console.log('finsihed adding users');
})();
