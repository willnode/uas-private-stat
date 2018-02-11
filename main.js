var date = (new Date().getFullYear() - 2010) * 12 + new Date().getMonth();
var canvas = document.getElementById('graph');
var usdfilter = /\$ ([\d\.-]+)/;
var data = {
	start: monthSerial(date - 12),
	end: monthSerial(date - 1),
	startRaw: () => unmonthSerial(data.start),
	endRaw: () => Math.max(data.startRaw(), unmonthSerial(data.end)),
	dateRange: Array(date + 1).fill().map((_, i) => monthSerial(i)).reverse(),
	pubId: localStorage['uas-priv-pubid'] || 0,
	pubIdHint: 'https://i.imgur.com/uBFYQMA.png',
	operation: 'downloads',
	operationChoices: ['downloads', 'sales'],
	property: 'qty',
	propertyChoices: ['qty', 'gross'],
	range: [],
	raw: [],
	parsed: [],
	idx: 0,
	showCodePanel: false,
	theJS: '',
	theData: '',
	theDataError: '',
	loadTheDataFromDisk: function () {
		data.theData = localStorage['uas-priv-data-' + data.operation];
		setTimeout(() => data.goStep2(), 0);
	},
	// Generate the JS
	goStep1: () => {
		var range = new Array(data.endRaw() - data.startRaw() + 1).fill().map((_, i) => monthSerial(i + data.startRaw()));
		data.theJS = makeTheJS(data.operation, data.pubId, data.range = range);
	},
	// Parse the data
	goStep2: () => {
		try {
			var sales = data.operation === 'sales';
			localStorage['uas-priv-pubid'] = data.pubId;
			localStorage['uas-priv-dates'] = JSON.stringify({ start: data.start, end: data.end });
			data.raw = JSON.parse(localStorage['uas-priv-data-' + data.operation] = data.theData);
			var parsed = [];
			var iter = 0;
			data.raw.forEach(el => {
				if (typeof el === 'object') {
					var aaData = el.aaData;
					var result = el.result;
					var snapst = el.snapshot;
					for (let i = 0; i < aaData.length; i++) {
						var name = aaData[i][0];
						var qty = parseFloat(sales ? aaData[i][2] : aaData[i][1]);
						var gross = sales ? parseFloat(aaData[i][5].match(usdfilter)[1]) : 0;
						var short = result[i]['short_url'];
						var obj = parsed.find((v, i, a) => v.short === short);
						if (!obj) parsed.push(obj = { name: name, short: short, stat: new Array(data.raw.length).fill(), total: { qty: 0, gross: 0 } });
						var st = {
							qty: qty,
							gross: gross,
						};
						obj.stat[iter] = combineStat(obj.stat[iter], st);
						obj.stat[iter].snapshot = snapst;
						obj.total = combineStat(obj.total, st);
					}
				}
				iter++;
			});
			data.theDataError = '';
			data.parsed = parsed;
			data.goStep3();
		} catch (e) {
			console.log(e);
			data.theDataError = e && e.message;
		}
	},
	// Graph the whole thing
	goStep3: () => {
		var buffer = [];

		data.parsed.forEach(el => {
			var stat2 = [];
			data.range.forEach(r => stat2.push(el.stat.find(v => v && v.snapshot === r) || null));

			buffer.push({
				label: el.name,
				backgroundColor: 'transparent',
				borderColor: serialColor(el.name),
				data: stat2.map(v => (v && v[data.property]) || 0),
			})
		})
		if (window.chart) window.chart.destroy();
		window.chart = new Chart(canvas.getContext("2d"), {
			type: 'line',
			data: {
				labels: data.range,
				datasets: buffer
			},
		})
	},
	copyTheJS: function () {
		var area = document.getElementById('theJS');
		area.select();
		area.focus();
		var ok = document.execCommand('copy');
		var btn = document.getElementById('copyTheJS-btn');
		btn.textContent = ok ? 'Copied!' : 'Press Ctrl + C';
		setTimeout(() => btn.textContent = 'Copy', 3000);
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
			}
		}
		data.loadTheDataFromDisk();
	}
})

function makeTheJS(operation, pubid, requests) {
	return `
(function () {
	var uri = '/api/publisher-info/${operation}/${pubid}/';
	var data = [];
	var requests = ${JSON.stringify(requests)};
	var finalmsg = "Requests done. Scroll down the page and hit Ctrl + C to copy the data";

	function DoRequest(i) {
		var req = requests[i];
		console.log("Requesting data at " + req);
		var xhr = new XMLHttpRequest();
		var url = uri + req + ".json";
		xhr.onreadystatechange = function () {
			if (this.readyState == 4) {
				if (this.status == 200)
					data.push(Object.assign(JSON.parse(this.responseText), {snapshot:req}));
				else
					data.push("⛔ " + this.status);

				if (i + 1 < requests.length)
					DoRequest(i + 1);
				else {
					var area = document.createElement("textarea");
					document.body.appendChild(area);
					area.value = JSON.stringify(data);
					area.style.width = '100%';
					area.style.height = '20%';
					area.select();
					area.focus();
					console.log(finalmsg);
				}
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
`.trim().replace(/\t/g, " ");
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

function combineStat(a, b) {
	if (!a) return b;
	if (!b) return a;
	return {
		qty: a.qty + b.qty,
		gross: a.gross + b.gross,
	}
}
