async function start() {
	const config = require('../config'),
		getPages = require('../actions/getPages'),
		sendRequest = require('../actions/sendRequest'),
		addUser = require('../utils/addUser'),
		setPM = require('../utils/setPM'),
		findUser = require('../utils/findUser');

	//read arguments

	const account_manager = process.argv[2],
		pathToFile = process.argv[3];

	console.log('account_manager:', account_manager);
	console.log('pathToFile:', pathToFile);

	//load people
	let people, am, projects, accountsToAdd;

	console.log(`getting users`);
	try {
		people = await getPages('users');
		console.log(`got users`);
	} catch (e) {
		console.error('failed get users');
		process.exit(1);
	}

	console.log(`now find account manager`);
	//find account manager
	am = findUser(people, account_manager);

	if (!!am.id) {
		console.log(`found Account Manager ${am.first_name} ${am.last_name}`);
	} else {
		console.error(`failed to find AM`);
		process.exit(1);
	}

	console.log(`getting all projects`);
	//load projects
	try {
		projects = await getPages('projects');
		console.log(`got projects`);
	} catch (e) {
		console.error('failed get projects');
		process.exit(1);
	}

	console.log(`read file`);
	try {
		accountsToAdd = await readFile(pathToFile);
		console.log(`accounts to add ${accountsToAdd.length}`);
	} catch (e) {
		console.error('failed read file');
		process.exit(1);
	}

	console.log(`loop accounts and projects`);
	//loop through accounts to add.
	accountsToAdd.forEach(function(account) {
		projects.forEach(async function(project) {
			if (account.toLowerCase() == project.client.name.toLowerCase()) {
				console.log(`add ${account_manager} to ${project.client.name} project ${project.id}`);
				let added_user = await addUser(project.id, am.id);

				console.log(`${project.id} now make them a Project Manager`);

				await setPM(project, added_user.id);

				if (project.name.startsWith('Services')) {
					console.log(`${project.id} update project notes`);

					try {
						let notes = JSON.parse(project.notes);
						notes.account_manager = `${am.first_name} ${am.last_name}`;
						await sendRequest('PATCH', {
							path: `/projects/${project.id}`,
							form: {
								notes: JSON.stringify(notes)
							}
						}).catch(function(err) {
							console.error(`${project.id} failed to update project notes`);
						});
					} catch (e) {
						console.error(`${project.id} failed to update notes on project: ${e}`);
					}
				}
			}
		});
	});
}

function readFile(file) {
	return new Promise(function(resolve, reject) {
		let fs = require('fs');
		fs.readFile(file, 'utf8', function(err, data) {
			if (err) {
				return reject(err);
			}
			data = data.split('\n');
			data.pop(data.length - 1);
			return resolve(data);
		});
	}).catch(function(reason) {
		reject(reason);
	});
}

start();
