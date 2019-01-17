
async function init() {
	const config = require('../config'),
		getPages = require('../actions/getPages'),
		sendRequest = require('../actions/sendRequest'),
		removeUser = require('../utils/removeUser.js'),
		findUser = require('../utils/findUser.js');

		async function getUserAssignment(project){
			return new Promise(async function(resolve,reject){
				console.log('getting users');
				try {
					console.log(`/projects/${project}/user_assignments`);
					people = await sendRequest("GET", {path: `/projects/${project}/user_assignments`});
					resolve(people.user_assignments);
				} catch (e) {
					console.error('failed get users:',e);
				}
			}).catch(function(reason){
				
			})
		}
	console.log(process.argv);
	const users_ids = process.argv[2].split(',');
	let projects,
		people;

	console.log('getting projects');
	try {
		projects = await getPages('projects');
	} catch (e) {
		console.error('failed get projects');
		process.exit(1);
	}

	
	console.log('identifying user(s) to remove');
	//userObjs = users.split(',');

	console.log('removing user from projects');
	console.time('projects');
	let promises = projects.map(function(project) {
		return new Promise(async function(resolve,reject){
			let users_assignment = await getUserAssignment(project.id),userObjs = [];
		if (project.is_active && project.name.indexOf('Services') == 0){
			console.log(`removing user from ${project.id}`);
			
				users_assignment.map(function(user){
					if(users_ids.indexOf(user.user.id.toString()) > -1){
						userObjs.push(user.id);
					}
				});
				let userPromises = userObjs.map(function(id) {
				return new Promise(async function(resolve,reject){
					await removeUser(project.id, id).then(function(){
						resolve();
					}).catch(function(e) {
						console.error(e);
						reject(e);
					});
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
			console.log('finsihed removing user');
		}
	).catch(function(e){
		console.log(`ERROR: projects promises failed ${e}`);
	});
}

init();
