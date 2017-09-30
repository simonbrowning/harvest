process.env.NODE_ENV = 'development';

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
	processTasks = require('../utils/processTasks.js');

function errorHandle(e) {
	console.log('caught rejection');
	console.log(e);
	return null;
}

(async function(args) {
	console.log(args.length);
	console.log(args);
	if (args.length < 3) {
		process.exit(1);
	}

	let client_object = JSON.parse(args[2]);
	console.log('getting clients');
	const clients = await sendRequest('GET', { path: '/clients' }).catch(
		errorHandle
	);
	console.log('getting projects');
	const projects = await sendRequest('GET', { path: '/projects' }).catch(
		errorHandle
	);
	console.log('seeing if client already exisits');
	let existing_client = findClient(client_object.account, clients);
	if (existing_client) {
		existing_client = existing_client.client;
		console.log('client exisits seeing if services projects exisits');
		let has_service_project = findProject(
			projects,
			existing_client.id,
			config.harvest.service_project
		);
		if (has_service_project) {
			has_service_project = has_service_project.project;
			console.log('has services project');
			let update_notes = false;
			let project = {};
			let hours = getProjectHours(has_service_project);

			//TODO:work out updating remaining hours
			if (hours.monthly_hours != parseInt(client_object.client_hours)) {
				hours.monthly_hours = parseInt(client_object.client_hours);
				project.estimate = hours.monthly_hours + client_object.client_bucket;
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
				(project.client_id = has_service_project.client_id),
					(project.notes = `client_hours:${hours.monthly_hours};client_bucket:${hours.client_bucket}`),
					await sendRequest('PUT', {
						path: `/projects/${has_service_project.id}`,
						body: {
							project: project
						}
					}).catch(errorHandle);
			}
		} else {
			console.log('no service project found');

			console.log('creating project object');
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
			await createServiceProject(new_project, services_project);
		}
	} else {
		console.log('create client');
		let new_client = await sendRequest('POST', {
			path: '/clients',
			body: { client: { name: client_object.account } }
		}).catch(errorHandle);

		existing_client = await sendRequest('GET', {
			path: `/clients/${new_client}`
		}).catch(errorHandle);
	}

	if (!client_object.deployment_project) {
		console.log('no deployment project sent');
	} else {
		let deployment_project = findProject(
			projects,
			existing_client.id,
			client_object.deployment_project
		);

		if (deployment_project) {
			console.log(
				`deployment_project "${client_object.deployment_project}" already exists for ${existing_client.name}`
			);
		} else {
			console.log(
				`${existing_client.name} create project called: "${client_object.deployment_project}"`
			);

			let data = await createProject({
				new_project: {
					name: client_object.deployment_project,
					active: true,
					client_id: existing_client.id
				}
			}).catch(errorHandle);

			console.log(`created ${data.new_pid}`);

			console.log('getting team');
			const people = await sendRequest('GET', { path: '/people' }).catch(
				errorHandle
			);
			if (!people) {
				console.error(`couldn't get team/people/users`);
			}

			//NB: not tested as need to add other users
			//Account Manager
			console.log('setting AM');
			let am = {};
			console.log(`Finding AM: ${client_object.account_manager}`);
			try {
				am.user = findUser(people, client_object.account_manager).user;
				console.log(
					`Found ${client_object.account_manager}, adding to ${data.new_pid}`
				);
				am.uid = await addUser(data.new_pid, am.user.id).catch(errorHandle);
				await setPM(data.new_pid, am.user.uid).catch(errorHandle);
			} catch (e) {
				console.log(
					`Can't find ${client_object.account_manager}, are they a valid user?`
				);
			}

			//TODO: try/catch for finding users
			// //Deployment Manager
			console.log('setting DM');
			let dm = {};
			if (client_object.account_manager !== client_object.deployment_manager) {
				try {
					console.log(`Finding DM: ${client_object.deployment_manager}`);
					dm.user = findUser(people, client_object.deployment_manager).user;
					console.log(`Found: ${client_object.deployment_manager}`);
					dm.uid = await addUser(data.new_pid, dm.id).catch(errorHandle);
					await setPM(data.new_pid, dm.uid).catch(errorHandle);
				} catch (e) {
					console.log(
						`Can't find ${client_object.deployment_manager}, are they a valid user?`
					);
				}
			}

			// //Deployment Enigneer
			if (client_object.deployment_engineer !== 'Partner/Agency') {
				console.log('setting DE');
				let de = {};
				try {
					console.log(`Finding DM: ${client_object.deployment_engineer}`);
					de.user = findUser(people, client_object.deployment_engineer).user;
					de.uid = await addUser(data.new_pid, de.id).catch(errorHandle);
				} catch (e) {
					console.log(
						`Can't find ${client_object.deployment_engineer}, are they a valid user?`
					);
				}
			} else {
				console.log(`Partner/Agency ignoring DE`);
			}

			if (client_object.type) {
				let tasks = await sendRequest('GET', { path: '/tasks' });
				if (tasks) {
					let filteredTasks;
					if (client_object.type === 'AudienceStream') {
						filteredTasks = findTasks(tasks, 'AS');
					} else {
						console.log('assume iQ');
						filteredTasks = findTasks(tasks, 'iQ');
					}
					await processTasks({ tasks: filteredTasks, new_pid: data.new_pid });
				}
			}
			//TODO: slack engineers to let them know that project have been added

			// console.log(
			// 	`new deployment_project "${client_object.deployment_project}" for ${existing_client.name}, ID: ${deployment_project}`
			// );
		}
	}
	console.log('exiting');
	process.exit(0);
})(process.argv);
