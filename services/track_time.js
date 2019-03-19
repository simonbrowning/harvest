process.env.log = "time";
process.env.process = process.pid;

const _ = require("underscore"),
    moment = require("moment"),
    sendRequest = require('../actions/sendRequest.js'),
    config = require('../config'),
    getPages = require('../actions/getPages'),
    findUser = require('../utils/findUser.js'),
    slack = require('../actions/slack.js'),
    log = require('../actions/logging.js');

moment.locale('en-gb');
const tasks = {
    billable: {
        iQ: 8086797,
        AudienceStream: 8086779,
        EventStream: 8609330,
        DataAccess: 8086798
    },
    nonbillable: {
        iQ: 8086791,
        AudienceStream: 8086788,
        EventStream: 8609332,
        DataAccess: 8086792
    }
};
function errorHandle(e) {
    log.warn(`caught rejection: ${e}`);
    return null;
}

async function start(args) {
    
    if (args.length < 3) {
        process.exit(1);
    }
    let project_update;
    let time_event = JSON.parse(args[2]);
    
    log.info(`${time_event.ticket_id}: started`);

    log.info(`${time_event.ticket_id}: getting projects`);
    try {
        projects = await getPages('projects');
    } catch (e) {
        log.warn(`${time_event.ticket_id}: failed getting projects`);
        process.exit(1);
    }
    project_update = _.find(projects, function (project) {
        if (project.is_active && project.client.name.toLowerCase() == time_event.company.toLowerCase() && project.name.indexOf("Services") == 0) {
            return project;
        }
    });

    if (!project_update) { 
        log.warn(`No project found for  ${time_event.company}`);
        process.stderr.write(`No project found`);
        log.close();
        process.exit(1);
    }
    log.info(`${time_event.ticket_id}: getting users`);
    try {
        people = await getPages('users');
    } catch (e) {
        log.warn(`${time_event.ticket_id}: failed get users`);
        log.close();
        process.exit(1);
    }

    log.info(`${time_event.ticket_id}: identifying user`);
    
    let agent = findUser(people, time_event.agent);
    
    let task_id = tasks[time_event.billable][time_event.product];
    
    if (!project_update || !agent || !task_id) {
        log.info(`${time_event.ticket_id}: missing parameters, bailing out`);
        log.info(`${time_event.ticket_id}: project:${time_event.company}, agent:${time_event.agent}, task: ${task_id}`);
        process.stderr.write("Missing Parameters");
        await slack({ channel: config.slack.channel }, `FAILED TO LOG TIME FOR:\n${JSON.stringify(time_event)}`);
        log.close();
        process.exit(1);
    } else { 
        log.info(`${time_event.ticket_id}: found project to log against: ${project_update.name}`);
        log.info(`${time_event.ticket_id}: user found, ${agent.first_name}`);
        log.info(`${time_event.ticket_id}: amount of time to record for ${time_event.company} against task ${task_id}; ${time_event.time_spent} hours`);
        log.info(`${time_event.ticket_id}: Send time entry`);
        
        sendRequest("POST", {
            path: "/time_entries",
            form: {
                user_id: agent.id,
                project_id: project_update.id,
                task_id: task_id,
                spent_date: moment().toISOString(),
                hours: parseFloat(time_event.time_spent),
                notes: `#${time_event.ticket_id}${time_event.note ? ': ' + timer.note : ''}`,
                spent_date: time_event.date,
                external_reference: {
                    id: time_event.ticket_id,
                    permalink: `https://support.tealiumiq.com/a/tickets/${
                        time_event.ticket_id
                        }`
                }
            }
        }).then(function (response) {
            process.stdout.write(response.id.toString());
            log.info(`${time_event.ticket_id}: Harvest Timer id: ${response.id}.`);
            log.info(`${time_event.ticket_id}: finished.`);
            log.close();
            process.exit(0);
        }).catch(async function (err) { 
            let response = JSON.parse(err)
            log.error(`${time_event.ticket_id}: failed to send time`);
            log.error(`${time_event.ticket_id}: ${response.message}`);
            process.stderr.write(response.message);
            await slack({ channel: config.slack.channel }, `FAILED TO LOG TIME FOR:\n${JSON.stringify(time_event)}`);
            
            log.close();
            process.exit(1);
        })
    }
}

start(process.argv);