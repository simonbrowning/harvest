//TODO: Migrate client code out of app.js into here
const longComputation = () => {
	let sum = 0;
	for (let i = 0; i < 1e9; i++) {
		sum += i;
	}
	return sum;
};

process.on('message', msg => {
	const sum = longComputation();
	process.send('complete');
});
