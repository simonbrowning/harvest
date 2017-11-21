const addUser = require('../utils/addUser');

async function start() {
	let user_assignment = await addUser(15512148, 1896536);
	console.log(user_assignment);
}

start();
