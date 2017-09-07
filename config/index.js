if (process.env.NODE_ENV === 'production') {
	//send production keys
	module.exports = require('./prod');
} else {
	//send back dev keys
	module.exports = require('./dev');
}
