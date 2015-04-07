var logicalAddressSpace = 64, //KB
	physicalMemory = 16, //KB
	frameSize = 1, //KB
	numFrames = physicalMemory / frameSize,
	pageReferences = [],
	mem = [],
	stats = {
		total: 0,
		replaced: 0,
	},
	total,
	hits,
	replacements,
	memDisplay;

function loader() {

	var input = document.getElementById("data").textContent.split("\n"),
		i;
	
	total = document.getElementById("total");
	hits = document.getElementById("hits");
	replacements = document.getElementById("replacements");
	memDisplay = document.getElementById("memDisplay");

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
	hits.innerHTML = "Hits: " + (stats.total - stats.replaced) || 0;
	replacements.innerHTML = "Replacements: " + stats.replaced;

	var frag = document.createDocumentFragment();

	for (var i = 0; i < numFrames; i++) {
		var div = document.createElement("div");

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

	if (pageReferences.length === 0) {
		console.log("Done.");
		return;
	}

	var ref = pageReferences.shift();

	stats.total++;

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

	if (typeof mem[victim] !== "undefined") {
		console.log("replaced " + victim);
		stats.replaced++;
	}

	mem[victim] = {ref: ref, time: Date.now()};
}

function simStep() {

	doNextPageRef();
	updatePage();
}