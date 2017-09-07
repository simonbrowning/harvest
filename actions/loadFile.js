const fs = require('fs');

const loadFile = function(fileName) {
	const fileCheck = fs.existsSync(fileName);
	if (fileCheck) {
		let data = fs.readFileSync(fileName, 'utf8');

		if (data.length !== 0) {
			console.log(`read file, ${fileName}`);
			return JSON.parse(data);
		} else {
			return null;
		}
	} else {
		console.log(`${fileName} does not exist`);
		return null;
	}
}; //loadFile

module.exports = loadFile;
