const config = require('../config');
const getPages = require("../actions/getPages.js");
let activeProjects = {};
let companies = {};

(async function () { 
console.log("getting projects...");
let projects = await getPages("projects");
let clients = await getPages("clients");

projects.forEach(project => {
	if (project.is_active && project.name.startsWith('Services')) {
		activeProjects[project.client.name] = [];
		activeProjects[project.client.name].push(project.id);
	}
});
	console.log(JSON.stringify(activeProjects));
// clients.forEach(client => {
// 	if (client.is_active) {
// 		companies[client.name] = [];
//         companies[client.name].push(client.id);
// 	}
// });

// for (const client in companies) {
// 	if (companies.hasOwnProperty(client)) {
// 		for (const project in activeProjects) {
// 			if (project == client) {
//                     delete companies[client];
//                 }
// 		}
// 	}
// }
//console.log(Object.keys(companies).join('|'));

}())