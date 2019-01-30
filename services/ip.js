const request = require("request");
const xml = require("xml-js");
const CronJob = require('cron').CronJob;


const hosts = "sathu.li,*.sathu.li,harvest.sathu.li,timeoff.sathu.li";
let currentIP = "";

function updateIP(){
  request("https://api.ipify.org?format=json", function(error, response, body) {
  try {
    let ip = JSON.parse(body).ip;
    console.log(`IP: ${ip}`);
    if (/\d+\.\d+\.\d+\.\d+/.test(ip) && currentIP === ip) {
      console.log(`IP address not changed`);
    } else {
      currentIP = ip;
      request(
        `https://zonomi.com/app/dns/dyndns.jsp?action=SET&name=${hosts}&value=${ip}&api_key=79465433182435492048293076832047955356`,
        function(error, reponse, body) {
          let parsedXML = xml.xml2json(body, { compact: true, spaces: 4 });
          let xmlObj = JSON.parse(parsedXML);
          let updates = xmlObj.dnsapi_result.result_counts._attributes;
          console.log(updates);
        }
      );
    }
  } catch (e) {
    console.error(`FAILED: ${e}`);
  }
});
}

const dns = new CronJob(
	'00 */20 * * * *',
	function() {
		updateIP();
    },
	function() {/* This function is executed when the job stops */},
	true /* Start the job right now */
);


updateIP();
