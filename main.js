var date = new Date();
var canvas = document.getElementById('graph').getContext("2d");
var usdfilter = /\$ ([\d\.])$/;
var data = {
	start: {
		y: date.getFullYear() - 1,
		m: date.getMonth()
	},
	end: {
		y: date.getFullYear(),
		m: date.getMonth()
	},
	yRange: Array(date.getFullYear() - 2010).fill().map((_, i) => i + 2010),
	mRange: Array(12).fill().map((_, i) => i + 1),
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
	// Generating the JS
	goStep1: () => {
		var range = []
		for (let y = data.start.y; y <= data.end.y; y++) {
			var ms = data.start.y === y ? data.start.m : 1;
			var me = data.end.y === y ? data.end.m : 12;
			for (let m = ms; y <= me; y++) {
				range.push(y + (m + "").padStart(2, "0"));
			}
		}
		data.theJS = makeTheJS(data.operation, data.pubId, data.range = range);
	},
	// Parsing the data
	goStep2: () => {
		var sales = data.operation === 'sales';
		localStorage['uas-priv-pubid'] = data.pubId;
		localStorage['uas-priv-dates'] = { start: data.start, end: data.end };
		data.raw = localStorage['uas-priv-data'] = JSON.parse(theData);
		var parsed = [];
		var iter = 0;
		data.raw.forEach(el => {
			if (typeof el === 'object') {
				var aaData = el.aaData;
				var result = el.result;
				for (let i = 0; i < aaData.length; i++) {
					var name = aaData[i][0];
					var qty = sales ? aaData[i][2] : aaData[i][1];
					var gross = sales ? parseFloat(aaData[i][1].match(usdfilter)[0]) : 0;
					var net = sales ? parseFloat(aaData[i][5].match(usdfilter)[0]) : 0;
					var short = result[i]['short_url'];
					var obj = parsed.find((v, i, a) => v.short === short);
					if (!obj) parsed.push(obj = { name: name, short: short, stat: new Array(data.raw.length), total: { qty: 0, gross: 0, net: 0 } });
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
		var parsed = data.parsed[data.idx];
		new Chart(canvas, {
			type: 'line', data: {
				label: '#',
				data: parsed.stat.map((v, i, a) => v.qty),
				borderWidth: 1
			}
		})

	}
}

new Vue({
	el: '#app',
	data: data,
	mounted: () => {
		var dates = localStorage['uas-priv-dates'];
		if (dates) {
			data.start = dates.start;
			data.end = dates.end;
			if (data.pubId > 0) {
				data.goStep1();
				if (data.theData)
					data.goStep2();
			}
		}
	}
})

function makeTheJS(operation, pubid, requests) {
	return `
(function () {
	var url = '/api/publisher-info/${operation}/${pubid}/';
	var data = [];
	var requests = ${JSON.stringify(requests)};
	var finalmsg = "Requests done. Please copy this data and proceed to next step.";

	function DoRequest(i) {
		console.log("Requesting data at " + requests[i]);
		var xhr = new XMLHttpRequest();
		var url = url + requests[i] + ".json";
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
`
}