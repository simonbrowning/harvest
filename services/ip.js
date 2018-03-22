const request = require("request");
const xml = require("xml-js");
const CronJob = require('cron').CronJob;



let currentIP = "";

const dns = new CronJob(
	'00 */20 * * * *',
	function() {
		request("https://api.ipify.org?format=json", function(error, response, body) {
  try {
    let ip = JSON.parse(body).ip;
    console.log(`IP: ${ip}`);
    if (/\d+\.\d+\.\d+\.\d+/.test(ip) && currentIP === ip) {
      console.log(`IP address not changed`);
    } else {
      currentIP = ip;
      request(
        `https://zonomi.com/app/dns/dyndns.jsp?action=SET&name=sathu.li&value=${ip}&type=A&api_key=79465433182435492048293076832047955356`,
        function(error, reponse, body) {
          //console.log(body);
          //let parsed = xml.parse(body);
          let parsedXML = xml.xml2json(body, { compact: true, spaces: 4 });
          let xmlObj = JSON.parse(parsedXML);
          let updates = xmlObj.dnsapi_result.result_counts._attributes;
          if(updates.unchanged){
              console.log(`IP Address unchanged`);
          }else if(updates.changed){
            console.log(`IP Address updated`);
          }
        }
      );
    }
  } catch (e) {
    console.error(`FAILED: ${e}`);
  }
});
	},
	function() {/* This function is executed when the job stops */},
	true /* Start the job right now */
);



