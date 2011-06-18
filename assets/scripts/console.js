/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var extension;
var Logger;
var Utils;

function init() {
	document.body.style.visibility = "visible";

	extension = chrome.extension.getBackgroundPage();

	initLog();
	loadLog();
}

function closeWindow() {
	window.close();
}

function initLog() {
}

function loadLog(content) {
	$("#console").text(content);
}

function clearContent() {
	$("#console").text('');
}

