process.env.log = 'monthly';

const createServiceProject = require('../actions/createServiceProject.js'),
	getPreviousHours = require('../utils/getPreviousHours.js'),
	getPages = require('../actions/getPages.js'),
	_ = require('underscore'),
	moment = require('moment'),
	findProject = require('../utils/findProject'),
	findUser = require('../utils/findUser'),
	addUser = require('../utils/addUser'),
	setPM = require('../utils/setPM'),
	log = require('../actions/logging.js'),
	slack = require('../actions/slack.js'),
	cleanUp = require('../actions/checkupdate.js'),
	config = require('../config');

const last_month = moment()
	.subtract(1, 'months')
	.format('YYYY-MM');

function errorHandle(e) {
	log.warn(`caught rejection: ${e}`);
	return null;
}

function processProjects(projects) {
	log.info(`projects in response ${projects.length}`);
	return new Promise(function(resolve, reject) {
		let promises = projects.map(function(project) {
			return new Promise(function(resolve, reject) {
				//Check if project has a date YYYY-MM at the end of the project and is active
				//if (_.has(project, 'name') && project.name.endsWith(last_month) && project.is_active) {

				if (
					_.has(project, 'name') &&
					project.name == config.harvestv2.service_project + last_month &&
					project.is_active
				) {
					let pid = project.id,
						new_project = {},
						new_pid,
						exists,
						notes = JSON.parse(project.notes);

					log.info(`${project.client.name}: ${pid} project to process`);
					//Set new project name
					new_project.client_id = project.client.id;
					new_project.name = config.harvestv2.service_project + moment().format('YYYY-MM');
					exists = findProject(projects, project.client.id, new_project.name);
					if (exists) {
						log.info(`${project.client.name}: ${pid} new project already exists`);
						resolve();
					} else {
						log.info(`${project.client.name}: ${pid} getting hours`);
						getPreviousHours(project, 1, 1).then(function(hours_used) {
							log.info(`${project.client.name}: ${pid} updating hours for new project`);
							try {
								let excess_hours;
								let remaining_bucket = parseInt(notes.remaining_bucket) || 0,
									client_hours = parseInt(notes.client_hours),
									client_bucket = parseInt(notes.client_bucket);

								if (hours_used > client_hours) {
									excess_hours = hours_used - client_hours;
									remaining_hours = (remaining_bucket || client_bucket) - excess_hours;
									remaining_bucket = remaining_hours < 0 ? 0 : remaining_hours;
								} else {
									remaining_bucket = remaining_bucket || client_bucket;
								}
								new_project.estimate = parseInt(remaining_bucket + client_hours);
								log.info(`${project.client.name}: ${pid} new estimate ${new_project.estimate}`);
								new_project.budget = new_project.estimate;
								new_project.notes = JSON.stringify({
									client_hours: notes.client_hours,
									client_bucket: notes.client_bucket,
									remaining_bucket: remaining_bucket.toFixed(2),
									account_manager: notes.account_manager
								});
							} catch (e) {
								log.error(`${project.client.name}: ${pid} failed to update hours: ${e}`);
							}

							new_project.budget_by = 'project';
							new_project.billable = true;
							new_project.notify_when_over_budget = true;
							new_project.over_budget_notification_percentage = project.over_budget_notification_percentage;
							new_project.starts_on = moment()
								.startOf('month')
								.format();
							new_project.ends_on = moment()
								.endOf('month')
								.format();

							log.info(`${project.client.name}: ${pid} create new services project`);
							createServiceProject(new_project, project, project.client.name)
								.then(async function(project) {
									if (notes.account_manager !== null) {
										log.info(`${project.client.name}: ${project.id} make sure Account Manager is set`);
										let users = await getPages('users');
										let am = {};
										am.user = findUser(users, notes.account_manager);
										if (am.user) {
											am.uid = await addUser(project.id, am.user.id).catch(errorHandle);
											await setPM(project, am.uid.id).catch(errorHandle);
											log.info(`${project.client.name} ${project.name}:  added ${notes.account_manager}`);
										} else {
											log.error(
												`${project.client.name}: ${project.id} no Account Manager ${
													notes.account_manager
												} not found`
											);
										}
									} else {
										log.error(
											`${project.client.name}: ${project.id} no Account Manager ${
												notes.account_manager
											} not set`
										);
									}
									resolve();
								})
								.catch(reject);
						});
					}
				} else {
					resolve();
				}
			}).catch(function(reason) {
				log.error(`${project.client.name || 'not availabe'} something failed ${reason}`);
			});
		}); //map

		Promise.all(promises)
			.then(async function() {
				log.info('Starting CleanUp');
				await cleanUp();
				log.info('Finished CleanUp');
				log.close();
				return resolve();
			})
			.catch(reject);
	});
} //processProjects

getPages('projects')
	.then(processProjects)
	.then(function() {
		log.info('monthlyRolloverJob has finished');
		slack({ channel: config.slack.channel }, 'Monthly rollover has finished');
		return false;
	})
	.catch(function(err) {
		log.error('Something failed: ' + err);
	});
