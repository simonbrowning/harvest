process.env.log = 'client';
process.env.process = process.pid;

const _ = require('underscore'),
	config = require('../config'),
	moment = require('moment');

const sendRequest = require('../actions/sendRequest.js'),
	createServiceProject = require('../actions/createServiceProject.js'),
	findClient = require('../utils/findClient.js'),
	findProject = require('../utils/findProject.js'),
	findUser = require('../utils/findUser.js'),
	findTasks = require('../utils/findTask.js'),
	getProjectHours = require('../utils/getProjectHours.js'),
	cloneProject = require('../utils/cloneProject.js'),
	createProject = require('../utils/createProject.js'),
	getTasks = require('../utils/getTasks'),
	addUser = require('../utils/addUser.js'),
	addTask = require('../utils/addTask.js'),
	setPM = require('../utils/setPM.js'),
	processTasks = require('../utils/processTasks.js'),
	slack = require('../actions/slack.js'),
	log = require('../actions/logging.js');

function errorHandle(e) {
	log.warn(`caught rejection: ${e}`);
	return null;
}

(async function(args) {
	if (args.length < 3) {
		process.exit(1);
	}

	let client_object = JSON.parse(args[2]);
	log.info(client_object.account + ': getting clients');
	const clients = await sendRequest('GET', { path: '/clients' }).catch(
		errorHandle
	);
	log.info(client_object.account + ': getting projects');
	const projects = await sendRequest('GET', { path: '/projects' }).catch(
		errorHandle
	);
	log.info(client_object.account + ': seeing if client already exists');
	let existing_client = findClient(client_object.account, clients);

	if (existing_client) {
		existing_client = existing_client.client;
		log.warn(client_object.account + ': client already exists');
	} else {
		log.info(client_object.account + ': create client');
		let new_client = await sendRequest('POST', {
			path: '/clients',
			body: { client: { name: client_object.account } }
		}).catch(errorHandle);

		existing_client = await sendRequest('GET', {
			path: `/clients/${new_client}`
		}).catch(errorHandle);
		if (!existing_client) {
			log.error(client_object.account + ": couldn't create client, exiting");
			process.exit(1);
		} else {
			existing_client = existing_client.client;
		}
	}
	//Sort out services projects
	let has_service_project = findProject(
		projects,
		existing_client.id,
		config.harvest.service_project
	);
	if (has_service_project) {
		has_service_project = has_service_project.project;
		log.info(client_object.account + ': has services project');
		log.info(client_object.account + ': checking hours');
		let update_notes = false;
		let project = {};
		let hours = getProjectHours(has_service_project);

		if (hours.monthly_hours != parseInt(client_object.client_hours)) {
			hours.monthly_hours = parseInt(client_object.client_hours);
			project.estimate =
				hours.monthly_hours + parseInt(client_object.client_bucket);
			project.budget = project.estimate;
			update_notes = true;
		}
		if (
			client_object.client_bucket &&
			hours.client_bucket != parseInt(client_object.client_bucket)
		) {
			hours.client_bucket = parseInt(client_object.client_bucket);
			update_notes = true;
		}
		if (update_notes) {
			log.info(client_object.account + ': updating hours.');
			(project.client_id = has_service_project.client_id),
				(project.notes = `client_hours:${hours.monthly_hours};client_bucket:${hours.client_bucket}`),
				await sendRequest('PUT', {
					path: `/projects/${has_service_project.id}`,
					body: {
						project: project
					}
				}).catch(errorHandle);
			log.info(client_object.account + ': hours updated.');
			await slack({
				channel:
					'@' + client_object.account_manager.replace(' ', '.').toLowerCase(),
				client: client_object.account
			});
		} else {
			log.info(client_object.account + ': hours are up to date.');
		}
	} else {
		log.info(client_object.account + ': no services project found.');

		log.info(client_object.account + ': create service project');
		let new_project = {},
			services_project;

		services_project = findProject(
			projects,
			findClient('[TEMPLATES]', clients).client.id,
			'Services '
		).project;
		cloneProject(services_project, new_project);

		new_project.name =
			services_project.name.match(/(.+)\d{4}\-\d{2}$/)[1] +
			moment().format('YYYY-MM');
		new_project.client_id = existing_client.id;
		new_project.active = true;
		new_project.notes = `client_hours:${client_object.client_hours ||
			0};client_bucket:${client_object.client_bucket || 0}`;
		new_project.estimate =
			parseInt(client_object.client_hours || '0') +
			parseInt(client_object.client_bucket || '0');
		new_project.budget = new_project.estimate;
		new_project.budget_by = 'project';
		new_project.billable = true;
		let client_services_project = await createServiceProject(
			new_project,
			services_project
		);
		log.info(
			`${client_object.account}: ${client_services_project} set PM ${client_object.account_manager}`
		);
		let team = await sendRequest('GET', { path: '/people' }).catch(errorHandle);
		let am = findUser(team, client_object.account_manager).user;

		let am_uid = await addUser(client_services_project, am.id).catch(
			errorHandle
		);
		log.info(
			`${client_object.account} ${client_services_project}:  added ${client_object.account_manager}`
		);
		log.info(am_uid);
		await setPM(existing_client.id, client_services_project, am_uid).catch(
			errorHandle
		);

		log.info(
			`${client_object.account} ${client_services_project}:  service project created`
		);
		await slack(
			{
				channel:
					'@' + client_object.account_manager.replace(' ', '.').toLowerCase(),
				client: client_object.account
			},
			`${client_object.account} has been created in Harvest.`
		);
	}

	//run through deployment project
	if (!client_object.deployment_project) {
		log.info(
			client_object.account + ' no deployment project, account update only'
		);
	} else {
		let deployment_project = findProject(
			projects,
			existing_client.id,
			client_object.deployment_project
		);

		if (deployment_project) {
			log.warn(
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
					client_id: existing_client.id,
					budget_by: 'project_cost',
					estimate_by: 'project_cost',
					billable: true,
					bill_by: 'People'
				}
			}).catch(errorHandle);

			log.info(
				`${client_object.account}: created deployment project ${data.new_pid}`
			);

			log.info(`${client_object.account}: ${data.new_pid} getting tasks`);
			if (client_object.type) {
				log.info('get tasks');
				let tasks = await sendRequest('GET', { path: '/tasks' });
				if (tasks) {
					let filteredTasks;
					if (client_object.type === 'AudienceStream') {
						log.info('AS deployment');
						filteredTasks = findTasks(tasks, 'AS');
					} else if (client_object.type === 'EventStream') {
						log.info('ES deployment');
						filteredTasks = findTasks(tasks, 'eventstream');
					} else {
						log.info('assume iQ');
						filteredTasks = findTasks(tasks, 'iQ');
					}
					log.info(`${client_object.account} - ${data.new_pid} adding tasks`);
					await processTasks({
						old_project: { client_id: client_object.account },
						tasks: filteredTasks,
						new_pid: data.new_pid
					});
				}
			}

			log.info(`${client_object.account}: ${data.new_pid} getting team`);
			const people = await sendRequest('GET', { path: '/people' }).catch(
				errorHandle
			);
			if (!people) {
				log.error(`couldn't get team/people/users`);
			}

			log.info(`${client_object.account}: ${data.new_pid} adding users`);
			//Account Manager
			log.info(`${client_object.account}: ${data.new_pid} setting AM`);
			let am = {};
			try {
				am.user = findUser(people, client_object.account_manager).user;
				log.info(
					`${client_object.account}: ${data.new_pid} found ${client_object.account_manager}`
				);
				am.uid = await addUser(data.new_pid, am.user.id).catch(errorHandle);
				log.info(
					`${client_object.account}: ${data.new_pid} setting as PM ${client_object.account_manager} ${am.uid}`
				);
				await setPM(data.new_project.client_id, data.new_pid, am.uid).catch(
					errorHandle
				);

				log.info(
					`${client_object.account}: ${data.new_pid} slacking AM: ${client_object.account_manager}`
				);

				await slack({
					channel:
						'@' + client_object.account_manager.replace(' ', '.').toLowerCase(),
					client: client_object.account,
					project: client_object.deployment_project,
					pid: data.new_pid,
					role: 'Account Manager'
				}).catch(errorHandle);
			} catch (e) {
				log.error(
					`${client_object.account}: ${data.new_pid} Can't find ${client_object.account_manager}, are they a valid user?`
				);
			}

			// //Deployment Manager
			log.info(`${client_object.account}: ${data.new_pid} setting DM`);
			let dm = {};
			if (client_object.account_manager !== client_object.deployment_manager) {
				try {
					dm.user = findUser(people, client_object.deployment_manager).user;
					log.info(
						`${client_object.account}: ${data.new_pid} found ${client_object.deployment_manager}`
					);
					dm.uid = await addUser(data.new_pid, dm.user.id).catch(errorHandle);
					log.info(
						`${client_object.account}: ${data.new_pid} setting as PM ${client_object.account_manager} ${dm.uid}`
					);
					await setPM(data.new_project.client_id, data.new_pid, dm.uid).catch(
						errorHandle
					);
					log.info(
						`${client_object.account}: ${data.new_pid} slacking DM: ${client_object.account_manager}`
					);
					await slack({
						channel:
							'@' +
							client_object.deployment_manager.replace(' ', '.').toLowerCase(),
						client: client_object.account,
						project: client_object.deployment_project,
						pid: data.new_pid,
						role: 'Deployment Manager'
					}).catch(errorHandle);
				} catch (e) {
					log.error(
						`${client_object.account}: ${data.new_pid} Can't find ${client_object.deployment_manager}, are they a valid user?`
					);
				}
			}

			//Deployment Enigneer
			if (client_object.deployment_engineer == 'Partner/Agency') {
				log.info(
					`${client_object.account}: ${data.new_pid} Partner/Agency set, ingoring`
				);
			} else {
				log.info(`${client_object.account}: ${data.new_pid} setting DE`);
				let de = {};
				try {
					de.user = findUser(people, client_object.deployment_engineer).user;
					log.info(
						`${client_object.account}: ${data.new_pid} found ${client_object.deployment_engineer}`
					);
					de.uid = await addUser(data.new_pid, de.user.id).catch(errorHandle);

					log.info(
						`${client_object.account}: ${data.new_pid} slacking DE: ${client_object.account_manager}`
					);

					await slack({
						channel:
							'@' +
							client_object.deployment_engineer.replace(' ', '.').toLowerCase(),
						client: client_object.account,
						project: client_object.deployment_project,
						pid: data.new_pid,
						role: 'Deployment Engineer'
					}).catch(errorHandle);
				} catch (e) {
					log.error(
						`${client_object.account}: ${data.new_pid} Can't find ${client_object.deployment_engineer}, are they a valid user?`
					);
				}
			}
		}
	}
	log.info(`${client_object.account}: finished.`);
	log.close();
	return false;
})(process.argv);
