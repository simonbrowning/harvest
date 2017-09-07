console.log(process.env.NODE_ENV);

//Load dependies
const CronJob = require('cron').CronJob,
	_ = require('underscore'),
	moment = require('moment'),
	SimpleNodeLogger = require('simple-node-logger'),
	config = require('./config');

sendRequest = require('./actions/sendRequest');
loadFile = require('./actions/loadFile');
//END dependies

//Load File function

//START configuration

let oldClientList = loadFile('config/previousClients.js');

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

//Check to make sure new project doesn't exist
function checkForNewProject(projects, client_id, name) {
	log.info(client_id + ': Checking to see if project already exists');
	return _.find(projects, function(o) {
		return o.project.client_id === client_id && o.project.name === name;
	});
} //checkForNewProject

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
			log.info(clientId + ': Already has support project');
			resolve();
		} else {
			createProject(new_project, updated_services_project)
				.then(resolve)
				.catch(reject);
		}
	});
} //copyServicesProject

function processProjects(projects) {
	log.info('Projects in response: ' + projects.length);
	return new Promise(function(resolve, reject) {
		let promises = projects.map(function(obj) {
			return new Promise(function(resolve, reject) {
				let project = obj.project,
					pid,
					new_project = {},
					new_pid,
					exists;
				//Check if project has a date YYYY-MM at the end of the project and is active
				if (
					_.has(project, 'name') &&
					project.name.endsWith(last_month) &&
					project.active
				) {
					pid = project.id;
					log.info('Project to process: ' + pid);
					//Set new project name
					new_project.name =
						project.name.match(/(.+)\d{4}\-\d{2}$/)[1] +
						moment().format('YYYY-MM');
					exists = checkForNewProject(
						projects,
						project.client_id,
						new_project.name
					);
					if (exists) {
						log.info('New project already exists');
						resolve();
					} else {
						getHoursUsed(project).then(function(hours_used) {
							let excess_hours,
								remaining_hours,
								monthly_hours = parseInt(
									/client\_hours\:(\d+)/.test(project.notes)
										? project.notes.match(/client\_hours\:(\d+)/)[1]
										: '0'
								),
								client_bucket = parseInt(
									/client\_bucket\:(\d+)/.test(project.notes)
										? project.notes.match(/client\_bucket\:(\d+)/)[1]
										: '0'
								),
								remaining_bucket = /remaining\_bucket\:(\d+)/.test(
									project.notes
								)
									? parseInt(project.notes.match(/remaining\_bucket\:(\d+)/)[1])
									: null;

							if (hours_used > monthly_hours) {
								excess_hours = hours_used - monthly_hours;
								remaining_hours =
									(remaining_bucket || client_bucket) - excess_hours;
								remaining_bucket = remaining_hours < 0 ? 0 : remaining_hours;
							} else {
								remaining_bucket = remaining_bucket || client_bucket;
							}
							new_project.estimate = remaining_bucket + monthly_hours;
							new_project.notes = `client_hours:${monthly_hours};client_bucket:${client_bucket};remaining_bucket:${remaining_bucket}`;

							createProject(new_project, project)
								.then(resolve)
								.catch(reject);
						});
					}
				} else {
					resolve();
				}
			});
		}); //map

		Promise.all(promises)
			.then(resolve)
			.catch(reject);
	});
} //processProjects

//update stroed client list
function updateOldClients(data) {
	return new Promise(function(resolve, reject) {
		log.info('previousClients.js - writing new clients to file');
		fs.writeFile(
			'previousClients.js',
			JSON.stringify(oldClientList),
			'utf8',
			function(err) {
				if (err) {
					log.warn('previousClients.js - failed to update');
					reject('failed to write file');
				} else {
					log.info('previousClients.js - updated successfully');
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
				log.warn(`Something bad happend, ${err}`);
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
		log.info('Create new project');
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
					log.info('New project created: ', new_pid);
					log.info('Old project: ', project.id);
					resolve({
						new_pid: new_pid,
						old_pid: project.id
					});
				}
			})
			.catch(function(err) {
				log.warn('Create new project failed: ' + err);
			});
	});
} //createNewProject

function addUser(project, user, userObj) {
	log.info('User to add: ' + user.user.id);
	return new Promise(function(resolve, reject) {
		return sendRequest('POST', {
			path: '/projects/' + project + '/user_assignments',
			body: user
		})
			.then(function(response) {
				let id = response.headers.location.match(/\d+$/)[0];
				log.info('Returned user ID: ' + id);
				return updateUser(id, project, userObj).then(resolve);
			})
			.catch(function(err) {
				return reject('Added user: ' + err);
			});
	});
} //addUser

