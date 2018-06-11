process.env.log = 'client';
process.env.process = process.pid;

const _ = require('underscore'),
	config = require('../config'),
	moment = require('moment');

const sendRequest = require('../actions/sendRequest.js'),
	getPages = require('../actions/getPages.js'),
	createServiceProject = require('../actions/createServiceProject.js'),
	findClient = require('../utils/findClient.js'),
	findProject = require('../utils/findProject.js'),
	findUser = require('../utils/findUser.js'),
	findTasks = require('../utils/findTask.js'),
	cloneProject = require('../utils/cloneProject.js'),
	createProject = require('../utils/createProject.js'),
	getTasks = require('../utils/getTasksAssignment.js'),
	getUsers = require('../utils/getUserAssignment.js'),
	addUser = require('../utils/addUser.js'),
	addTask = require('../utils/addTask.js'),
	setPM = require('../utils/setPM.js'),
	processTasks = require('../utils/processTasks.js'),
	slack = require('../actions/slack.js'),
	log = require('../actions/logging.js'),
	toggle = require('../utils/toggleProject');

function errorHandle(e) {
	log.warn(`caught rejection: ${e}`);
	return null;
}

async function start(args) {
	if (args.length < 3) {
		process.exit(1);
	}

	let client_object = JSON.parse(args[2]);
	log.info(`${client_object.account}: getting clients`);
	const clients = await getPages('clients').catch(errorHandle);
	log.info(`${client_object.account}: getting projects`);
	const projects = await getPages('projects').catch(errorHandle);
	log.info(`${client_object.account}: getting users`);
	const users = await getPages('users').catch(errorHandle);

	let am = {};
	if (client_object.account_manager === client_object.deployment_manager || !client_object.account_manager) {
		am.user = null;
	} else {
		log.info(`${client_object.account}: finding Account Manager`);
		am.user = findUser(users, client_object.account_manager);
	}

	if (am.user) {
		log.info(`${client_object.account}: found ${client_object.account_manager}`);
	} else {
		log.error(`${client_object.account}: is ${client_object.account_manager} in Harvest?`);
		client_object.account_manager = null;
	}

	log.info(`${client_object.account}: seeing if client exists`);
	let client = findClient(client_object.account, clients);

	if (client) {
		log.info(`${client_object.account}: client already exists`);
	} else {
		log.info(`${client_object.account}: create client`);
		let new_client = await sendRequest('POST', {
			path: '/clients',
			form: { name: client_object.account }
		}).catch(errorHandle);

		if (!new_client) {
			log.error(`${client_object.account}: couldn't create client, exiting`);
			process.exit(1);
		} else {
			client = new_client;
		}
	}

	log.info(
		`${client_object.account}: Finding ${config.harvestv2.service_project + moment().format('YYYY-MM')}`
	);
	//Sort out services projects
	let service_project = findProject(
		projects,
		client.id,
		config.harvestv2.service_project + moment().format('YYYY-MM')
	);

	if (service_project && client_object.status === 'Active') {
		service_project = service_project;
		log.info(`${client_object.account}: has services project`);
		log.info(`${client_object.account}: checking hours`);
		let update_notes = false;
		let project = {};
		try {
			let hours = JSON.parse(service_project.notes);

			if (
				client_object.client_bucket &&
				parseInt(hours.client_bucket) != parseInt(client_object.client_bucket)
			) {
				hours.client_bucket = parseInt(client_object.client_bucket);

				update_notes = true;
			}

			if (parseInt(hours.client_hours) != parseInt(client_object.client_hours)) {
				hours.client_hours = parseInt(client_object.client_hours);
				update_notes = true;
			}
			if (update_notes) {
				project.estimate = parseInt(hours.client_hours) + parseInt(client_object.client_bucket);
				project.budget = project.estimate;
				log.info(`${client_object.account}: updating hours`);

				//project.client_id = service_project.client_id;
				project.notes = JSON.stringify({
					client_hours: hours.client_hours,
					client_bucket: hours.client_bucket,
					account_manager: client_object.account_manager
				});

				await sendRequest('PATCH', {
					path: `/projects/${service_project.id}`,
					form: project
				}).catch(errorHandle);

				log.info(`${client_object.account}: hours updated`);
				await slack({
					channel: '@' + client_object.account_manager.replace(' ', '.').toLowerCase(),
					client: client_object.account
				});
			} else {
				log.info(`${client_object.account}: hours are up to update`);
			}
		} catch (e) {
			log.error(`${client_object.account}: couldn't update hours`);
		}

		if (am.user) {
			log.info(`${client_object.account}: make sure ${client_object.account_manager} is assigned`);

			try {
				am.uid = await addUser(service_project.id, am.user.id).catch(errorHandle);
				await setPM(service_project, am.uid.id).catch(errorHandle);
				log.info(`${client_object.account} ${service_project.name}:  added ${client_object.account_manager}`);
			} catch (e) {
				log.error(
					`${client_object.account} ${service_project.name}:  failed to add ${
						client_object.account_manager
					}: ${e}`
				);
			}
		}
	} else if (service_project && client_object.status == 'Inactive') {
		log.info(`${client_object.account}: No longer active closing `);
		await toggle({ new_project: service_project, old_project: service_project });
	} else {
		log.info(`${client_object.account}: no services project found`);

		log.info(`${client_object.account}: create service project`);
		let new_project = {},
			services_project;

		services_project = findProject(
			projects,
			findClient('[TEMPLATES]', clients).id,
			config.harvest.service_project
		);

		cloneProject(services_project, new_project);

		new_project.name = config.harvestv2.service_project + moment().format('YYYY-MM');
		new_project.client_id = client.id;
		new_project.is_active = true;
		new_project.notes = JSON.stringify({
			client_hours: client_object.client_hours,
			client_bucket: client_object.client_bucket,
			account_manager: client_object.account_manager
		});
		new_project.estimate =
			parseInt(client_object.client_hours || '0') + parseInt(client_object.client_bucket || '0');
		new_project.budget = new_project.estimate;
		new_project.budget_by = 'project';
		new_project.billable = true;
		new_project.notify_when_over_budget = true;
		new_project.starts_on = moment()
			.startOf('month')
			.format();
		new_project.ends_on = moment()
			.endOf('month')
			.format();

		let client_services_project = await createServiceProject(
			new_project,
			services_project,
			client_object.account
		);
		if (am.user) {
			log.info(
				`${client_object.account}: ${client_services_project.id} add ${client_object.account_manager}`
			);
			try {
				log.info(client_services_project.id, am.user.id);
				am.uid = await addUser(client_services_project.id, am.user.id).catch(errorHandle);
				if (am.uid) {
					log.info(
						`${client_object.account} ${client_services_project.id}: added ${
							client_object.account_manager
						} now make them a PM`
					);
					await setPM(client_services_project, am.uid.id).catch(errorHandle);
				}
			} catch (e) {
				log.error(
					`${client_object.account}: ${client_services_project.id} failed to add ${
						client_object.account_manager
					}`
				);
			}
		}

		log.info(`${client_object.account} ${client_services_project.id}:  service project created`);
		if(client_object.account_manager && typeof client_object.account_manager === "string"){
			await slack(
				{
					channel: '@' + client_object.account_manager.replace(' ', '.').toLowerCase(),
					client: client_object.account
				},
				`${client_object.account} has been created in Harvest.`
			);
		}
	}

	//run through deployment project
	if (!client_object.deployment_project) {
		log.info(`${client_object.account}: no deployment project, account update only`);
	} else {
		log.info(`${client_object.account}: seeing if deployment project already exists`);
		let deployment_project = findProject(projects, client.id, client_object.deployment_project);

		if (deployment_project) {
			log.info(
				`${client_object.account}: deployment_project "${client_object.deployment_project}" already exists.`
			);
		} else {
			log.info(
				`${client_object.account}: create deployment project called: "${client_object.deployment_project}"`
			);

			let data = await createProject({
				new_project: {
					name: client_object.deployment_project,
					active: true,
					client_id: client.id,
					budget_by: 'project',
					estimate_by: 'project',
					billable: true,
					bill_by: 'People',
					notify_when_over_budget: true
				}
			}).catch(errorHandle);

			log.info(
				`${client_object.account}: ${data.new_project.name} - ${data.new_pid} created deployment project`
			);

			log.info(`${client_object.account}: ${data.new_pid} getting tasks`);
			if (client_object.type) {
				let tasks = await getPages('tasks');
				if (tasks) {
					log.info(
						`${client_object.account}: ${data.new_pid} filtering for deployment type ${client_object.type}`
					);
					let filteredTasks = [];
					if (client_object.type === 'AudienceStream') {
						log.info(`${client_object.account}: ${data.new_pid} AS deployment`);
						filteredTasks = findTasks(tasks, 'AS');
					} else if (client_object.type === 'Cloud Delivery' || client_object.type === 'EventStream') {
						log.info(`${client_object.account}: ${data.new_pid} ES deployment`);
						filteredTasks = findTasks(tasks, 'ES');
					} else if (client_object.type === 'Web') {
						log.info(`${client_object.account}: ${data.new_pid} iQ deployment`);
						filteredTasks = findTasks(tasks, 'iQ');
					} else if (/android|ios|mobile web|blackberry|windows/i.test(client_object.type)) {
						log.info(`${client_object.account}: ${data.new_pid} mobile deployment`);
						let iq_tasks = findTasks(tasks, 'iQ');
						let es_tasks = findTasks(tasks, 'ES');
						filteredTasks = iq_tasks.concat(es_tasks);
					}else if(client_object.type === 'DataAccess'){
						log.info(`${client_object.account}: ${data.new_pid} DA deployment`);
						filteredTasks = findTasks(tasks, 'DA');
					}

					if (filteredTasks.length > 0) {
						log.info(`${client_object.account}: ${data.new_pid} adding tasks`);

						await processTasks({
							old_project: { client_id: client_object.account },
							tasks: filteredTasks,
							new_pid: data.new_pid,
							new_project: data.new_project
						});
					} else {
						log.warn(`${client_object.account}: ${data.new_pid} no tasks added`);
					}
				}
			}

			log.info(`${client_object.account}: ${data.new_pid} adding users`);

			if (am.user) {
				log.info(`${client_object.account}: ${data.new_pid} add AM: ${client_object.account_manager}`);
				try {
					am.uid = await addUser(data.new_pid, am.user.id).catch(errorHandle);
					if (am.uid) {
						log.info(
							`${client_object.account}: ${data.new_pid} added ${
								client_object.account_manager
							} now make them a PM`
						);
						await setPM(data.new_project, am.uid.id).catch(errorHandle);
					}
				} catch (e) {
					log.error(
						`${client_object.account}: ${data.new_pid} failed to add ${client_object.account_manager}`
					);
				}

				log.info(`${client_object.account}: ${data.new_pid} slacking AM: ${client_object.account_manager}`);

				await slack({
					channel: '@' + client_object.account_manager.replace(' ', '.').toLowerCase(),
					client: client_object.account,
					project: client_object.deployment_project,
					pid: data.new_pid,
					role: 'Account Manager'
				}).catch(errorHandle);
			}

			// //Deployment Manager
			log.info(`${client_object.account}: ${data.new_pid} setting DM`);
			let dm = {};
			if (client_object.account_manager !== client_object.deployment_manager && client_object.territory) {
				try {
					dm.users = findUser(users, client_object.deployment_manager, [
						client_object.territory,
						'Project Management'
					]);
					await dm.users.forEach(async function(user) {
						try {
							log.info(
								`${client_object.account}: ${data.new_pid} found ${user.first_name} ${user.last_name}`
							);
							let uid = await addUser(data.new_pid, user.id).catch(errorHandle);
							log.info(
								`${client_object.account}: ${data.new_pid} setting as PM ${user.first_name} ${user.last_name}`
							);
							await setPM(data.new_project, uid.id).catch(errorHandle);
							log.info(
								`${client_object.account}: ${data.new_pid} slacking DM: ${user.first_name} ${user.last_name}`
							);
							await slack({
								channel: '@' + user.email.toLowerCase().match(/^(.+)\@/)[1],
								client: client_object.account,
								project: client_object.deployment_project,
								pid: data.new_pid,
								role: 'Deployment Manager'
							}).catch(errorHandle);
						} catch (e) {
							log.error(`failed to add DM: ${user.first_name} ${user.last_name} - ${e}`);
						}
					});
				} catch (e) {
					log.error(
						`${client_object.account}: ${data.new_pid} Can't find ${
							client_object.deployment_manager
						}, are they a valid user?`
					);
				}
			}

			//Deployment Enigneer
			if (client_object.deployment_engineer == 'Partner/Agency') {
				log.info(`${client_object.account}: ${data.new_pid} Partner/Agency set, ingoring`);
			} else {
				log.info(`${client_object.account}: ${data.new_pid} setting DE`);
				let de = {};
				try {
					de.user = findUser(users, client_object.deployment_engineer);
					log.info(`${client_object.account}: ${data.new_pid} found ${client_object.deployment_engineer}`);
					de.uid = await addUser(data.new_pid, de.user.id).catch(errorHandle);

					log.info(
						`${client_object.account}: ${data.new_pid} slacking DE: ${client_object.deployment_engineer}`
					);

					await slack({
						channel: '@' + client_object.deployment_engineer.replace(' ', '.').toLowerCase(),
						client: client_object.account,
						project: client_object.deployment_project,
						pid: data.new_pid,
						role: 'Deployment Engineer'
					}).catch(errorHandle);
				} catch (e) {
					log.error(
						`${client_object.account}: ${data.new_pid} Can't find ${
							client_object.deployment_engineer
						}, are they a valid user?`
					);
				}
			}
		}
	}
	log.info(`${client_object.account}: finished.`);
	log.close();
	process.exit(0);
}

start(process.argv);
