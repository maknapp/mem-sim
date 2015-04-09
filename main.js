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
	pageStatsDisplay,
	intRef = 0,
	playbtn,
	stepbtn,
	nextfaultbtn;


function loader() {

	var input = document.getElementById("data").textContent.split("\n"),
		i;
	
	total = document.getElementById("total");
	hits = document.getElementById("hits");
	faults = document.getElementById("faults");
	memDisplay = document.getElementById("memDisplay");
	pageStatsDisplay = document.getElementById("pageStatsDisplay");

	playbtn = document.getElementById("playbtn");
	stepbtn = document.getElementById("stepbtn");
	nextfaultbtn = document.getElementById("nextfaultbtn");

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
			frag = pageTables[s].PrintPageTable();
			pageStatsDisplay.appendChild(frag);
		}
	}

}


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

	pageFrameTable.AccessPage(pageTable, currentRef);
}

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

function simStop() {

	clearInterval(intRef);
	playbtn.onclick = simPlay;
	playbtn.innerHTML = "Play";
	stepbtn.disabled = false;
	nextfaultbtn.disabled = false;
}

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



//Ref: pid, page
//Frame: ref, time
//PageTable: 


function PageFrameTable(memorySize, frameSize) {
	this.memorySize = memorySize;
	this.frameSize = frameSize;

	this.numFrames = this.memorySize / this.frameSize;

	this.padding = "0";
	this.padlength = (this.numFrames+"").length;

	for (var i = 1; i < this.padlength; i++) {
		this.padding += this.padding[0];
	}

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
		lastVictimPage = victimTable.pages[this.frames[victim].ref.page];
		lastVictimPage.frame = -1;
	}

	stats.faults++;
	pageTable.faults++;

	lastReferencedPage = pageTable.pages[ref.page];
	lastReferencedPage.frame = victim;

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

		div.innerHTML = "[" + (this.padding + i).slice(this.padlength * -1) + "] ";

		if (typeof this.frames[i] !== "undefined") {
			div.innerHTML += this.frames[i].ref.pid + " - " + this.frames[i].ref.page;
		}

		frag.appendChild(div);
	}

	return frag;
};





function PageTable(pid) {

	//Pages: page, frame
	this.pages = [];
	this.faults = 0;
	this.pid = pid;
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
		var div = document.createElement("div"),
			frame = this.pages[i].frame;

		if (this.pages[i] === lastReferencedPage) {
			div.className = "lastReferenced";
		}
		else if (this.pages[i] === lastVictimPage) {
			div.className = "lastVictim";
		}

		div.innerHTML = "Page " + this.pages[i].page;

		if (frame !== -1) {
			div.innerHTML += " Frame " + this.pages[i].frame;
		}

		table.appendChild(div);
	}

	frag.appendChild(table);

	return frag;
};