function updateUser(id, project, user) {
	log.info('User to Update: ', user.user_assignment.id);
	log.info(
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
			log.info('User updated: ' + id);
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
					log.info(
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
				log.info('Process task: ', task.task_assignment.task_id);
				addTask(
					data.new_pid,
					{
						task: {
							id: task.task_assignment.task_id
						}
					},
					task
				).then(function() {
					log.info(
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
	log.info('Update task: ' + tid);
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
				log.info('Task ' + tid + ' updated');
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
			log.info('Archiving: ' + data.old_pid);
			sendRequest('PUT', {
				path: '/projects/' + data.old_pid + '/toggle'
			}).then(function() {
				log.info('Successfully archived: ' + data.old_pid);
				return resolve(data);
			});
		} else {
			log.info('Skipping archive, support project');
			return resolve(data);
		}
	});
} //toggleOldProject

//Main function for clients
function proccessClients(clients) {
	return new Promise(function(resolve, reject) {
		log.info('Received clients, processing');
		if (
			!Array.isArray(oldClientList) ||
			(Array.isArray(oldClientList) && oldClientList.length == 0)
		) {
			log.info('No previous clients, first run');
			oldClientList = [];
		}
		activeClients = getActiveClients(clients);
		newClientIds = getNewClientIds(activeClients);
		oldClientList = clients;

		log.info('No. active clients: ' + activeClients.length);
		log.info('No. new clients: ' + newClientIds.length);

		if (newClientIds.length === 0) {
			resolve();
		} else {
			sendRequest('GET', { path: '/projects' }).then(function(
				returnedProjects
			) {
				projects = returnedProjects;
				findTemplateProject();
				log.info(
					`Number of new clients to assign support project to ${newClientIds.length}`
				);
				let promises = newClientIds.map(function(id) {
					return new Promise(function(resolve, reject) {
						copyServicesProject(id)
							.then(resolve)
							.catch(function(reason) {
								reject(reason);
							});
					});
				});
				Promise.all(promises)
					.then(function() {
						updateOldClients().then(resolve);
					})
					.catch(reject);
			}); //then
		}
	}); //Promise
} //proccessClients

//Get users for old project
function getUsers(data) {
	log.info('Fetch users');
	return new Promise(function(resolve, reject) {
		sendRequest('GET', {
			path: '/projects/' + data.old_pid + '/user_assignments'
		}).then(function(users) {
			log.info('Received users');
			data.users = users;
			resolve(data);
		});
	});
} //getUsers

//Get tasks for old project
function getTasks(data) {
	log.info('Fetch Tasks');
	return new Promise(function(resolve, reject) {
		sendRequest('GET', {
			path: '/projects/' + data.old_pid + '/task_assignments'
		}).then(function(tasks) {
			log.info('Received tasks');
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
}

//cron job for monthly roll over
log.info('Setup rollover cronjob');
const monthlyRolloverJob = new CronJob(
	'* * * 06 */1 *',
	function() {
		if (!rollover_is_running) {
			rollover_is_running = 1;
			log.info('Monthly rollover triggered');
			sendRequest('GET', { path: '/projects' })
				.then(processProjects)
				.then(function() {
					log.info('monthlyRolloverJob has finished');
					rollover_is_running = 0;
				})
				.catch(function(err) {
					log.warn('Something failed: ' + err);
					rollover_is_running = 0;
				});
		}
	},
	function() {
		/* This function is executed when the job stops */
		log.warn('monthlyRolloverJob stopped');
	},
	true /* Start the job right now */
);

//cron job for new client check every 5 minutes
// log.info('Setup client cronjob');
// const newClientCheckJob = new CronJob(
// 	'00 */3 * * * *',
// 	function() {
// 		log.info('Client cron job triggered');
// 		if (!client_is_running) {
// 			client_is_running = 1;
// 			sendRequest('GET', { path: '/clients' })
// 				.then(proccessClients)
// 				.then(function() {
// 					log.info('ClientJob has finished');
// 					client_is_running = 0;
// 				})
// 				.catch(function(err) {
// 					log.warn('Something failed: ' + err);
// 					client_is_running = 0;
// 				});
// 		}
// 	},
// 	function() {
// 		/* This function is executed when the job stops */
// 		log.warn('newClientCheckJob stopped');
// 	},
// 	true /* Start the job right now */
// );
