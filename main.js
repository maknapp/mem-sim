var logicalAddressSpace = 64, //KB
	physicalMemory = 16, //KB
	frameSize = 1, //KB
	numFrames = physicalMemory / frameSize,
	pageReferences = [],
	mem = [],
	stats = {
		total: 0,
		faults: 0,
	},
	pageStats = {},
	total,
	hits,
	faults,
	memDisplay,
	pageStatsDisplay;

function loader() {

	var input = document.getElementById("data").textContent.split("\n"),
		i;
	
	total = document.getElementById("total");
	hits = document.getElementById("hits");
	faults = document.getElementById("faults");
	memDisplay = document.getElementById("memDisplay");
	pageStatsDisplay = document.getElementById("pageStatsDisplay");

	for (i = 0; i < input.length; i++) {
		var parts = input[i].split(":");
		if (parts.length !== 2) {
			continue;
		}

		pageReferences.push({
			pid: parts[0].trim(),
			page: parseInt(parts[1].trim(), 2)
		});
	}

	updatePage();
}


function updatePage() {

	total.innerHTML = "Total: " + stats.total;
	hits.innerHTML = "Hits: " + (stats.total - stats.faults) || 0;
	faults.innerHTML = "Faults: " + stats.faults;

	var frag = document.createDocumentFragment(),
		i, div;

	for (i = 0; i < numFrames; i++) {
		div = document.createElement("div");

		if (typeof mem[i] !== "undefined") {
			div.innerHTML = mem[i].ref.pid + " - " + mem[i].ref.page;
		}
		else {
			div.innerHTML = "--";
		}
		frag.appendChild(div);
	}

	memDisplay.innerHTML = "";
	memDisplay.appendChild(frag);


	frag = document.createDocumentFragment();

	for (var s in pageStats) {
		if (pageStats.hasOwnProperty(s)) {

			var tr = document.createElement("tr"),
				inTable = [
					s,
					pageStats[s].total,
					pageStats[s].faults,
					pageStats[s].pages.length
				];

			for (i = 0; i < inTable.length; i++) {
				var td = document.createElement("td");
				td.innerHTML = inTable[i];
				tr.appendChild(td);
			}

			frag.appendChild(tr);
		}
	}

	pageStatsDisplay.innerHTML = "";
	pageStatsDisplay.appendChild(frag);
}

function getNextVictimIndex() {

	if (mem.length === 0 || numFrames < 2) {
		return 0;
	}

	var last = 0;

	for (var i = 1; i < numFrames; i++) {

		//If there is an empty frame return it
		if (typeof mem[i] === "undefined") {
			return i;
		}

		if (mem[i].time < mem[last].time) {
			last = i;
		}
	}

	return last;
}


function doNextPageRef() {

	var ref = pageReferences.shift();

	stats.total++;

	var pageStat = pageStats[ref.pid];

	if (typeof pageStat !== "undefined") {
		pageStat.total++;

		addUnique(pageStat.pages, ref.page);
	}
	else {
		pageStat = pageStats[ref.pid] = {
			total: 1,
			faults: 0,
			pages: [ref.page]
		};
	}

	//Check if page is in memory
	for (var i = 0; i < mem.length; i++) {
		var memRef = mem[i].ref;
		if (memRef.pid === ref.pid && memRef.page === ref.page) {
			console.log("Page in mem already.");
			mem[i].time = Date.now();
			return;
		}
	}

	//Not in mem so find victim or empty spot
	var victim = getNextVictimIndex();

	stats.faults++;
	pageStat.faults++;

	mem[victim] = {ref: ref, time: Date.now()};
}

function simStep() {

	if (pageReferences.length === 0) {
		console.log("Done.");
		return;
	}

	doNextPageRef();
	updatePage();
}


//Add number to array if its not there already
function addUnique(arr, num) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] === num) {
			return;
		}
	}
	arr.push(num);
}