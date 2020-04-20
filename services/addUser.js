async function start() {
	const config = require('../config'),
		getPages = require('../actions/getPages'),
		addUser = require('../utils/addUser'),
		findUser = require('../utils/findUser');

	//read arguments

    const update = JSON.parse(process.argv[2]),
    user = update.user,
    project = update.project;
    

	console.log('user:', user);

	//load people
	let people, person;

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
	person = findUser(people, user);

	if (!!person.id) {
		console.log(`found Account Manager ${person.first_name} ${person.last_name}`);
	} else {
		console.error(`failed to find AM`);
		process.exit(1);
	}
    
    try{
        await addUser(project, person.id, true);
    }catch(e){
        console.warn('Something went wrong');
        console.log(e);
    }
    

}


start();
