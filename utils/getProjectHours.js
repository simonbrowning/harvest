module.exports = function(project) {
	let data = {};
	(data.monthly_hours = parseInt(
		/client\_hours\:(\d+)/.test(project.notes)
			? project.notes.match(/client\_hours\:(\d+)/)[1]
			: '0'
	)),
		(data.client_bucket = parseInt(
			/client\_bucket\:(\d+)/.test(project.notes)
				? project.notes.match(/client\_bucket\:(\d+)/)[1]
				: '0'
		)),
		(data.remaining_bucket = /remaining\_bucket\:(\d+)/.test(project.notes)
			? parseInt(project.notes.match(/remaining\_bucket\:(\d+)/)[1])
			: null);
	return data;
};
