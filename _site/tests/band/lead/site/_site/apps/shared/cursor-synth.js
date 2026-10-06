// Shared between tunes and rhythms.
// Expects page-level globals: synthControl, pickTune (function).

function CursorControl() {
	var self = this;

	self.onReady = function() {
		var downloadLink = document.querySelector(".download");
		downloadLink.addEventListener("click", download);
		downloadLink.removeAttribute("style");
		document.querySelector(".click-explanation").removeAttribute("style");
	};

	self.onStart = function() {
		var svg = document.querySelector("#paper svg");
		var cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
		cursor.setAttribute("class", "abcjs-cursor");
		cursor.setAttribute("id", "abcjs-cursor");
		cursor.setAttributeNS(null, "x1", 0);
		cursor.setAttributeNS(null, "y1", 0);
		cursor.setAttributeNS(null, "x2", 0);
		cursor.setAttributeNS(null, "y2", 0);
		svg.appendChild(cursor);
	};

	self.beatSubdivisions = 2;

	self.onBeat = function(beatNumber, totalBeats, totalTime) {
		if (!self.beatDiv) self.beatDiv = document.querySelector(".beat");
		self.beatDiv.innerText = "Beat: " + beatNumber + " Total: " + totalBeats + " Total time: " + totalTime;
	};

	self.onEvent = function(ev) {
		if (ev.measureStart && ev.left === null) return;

		document.querySelectorAll("#paper svg .highlight").forEach(function(el) {
			el.classList.remove("highlight");
		});

		document.querySelector(".feedback").innerHTML =
			"<div class='label'>Current Note:</div>" + JSON.stringify(ev, null, 4);

		for (var i = 0; i < ev.elements.length; i++) {
			var note = ev.elements[i];
			for (var j = 0; j < note.length; j++) note[j].classList.add("highlight");
		}

		var cursor = document.querySelector("#paper svg .abcjs-cursor");
		if (cursor) {
			cursor.setAttribute("x1", ev.left - 2);
			cursor.setAttribute("x2", ev.left - 2);
			cursor.setAttribute("y1", ev.top);
			cursor.setAttribute("y2", ev.top + ev.height);
		}
	};

	self.onFinished = function() {
		document.querySelectorAll("svg .highlight").forEach(function(el) {
			el.classList.remove("highlight");
		});
		var cursor = document.querySelector("#paper svg .abcjs-cursor");
		if (cursor) {
			cursor.setAttribute("x1", 0); cursor.setAttribute("x2", 0);
			cursor.setAttribute("y1", 0); cursor.setAttribute("y2", 0);
		}
	};
}

function clickListener(abcElem) {
	var lastClicked = abcElem.midiPitches;
	if (!lastClicked) return;
	ABCJS.synth.playEvent(lastClicked, abcElem.midiGraceNotePitches,
		synthControl.visualObj.millisecondsPerMeasure())
		.catch(function(error) { console.log("error playing note", error); });
}

function checkChanger(elementId, checked) {
	document.getElementById(elementId).checked = checked;
	pickTune();
}

function disabler(elementId, disabled) {
	document.getElementById(elementId).disabled = disabled;
}

function seekExplanation() {
	var explanation = document.getElementById("unit-explanation");
	if (!synthControl.visualObj.noteTimings) {
		explanation.innerText = "First start playing to load audio before seeking.";
		return;
	}
	var units = document.getElementById("seek-units").value;
	var max = 1;
	switch (units) {
		case "seconds": max = synthControl.visualObj.getTotalTime(); break;
		case "beats":   max = synthControl.visualObj.getTotalBeats(); break;
	}
	explanation.innerText = "Enter a number between 0 and " + max + ".";
}

function seek()  { synthControl.seek(0.5); }

function seek2() {
	var amount = document.getElementById("seek-amount").value;
	var units  = document.getElementById("seek-units").value;
	synthControl.seek(amount, units);
}

function warp() {
	var el = document.querySelector(".warp");
	el.disabled = true;
	synthControl.setWarp(Math.random() * 100).then(function() { el.disabled = false; });
}

function download() {
	if (!synthControl) return;
	var sel = document.getElementById("tune-selector");
	var name = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : "tune";
	synthControl.download(name + ".wav");
}

function start() {
	if (synthControl) synthControl.play();
}
