//Load dependies
const _ = require('underscore'),
	moment = require('moment'),
	SimpleNodeLogger = require('simple-node-logger'),
	config = require('./config');

sendRequest = require('./actions/sendRequest');
loadFile = require('./actions/loadFile');
//END dependies

//Load File function

//START configuration



const services_project_id = config.harvest.default_project,
	last_month = moment()
		.subtract(1, 'month')
		.format('YYYY-MM'),
	exclude_fields = [
		'active',
		'active_task_assignments_count',
		'active_user_assignments_count',
		'cache_version',
		'created_at',
		'earliest_record_at',
		'hint-earliest-record-at',
		'hint-latest-record-at',
		'id',
		'latest_record_at',
		'name',
		'updated_at',
		'notes'
	];
let service_project,
	projects,
	newClientIds,
	activeClients,
	clients,
	client_is_running = 0,
	rollover_is_running = 0;
//setup logging

const log = SimpleNodeLogger.createRollingFileLogger(config.logger);

//END configuration

//get active clients
function getActiveClients(clients) {
	let data = [];
	for (let i = 0; i < clients.length; i++) {
		if (clients[i].client.active === true) {
			data.push(clients[i]);
		}
	}
	return data;
}

//check clients
function getNewClientIds(newList) {
	//create array of all clientIDs from the returned list
	let currentClientIds = _.map(newList, function(content) {
		return content.client.id;
	});
	//create an array of clientIDs from the 'old' list
	let oldClientIds = _.map(oldClientList, function(content) {
		return content.client.id;
	});

	//retun the new clientIDs that are not present in the 'old list'
	return _.difference(currentClientIds, oldClientIds);
}


//find the support template object in returned project list
function findTemplateProject() {
	service_project = _.find(projects, function(obj) {
		if (obj.project.id === services_project_id) {
			return obj;
		}
	});
} //findTemplateProject

//copy support project template to new client
function copyServicesProject(clientId) {
	return new Promise(function(resolve, reject) {
		let updated_services_project = Object.assign({}, service_project.project);
		updated_services_project.client_id = clientId;
		const new_project = {};
		new_project.name =
			updated_services_project.name.match(/(.+)\d{4}\-\d{2}$/)[1] +
			moment().format('YYYY-MM');
		new_project.active = true;
		exists = checkForNewProject(projects, clientId, new_project.name);
		if (exists) {
			console.log(clientId + ': Already has support project');
			resolve();
		} else {
			createProject(new_project, updated_services_project)
				.then(resolve)
				.catch(reject);
		}
	});
} //copyServicesProject



//update stroed client list
function updateOldClients(data) {
	return new Promise(function(resolve, reject) {
		console.log('previousClients.js - writing new clients to file');
		fs.writeFile(
			'previousClients.js',
			JSON.stringify(oldClientList),
			'utf8',
			function(err) {
				if (err) {
					console.error('previousClients.js - failed to update');
					reject('failed to write file');
				} else {
					console.log('previousClients.js - updated successfully');
					resolve();
				}
			}
		);
	});
} //updateOldClients

//Different cron jobs merge
function createProject(new_project, old_project) {
	return new Promise(function(resolve, reject) {
		cloneProject(old_project, new_project);
		createNewProject(old_project, new_project)
			.then(getUsers)
			.then(processUsers)
			.then(getTasks)
			.then(proccessTasks)
			.then(toggleOldProject)
			.then(function() {
				resolve();
			})
			.catch(function(err) {
				console.error(`Something bad happend, ${err}`);
				reject();
			});
	});
}

//clone project
function cloneProject(old_project, new_project) {
	//Clone project
	_.each(old_project, function(value, key, list) {
		if (_.has(list, key) && !exclude_fields.includes(key)) {
			new_project[key] = value;
		}
	});
}

//Create new project
function createNewProject(project, new_project) {
	return new Promise(function(resolve, reject) {
		console.log('Create new project');
		sendRequest('POST', {
			path: '/projects',
			body: {
				project: new_project
			}
		})
			.then(function(response) {
				if (response.error) {
					reject(response.error);
				} else {
					let new_pid = response.headers.location.match(/\d+/)[0];
					console.log('New project created: ', new_pid);
					console.log('Old project: ', project.id);
					resolve({
						new_pid: new_pid,
						old_pid: project.id
					});
				}
			})
			.catch(function(err) {
				console.error('Create new project failed: ' + err);
			});
	});
} //createNewProject

function addUser(project, user, userObj) {
	console.log('User to add: ' + user.user.id);
	return new Promise(function(resolve, reject) {
		return sendRequest('POST', {
			path: '/projects/' + project + '/user_assignments',
			body: user
		})
			.then(function(response) {
				let id = response.headers.location.match(/\d+$/)[0];
				console.log('Returned user ID: ' + id);
				return updateUser(id, project, userObj).then(resolve);
			})
			.catch(function(err) {
				return reject('Added user: ' + err);
			});
	});
} //addUser

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

function proccessTasks(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.tasks.map(function(task) {
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
						'Task ' + task.task_assignment.task_id + ' added to ' + data.new_pid
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

function addTask(project, task, old_task) {
	return new Promise(function(resolve, reject) {
		return sendRequest('POST', {
			path: '/projects/' + project + '/task_assignments',
			body: task
		})
			.then(function(response) {
				let tid = response.headers.location.match(/\d+$/)[0];
				return updateNewTask(tid, old_task, project).then(function() {
					return resolve();
				});
			})
			.catch(function(err) {
				reject('Add task failed ' + old_task + ' : ' + err);
			});
	});
} //addTask

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

function toggleOldProject(data) {
	return new Promise(function(resolve, reject) {
		if (data.old_pid !== services_project_id) {
			console.log('Archiving: ' + data.old_pid);
			sendRequest('PUT', {
				path: '/projects/' + data.old_pid + '/toggle'
			}).then(function() {
				console.log('Successfully archived: ' + data.old_pid);
				return resolve(data);
			});
		} else {
			console.log('Skipping archive, support project');
			return resolve(data);
		}
	});
} //toggleOldProject


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

function getHoursUsed(project) {
	return new Promise(function(resolve, reject) {
		let start_date = moment()
				.subtract(1, 'month')
				.startOf('month')
				.format('YYYYMMDD'),
			end_date = moment()
				.subtract(1, 'month')
				.endOf('month')
				.format('YYYYMMDD');

		sendRequest('GET', {
			path: `/projects/${project.id}/entries?from=${start_date}&to=${end_date}`
		}).then(function(report) {
			sendRequest('GET', {
				path: `/projects/${project.id}/task_assignments`
			}).then(function(tasks) {
				// return resolve({ report: report, tasks: tasks });
				let hours_used = 0;
				_.each(report, function(entry) {
					let day = entry.day_entry;
					if (isBillableTask(day.task_id, tasks)) {
						hours_used += day.hours;
					}
				});
				return resolve(hours_used);
			});
		});
	});
}

function isBillableTask(id, tasks) {
	return _.find(tasks, function(obj) {
		let task = obj.task_assignment;
		if (task.task_id === id) {
			return task.billable;
		}
	});

module.exports = createProject;
