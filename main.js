var date = (new Date().getFullYear() - 2010) * 12 + new Date().getMonth();
var canvas = document.getElementById('graph');
var usdfilter = /\$ ([\d\.])$/;
var data = {
	start: monthSerial(date - 11),
	end: monthSerial(date),
	startRaw: () => unmonthSerial(data.start),
	endRaw: () => unmonthSerial(data.end),
	dateRange: Array(date + 1).fill().map((_, i) => monthSerial(i)).reverse(),
	pubId: localStorage['uas-priv-pubid'] || 0,
	pubIdHint: 'https://i.imgur.com/uBFYQMA.png',
	operation: 'downloads',
	operationChoices: ['downloads', 'sales'],
	range: [],
	raw: [],
	parsed: [],
	idx: 0,
	theJS: '',
	theData: localStorage['uas-priv-data'] || '',
	// Generate the JS
	goStep1: () => {
		var range = new Array(data.endRaw() - data.startRaw() + 1).fill().map((_, i) => monthSerial(i + data.startRaw()));
		data.theJS = makeTheJS(data.operation, data.pubId, data.range = range);
	},
	// Parse the data
	goStep2: () => {
		var sales = data.operation === 'sales';
		localStorage['uas-priv-pubid'] = data.pubId;
		localStorage['uas-priv-dates'] = JSON.stringify({ start: data.start, end: data.end });
		data.raw = JSON.parse(localStorage['uas-priv-data'] = data.theData);
		var parsed = [];
		var iter = 0;
		data.raw.forEach(el => {
			if (typeof el === 'object') {
				var aaData = el.aaData;
				var result = el.result;
				for (let i = 0; i < aaData.length; i++) {
					var name = aaData[i][0];
					var qty = parseFloat(sales ? aaData[i][2] : aaData[i][1]);
					var gross = sales ? parseFloat(aaData[i][1].match(usdfilter)[0]) : 0;
					var net = sales ? parseFloat(aaData[i][5].match(usdfilter)[0]) : 0;
					var short = result[i]['short_url'];
					var obj = parsed.find((v, i, a) => v.short === short);
					if (!obj) parsed.push(obj = { name: name, short: short, stat: new Array(data.raw.length).fill(), total: { qty: 0, gross: 0, net: 0 } });
					obj.stat[iter] = {
						qty: qty,
						gross: gross,
						net: net,
					};
					obj.total.qty += qty;
					obj.total.gross += gross;
					obj.total.net += net;
				}
			}
			iter++;
		});

		data.parsed = parsed;
	},
	// Graph the whole thing
	goStep3: () => {
		var buffer = [];

		data.parsed.forEach(el => {
			buffer.push({
				label: el.name,
				backgroundColor: 'transparent',
				borderColor: serialColor(el.short),
				data: el.stat.map((v, i) => (v && v.qty) || 0),
			})
		})
		console.log(buffer.length);
		window.chart = new Chart(canvas.getContext("2d"), {
			type: 'line',
			data: {
				labels: data.range,
				datasets: buffer
			},
		})

	}
}

new Vue({
	el: '#app',
	data: data,
	mounted: () => {
		var dates = localStorage['uas-priv-dates'];
		if (dates) {
			dates = JSON.parse(dates);
			data.start = dates.start;
			data.end = dates.end;
			if (data.pubId > 0) {
				data.goStep1();
				if (data.theData) {
					data.goStep2();
					data.goStep3();
				}
			}
		}
	}
})

function makeTheJS(operation, pubid, requests) {
	return `
(function () {
	var uri = '/api/publisher-info/${operation}/${pubid}/';
	var data = [];
	var requests = ${JSON.stringify(requests)};
	var finalmsg = "Requests done. Please copy this data and proceed to next step.";

	function DoRequest(i) {
		console.log("Requesting data at " + requests[i]);
		var xhr = new XMLHttpRequest();
		var url = uri + requests[i] + ".json";
		xhr.onreadystatechange = function () {
			if (this.readyState == 4) {
				if (this.status == 200)
					data.push(JSON.parse(this.responseText));
				else
					data.push("⛔ " + this.status);

				if (i + 1 < requests.length)
					DoRequest(i + 1);
				else
					prompt(finalmsg, JSON.stringify(data));
			}
		};
		xhr.open("GET", url, true);
		xhr.timeout = 60000;
		xhr.setRequestHeader("accept", "application/json")
		xhr.send();
	}
	setTimeout(() => DoRequest(0), 0);
	return "Wait a minute while we doing " + requests.length + " requests";
})();
`.replace(/\t/g, " ");
}

function monthSerial(number) {
	// number is month counting from from Jan 2010 (zero)
	return (2010 + Math.trunc(number / 12)) + (number % 12 + 1).toString().padStart(2, "0");
}

function unmonthSerial(str) {
	str = str || "201701";
	return (parseInt(str.substring(0, 4)) - 2010) * 12 + parseInt(str.substring(4, 6)) - 1;
}

function serialColor(str) {
	// https://stackoverflow.com/a/16348977/3908409
	var hash = 0;
	for (var i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	var colour = '#';
	for (var i = 0; i < 3; i++) {
		var value = (hash >> (i * 8)) & 0xFF;
		colour += ('00' + value.toString(16)).substr(-2);
	}
	return colour;
}
