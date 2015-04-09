var logicalAddressSpace = 64, //KB
	physicalMemory = 16, //KB
	frameSize = 1, //KB
	pageReferences = [],
	pageFrameTable = new PageFrameTable(physicalMemory, frameSize),
	stats = {
		total: 0,
		faults: 0,
	},
	pageTables = {},
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

	var frag = pageFrameTable.PrintFrames();

	memDisplay.innerHTML = "";
	memDisplay.appendChild(frag);



	pageStatsDisplay.innerHTML = "";
	for (var s in pageTables) {
		if (pageTables.hasOwnProperty(s)) {
			pageTables[s].PrintPageTable();
		}
	}

}


function doNextPageRef() {

	var ref = pageReferences.shift();

	stats.total++;

	var pageTable = pageTables[ref.pid];

	//If page table does not exist, create one
	if (typeof pageTable === "undefined") {
		pageTable = pageTables[ref.pid] = new PageTable();
	}

	//Add page to page table if its not there
	pageTable.Add(ref.page);

	pageFrameTable.AccessPage(pageTable, ref);
}

function simStep() {

	if (pageReferences.length === 0) {
		console.log("Done.");
		return;
	}

	doNextPageRef();
	updatePage();
}



//Ref: pid, page
//Frame: ref, time
//PageTable: 


function PageFrameTable(memorySize, frameSize) {
	this.memorySize = memorySize;
	this.frameSize = frameSize;

	this.numFrames = this.memorySize / this.frameSize;

	//Frame: ref, time
	this.frames = [];
}

PageFrameTable.prototype.AccessPage = function(pageTable, ref) {
	
	//Check if page is in memory
	for (var i = 0; i < this.frames.length; i++) {
		var memRef = this.frames[i].ref;
		if (memRef.pid === ref.pid && memRef.page === ref.page) {

			//Update access time
			this.frames[i].time = Date.now();
			return;
		}
	}

	//Not in mem so find victim or empty spot
	var victim = this.getNextVictim();

	if (typeof this.frames[victim] !== "undefined") {
		var victimTable = pageTables[this.frames[victim].ref.pid];
		victimTable.pages[this.frames[victim].ref.page].frame = -1;
	}

	stats.faults++;
	pageTable.faults++;

	pageTable.pages[ref.page].frame = victim;

	this.frames[victim] = {ref: ref, time: Date.now()};

};

PageFrameTable.prototype.getNextVictim = function() {
	if (this.frames.length === 0 || this.numFrames < 2) {
		return 0;
	}

	var last = 0;

	for (var i = 1; i < this.numFrames; i++) {

		//If there is an empty frame return it
		if (typeof this.frames[i] === "undefined") {
			return i;
		}

		if (this.frames[i].time < this.frames[last].time) {
			last = i;
		}
	}

	return last;
};

PageFrameTable.prototype.PrintFrames = function() {
	var frag = document.createDocumentFragment(),
		i, div;

	for (i = 0; i < this.numFrames; i++) {
		div = document.createElement("div");

		if (typeof this.frames[i] !== "undefined") {
			div.innerHTML = this.frames[i].ref.pid + " - " + this.frames[i].ref.page;
		}
		else {
			div.innerHTML = "--";
		}
		frag.appendChild(div);
	}

	return frag;
};





function PageTable() {

	//Pages: page, frame
	this.pages = [];
	this.faults = 0;
}

PageTable.prototype.Add = function(page) {
	for (var i = 0; i < this.pages.length; i++) {
		if (this.pages[i].page === page) {
			return this.pages[i];
		}
	}
	this.pages.push({page: page, frame: -1});
};

PageTable.prototype.PrintPageTable = function() {
	
	var frag = document.createDocumentFragment();

	var table = document.createElement("div");
	table.className = "pageTable";

	for (var i = 0; i < this.pages.length; i++) {
		var div = document.createElement("div");

		div.innerHTML = "Page " + this.pages[i].page + " Frame " + this.pages[i].frame;
		table.appendChild(div);
	}

	frag.appendChild(table);

	pageStatsDisplay.appendChild(frag);
};