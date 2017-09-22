//TODO: break out more modules
//Load dependies
const _ = require('underscore'),
	moment = require('moment'),
	SimpleNodeLogger = require('simple-node-logger'),
	config = require('../config');

sendRequest = require('../actions/sendRequest');
//END dependies

function errorHandle(e) {
	console.log('caught rejection');
	console.log(e);
	return null;
}

const services_project_id = config.harvest.default_project,
	last_month = moment()
		.subtract(1, 'month')
		.format('YYYY-MM');
//setup logging

// const log = SimpleNodeLogger.createRollingFileLogger(config.logger);

//END configuration

//copy support project template to new client
module.exports = function(clientId, old_project, client_hours, client_bucket) {
	return new Promise(async function(resolve, reject) {
		if (!old_project) {
			old_project = await sendRequest('GET', {
				path: `/projects/${config.harvest.default_project}`
			}).catch(errorHandle);
		}
		let old_project_tasks = await sendRequest('GET', {
			path: `/projects/${old_project.project.id}/task_assignments`
		}).catch(errorHandle);
		let old_project_users = await sendRequest('GET', {
			path: `/projects/${old_project.project.id}/user_assignments`
		}).catch(errorHandle);
		let new_project = require('../utils/cloneProject')(old_project.project, {});

		if (!old_project || !old_project_tasks || !old_project_users) {
			console.log('failed to orginal project details');
			process.exit(1);
		}
		new_project.name =
			updated_services_project.name.match(/(.+)\d{4}\-\d{2}$/)[1] +
			moment().format('YYYY-MM');
		new_project.client_id = clientId;
		new_project.active = true;
		new_project.notes = `client_hours:${client_hours};client_bucket:${client_hours}`;
		let pid = await require('../utils/createProject.js')(new_project).catch(
			errorHandle
		);
		if (!pid) {
			console.log('failed to create new project id');
			process.exit(1);
		}
		console.log(`New project ${pid} created`);
		//TODO: processUsers
		let process_users = await processUsers(pid, old_project_users).catch(
			errorHandle
		);
		//TODO: proccessTasks
		let process_tasks = await proccessTasks(pid, old_project_tasks).catch(
			errorHandle
		);
	});
}; //copyServicesProject

function updateUser(id, project, user) {
	console.log('User to Update: ', user.user_assignment.id);
	console.log(
		'User is Project Manager: ',
		user.user_assignment.is_project_manager ? 'true' : 'false'
	);
	return new Promise(function(resolve, reject) {
		sendRequest('PUT', {
			path: '/projects/' + project + '/user_assignments/' + id,
			body: {
				user_assignment: {
					is_project_manager: user.user_assignment.is_project_manager
				}
			}
		}).then(function() {
			console.log('User updated: ' + id);
			resolve();
		});
	});
} //updateUser

function processUsers(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.users.map(function(user) {
			return new Promise(function(resolve, reject) {
				addUser(
					data.new_pid,
					{ user: { id: user.user_assignment.user_id } },
					user
				).then(function() {
					console.log(
						'User ' + user.user_assignment.user_id + ' added to ' + data.new_pid
					);
					resolve();
				});
			});
		});

		Promise.all(promises)
			.then(function() {
				resolve(data);
			})
			.catch(function(reason) {
				reject(reason);
			});
	});
} //processUsers

function proccessTasks(pid, tasks) {
	return new Promise(function(resolve, reject) {
		let promises = tasks.map(function(task) {
			return new Promise(function(resolve, reject) {
				console.log('Process task: ', task.task_assignment.task_id);
				addTask(
					data.new_pid,
					{
						task: {
							id: task.task_assignment.task_id
						}
					},
					task
				).then(function() {
					console.log(
						'Task ' + task.task_assignment.task_id + ' added to ' + pid
					);
					resolve();
				});
			});
		});

		Promise.all(promises)
			.then(function() {
				resolve(data);
			})
			.catch(function(reason) {
				reject(reason);
			});
	});
} //proccessTasks

function updateNewTask(tid, task, project) {
	console.log('Update task: ' + tid);
	let task_update = {
		task_assignment: {
			budget: task.task_assignment.budet,
			estimate: task.task_assignment.estimate
		}
	};
	return new Promise(function(resolve, reject) {
		return sendRequest('PUT', {
			path: '/projects/' + project + '/task_assignments/' + tid,
			body: task_update
		})
			.then(function() {
				console.log('Task ' + tid + ' updated');
				return resolve();
			})
			.catch(function(err) {
				reject('Update task ' + tid + ' failed: ' + err);
			});
	});
} //updateNewTask

//Get users for old project
function getUsers(data) {
	console.log('Fetch users');
	return new Promise(function(resolve, reject) {
		sendRequest('GET', {
			path: '/projects/' + data.old_pid + '/user_assignments'
		}).then(function(users) {
			console.log('Received users');
			data.users = users;
			resolve(data);
		});
	});
} //getUsers

//Get tasks for old project
function getTasks(data) {
	console.log('Fetch Tasks');
	return new Promise(function(resolve, reject) {
		sendRequest('GET', {
			path: '/projects/' + data.old_pid + '/task_assignments'
		}).then(function(tasks) {
			console.log('Received tasks');
			data.tasks = tasks;
			resolve(data);
		});
	});
} //getTasks
