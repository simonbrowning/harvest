process.env.NODE_ENV === 'dev';

var config = require('../config'),
	sendRequest = require('../actions/sendRequest'),
	getPages = require('../actions/getPages');

function callback(body) {
	console.log('Got projects now loop');
	//var projects = JSON.parse(body);
	body.forEach(function(project) {
		let PID = project.id;
		if (project.name == "Services - 2019-02" && project.is_active && PID == 19994449) {
            let notes = JSON.parse(project.notes);
            if (parseInt(notes.client_bucket) == 0) {
                console.log(`${PID} to be deleted.`);
                sendRequest("DELETE", { path: `/projects/${PID}/` })
                    .then(function() {
                        console.log(`${PID} deleted.`);
                    })
                    .catch(function(reason) {
                        console.log(`${PID} failed, ${reason}`);
                    });
            }
        }
	});
}
console.log(config.harvest.project_url);
console.log('Get Projects');
setTimeout(function() {
	getPages('projects')
		.then(callback)
		.catch(function(reason) {
			console.log(`Failed: ${reason}`);
		});
}, 1500);
