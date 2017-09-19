process.env.NODE_ENV = 'development';

const _ = require('underscore'),
	config = require('../config');

const sendRequest = require('../actions/sendRequest.js'),
	createServiceProject = require('../actions/createServiceProject.js'),
	findClient = require('../utils/findClient.js'),
	findProject = require('../utils/findProject.js'),
	createProject = require('../utils/createProject.js'),
	getProjectHours = require('../utils/getProjectHours.js');




(async function(args) {
	if (args.length !== 3) {
		process.exit(1);
	}

	let client_object = JSON.parse(args[2]);

	console.log('getting clients');
	const clients = await sendRequest('GET', { path: '/clients' });
	console.log('getting projects');
	const projects = await sendRequest('GET', { path: '/projects' });
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

			console.log('has services project');
			let update_notes = false;
			let hours = getProjectHours(has_service_project);
			if(hours.monthly_hours != parseInt(client_object.client_hours)){
				hours.monthly_hours = parseInt(client_object.client_hours);
				update_notes = true;
			}
			if(hours.client_bucket != parseInt(client_object.client_bucket)){
			 hours.client_bucket = parseInt(client_object.client_bucket);
			 update_notes = true;
		 }
		 if(update_notes){
			 await sendRequest('PUT',{'path': `/projects/${has_service_project.id}`,
			 body{
				 'project':{
					 client_id: has_service_project,
					 notes: `client_hours:${hours.monthly_hours};client_bucket:${hours.client_bucket}`
				 }
			 }});
		 }

		} else {
			console.log('no project found');
			//TODO: module for cloning services project
			console.log('creating...');

			await createServiceProject(existing_client.id,client_object.client_hours,client_object.client_bucket);
			let services_project_id = await createProject({
				name: config.harvest.service_project,
				active: true,
				client_id: existing_client.id
			});

			console.log(`new project id ${services_project_id}`);
		}
	} else {
		console.log('create client');
		let new_client = await sendRequest('POST', {
			path: '/clients',
			body: { client: { name: client_object.account } }
		});

		existing_client = await sendRequest('GET', {
			path: `/client/${new_client}`
		});
	}

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

		deployment_project = await createProject({
			name: client_object.deployment_project,
			active: true,
			client_id: existing_client.id
		});

		//TODO: Assin AM, DM, DE (unless parnter) to new projects
		//TODO: Add tasks based on client_object.type
		//TODO: slack engineers to let them know that project have been added

		console.log(
			`new deployment_project "${client_object.deployment_project}" for ${existing_client.name}, ID: ${deployment_project}`
		);
	}
	console.log('exiting');
	process.exit(0);
})(process.argv);

// //copy support project template to new client
// function copyServicesProject(clientId) {
// 	return new Promise(function(resolve, reject) {
// 		let updated_services_project = Object.assign({}, service_project.project);
// 		updated_services_project.client_id = clientId;
// 		const new_project = {};
// 		new_project.name =
// 			updated_services_project.name.match(/(.+)\d{4}\-\d{2}$/)[1] +
// 			moment().format('YYYY-MM');
// 		new_project.active = true;
// 		exists = checkForNewProject(projects, clientId, new_project.name);
// 		if (exists) {
// 			console.log(clientId + ': Already has support project');
// 			resolve();
// 		} else {
// 			createProject(new_project, updated_services_project)
// 				.then(resolve)
// 				.catch(reject);
// 		}
// 	});
// } //copyServicesProject
//
