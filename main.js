var logicalAddressSpace = 64, //KB
	physicalMemory = 16, //KB
	frameSize = 1, //KB
	pageReferences = [],
	pageFrameTable = new PageFrameTable(physicalMemory, frameSize),
	stats = {
		total: 0,
		faults: 0,
	},
	lastReferencedPage,
	lastVictimPage,
	pageTables = {},
	total,
	hits,
	faults,
	memDisplay,
	pageTableDisplay,
	intRef = 0,
	playbtn,
	stepbtn,
	nextfaultbtn;

//Runs on page load to set up variables
function loader() {
	total = document.getElementById("total");
	hits = document.getElementById("hits");
	faults = document.getElementById("faults");
	memDisplay = document.getElementById("memDisplay");
	pageTableDisplay = document.getElementById("pageTableDisplay");
	playbtn = document.getElementById("playbtn");
	stepbtn = document.getElementById("stepbtn");
	nextfaultbtn = document.getElementById("nextfaultbtn");

	//Load input and parse into structure
	var input = document.getElementById("data").textContent.split("\n");
	
	for (var i = 0; i < input.length; i++) {
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

//Updates global stats and runs all print functions
function updatePage() {

	//Update global stats
	total.innerHTML = "Total: " + stats.total;
	hits.innerHTML = "Hits: " + (stats.total - stats.faults) || 0;
	faults.innerHTML = "Faults: " + stats.faults;

	//Update page frame table
	var frag = pageFrameTable.PrintFrames();
	memDisplay.innerHTML = "";
	memDisplay.appendChild(frag);

	//Update page tables of every process
	pageTableDisplay.innerHTML = "";
	for (var s in pageTables) {
		if (pageTables.hasOwnProperty(s)) {
			frag = pageTables[s].PrintPageTable();
			pageTableDisplay.appendChild(frag);
		}
	}
}

//Processes next page reference from the input
function doNextPageRef() {
	currentRef = pageReferences.shift();

	stats.total++;

	var pageTable = pageTables[currentRef.pid];

	//If page table does not exist, create one
	if (typeof pageTable === "undefined") {
		pageTable = pageTables[currentRef.pid] = new PageTable(currentRef.pid);
	}

	//Add page to page table if its not there
	pageTable.Add(currentRef.page);

	//Tell frame table to access the referenced page
	var isFault = pageFrameTable.AccessPage(pageTable, currentRef.page);

	if (isFault) {
		stats.faults++;
	}
}

//Runs through the next reference and updates the display
//noUpdate is optional - if true it will not update the display
function simStep(noUpdate) {
	if (pageReferences.length === 0) {
		simStop();
		playbtn.disabled = true;
		stepbtn.disabled = true;
		nextfaultbtn.disabled = true;
		return;
	}

	doNextPageRef();

	if (typeof noUpdate === "undefined" || !noUpdate) {
		updatePage();
	}
}

//Runs through entire simulatation (unless stopped)
function simPlay() {
	playbtn.onclick = simStop;
	playbtn.innerHTML = "Stop";
	stepbtn.disabled = true;
	nextfaultbtn.disabled = true;

	clearInterval(intRef);
	intRef = setInterval(function() {
		simStep();
	}, 50);
}

//Stops a running simulation
function simStop() {
	clearInterval(intRef);
	playbtn.onclick = simPlay;
	playbtn.innerHTML = "Play";
	stepbtn.disabled = false;
	nextfaultbtn.disabled = false;
}

//Runs through simulation until a fault is reached or simulation is over
function simRunToNextFault() {
	playbtn.disabled = true;
	stepbtn.disabled = true;
	nextfaultbtn.disabled = true;
	
	var currentFaultCount = stats.faults;

	while (stats.faults <= currentFaultCount && pageReferences.length > 0) {
		simStep(true);
	}

	updatePage();

	if (pageReferences.length > 0) {
		playbtn.disabled = false;
		stepbtn.disabled = false;
		nextfaultbtn.disabled = false;
	}
}



//Object to handle the page frame table
function PageFrameTable(memorySize, frameSize) {
	this.memorySize = memorySize;
	this.frameSize = frameSize;

	this.numFrames = this.memorySize / this.frameSize;

	this.padding = "0";
	this.padlength = (this.numFrames+"").length;

	for (var i = 1; i < this.padlength; i++) {
		this.padding += this.padding[0];
	}

	this.frames = [];

	this.clock = 0;
}

//Simulates a page access - returns true if there is a page fault
PageFrameTable.prototype.AccessPage = function(pageTable, pageNum) {

	//Update page table access stat
	pageTable.references++;

	//Set last referenced page
	lastReferencedPage = pageTable.pages[pageNum];
	
	//If the page is in the page frame table just update the time
	if (typeof lastReferencedPage.frame !== "undefined" && lastReferencedPage.frame >= 0) {
		this.frames[lastReferencedPage.frame].time = this.clock++;
		return;
	}

	//Not in page table so find victim or empty spot
	var victim = this.getNextVictim();

	//If there is a victim, tell the victim page it is not in a frame
	// and set it as last victim
	if (typeof this.frames[victim] !== "undefined") {
		var victimPage = this.frames[victim].page;
		lastVictimPage = pageTables[victimPage.pid].pages[victimPage.number];
		lastVictimPage.frame = -1;
	}

	pageTable.faults++;

	//Tell the referenced page which frame it is in now
	lastReferencedPage.frame = victim;

	//Put the reference in the frame table with the current time
	this.frames[victim] = {page: lastReferencedPage, time: this.clock++};

	return true;
};

//Returns the index to the next vicitim or empty space in the frame table
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

//Returns a document fragment with the current frame table info
PageFrameTable.prototype.PrintFrames = function() {
	var frag = document.createDocumentFragment();

	for (var i = 0; i < this.numFrames; i++) {
		var div = document.createElement("div");

		div.innerHTML = "[" + (this.padding + i).slice(this.padlength * -1) + "] ";

		if (typeof this.frames[i] !== "undefined") {
			div.innerHTML += this.frames[i].page.pid + " - " + this.frames[i].page.number;

			if (i === lastReferencedPage.frame) {
				div.className = "lastReferenced";
			}
		}

		frag.appendChild(div);
	}

	return frag;
};

//Object to handle page tables
function PageTable(pid) {
	this.pages = [];
	this.faults = 0;
	this.references = 0;
	this.pid = pid;
}

//Adds page to the table if it is not there already
PageTable.prototype.Add = function(pageNum) {
	if (typeof this.pages[pageNum] !== "undefined") {
		return;
	}
	this.pages[pageNum] = {number: pageNum, frame: -1, pid: this.pid};
};

//Returns a document fragment with the current page table info
PageTable.prototype.PrintPageTable = function() {	
	var frag = document.createDocumentFragment(),
		table = document.createElement("div"),
		title = document.createElement("div"),
		div, frame;

	table.className = "pageTable";

	title.className = "pageTitle";
	title.innerHTML = this.pid;
	table.appendChild(title);

	for (var i = 0; i < this.pages.length; i++) {

		if (typeof this.pages[i] === "undefined") {
			continue;
		}

		div = document.createElement("div");
		div.className = "page";
		frame = this.pages[i].frame;

		if (this.pages[i] === lastReferencedPage) {
			div.className += " lastReferenced";
		}
		else if (this.pages[i] === lastVictimPage) {
			div.className += " lastVictim";
		}

		div.innerHTML = this.pages[i].number;

		if (frame !== -1) {
			var frameLink = document.createElement("span");
			frameLink.className = "frameLink";
			frameLink.innerHTML = this.pages[i].frame;
			div.appendChild(frameLink);
		}

		table.appendChild(div);
	}

	div = document.createElement("div");
	div.className = "pageTableStats";
	div.innerHTML = "Size: " + this.pages.length + "<br />Faults: " + this.faults + "<br /> References: " + this.references;
	table.appendChild(div);

	frag.appendChild(table);

	return frag;
};