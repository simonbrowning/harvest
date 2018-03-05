async function init() {
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
	console.time('projects');
	let promises = projects.map(function(project) {
		return new Promise(function(resolve,reject){
		if (
			/^services/i.test(project.name) && project.id === 16606886
			//(project.is_active || project.id === config.harvest.default_project)
		) {
			
			console.log(`adding users to ${project.id}`);
			let userPromises = userObjs.map(function(user) {
				return new Promise(async function(resolve,reject){
					let uid = await addUser(project.id, user.id).catch(function(e) {
						console.error(e);
						reject(e);
					});
					if (uid == null) {
						console.error(`failed to add ${user.email} to project ${project.id}`);
						reject(`FAILED: to add ${user.email} to project ${project.id}`);
					} else {
						console.log(`user ${user.email} added to ${project.id}`);
						resolve();
					}
				});
			});

			Promise.all(userPromises).then(function(){
				console.log(`finished userPromise`);
				return resolve();
			}).catch(function(e){
				console.log(`ERROR: userPromises failed ${e}`);
			})
		}else{
			resolve();
		}
		})
	});

	Promise.all(promises).then(function(){
			console.timeEnd('projects');
			console.log('finsihed adding users');
		}
	).catch(function(e){
		console.log(`ERROR: projects promises failed ${e}`);
	});
}

init();
