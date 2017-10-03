const config = require('../config'),
	sendRequest = require('../actions/sendRequest'),
	getTasks = require('../utils/getTasks'),
	getUsers = require('../utils/getUsers'),
	processTasks = require('../utils/processTasks'),
	processUsers = require('../utils/processUsers');

function errorHandle(e) {
	console.log('caught rejection');
	console.log(e);
	return null;
}

async function callback(projects) {
	const support_tasks = await sendRequest('GET', {
		path: `/projects/${config.harvest.default_project}/task_assignments`
	});
	const support_users = await sendRequest('GET', {
		path: `/projects/${config.harvest.default_project}/user_assignments`
	});

	console.log(`support tasks: ${support_tasks.length}`);
	console.log(`support users: ${support_users.length}`);
	console.log('Got projects now loop');

	let promises = projects.map(function({ project }) {
		return new Promise(async function(resolve, reject) {
			if (project.active && /Services - 2017-10/i.test(project.name)) {
				// console.log(`checking ${project.id}`);
				try {
					let tasks = await sendRequest('GET', {
						path: `/projects/${project.id}/task_assignments`
					}).catch(errorHandle);
					let users = await sendRequest('GET', {
						path: `/projects/${project.id}/user_assignments`
					}).catch(errorHandle);

					//console.log(`${project.id} has ${tasks.length} tasks`);

					if (tasks.length < support_tasks.length) {
						console.log(`${project.id} has less tasks than Template`);
						await processTasks({
							new_pid: project.id,
							tasks: support_tasks
						}).catch(errorHandle);
					}

					//console.log(`${project.id} has ${users.length} users`);
					if (users.length < support_users.length) {
						console.log(`${project.id} has less users than Template`);
						await processUsers({
							new_pid: project.id,
							users: support_users
						}).catch(errorHandle);
					}

					resolve();
				} catch (e) {
					reject(e);
				}
			}
		});
	});

	Promise.all(promises)
		.then(function() {
			console.log('complete');
		})
		.catch(function(reason) {
			console.error(`failed - ${reason}`);
		});
}

console.log(config.harvest.project_url);
console.log('Get Projects');
sendRequest('GET', { path: '/projects' })
	.then(callback)
	.catch(function(reason) {
		console.log(`Failed: ${reason}`);
	});
