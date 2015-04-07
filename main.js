var logicalAddressSpace = 64, //KB
	physicalMemory = 16, //KB
	frameSize = 1, //KB
	numFrames = physicalMemory / frameSize,
	pageReferences = [],
	mem = [];

function loader() {

	var input = document.getElementById("data").textContent.split("\n"),
		i;

	for (i = 0; i < input.length; i++) {
		var parts = input[i].split(":");
		if (parts.length !== 2) {
			continue;
		}

		pageReferences.push({
			pid: parts[0].trim(),
			ref: parseInt(parts[1].trim(), 2)
		});
	}

	



}