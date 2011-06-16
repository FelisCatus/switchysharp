/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/


var Utils = {};

Utils.OS = {
	isMac: (/mac/i).test(navigator.userAgent), // maybe should test |navigator.platform| instead?
	isWindows: (/win/i).test(navigator.userAgent),
	isLinux: (/linux/i).test(navigator.userAgent)
};

Utils.compareStrings = function compareStrings(s1, s2) {
	s1 = s1.toLowerCase();
	s2 = s2.toLowerCase();
	var length = Math.min(s1.length, s2.length);
	for (var i = 0; i < length; i++) {
		var ch1 = s1.charCodeAt(i);
		var ch2 = s2.charCodeAt(i);
		if (ch1 != ch2)
			return ch1 - ch2;
	}
	
	return s1.length - s2.length;
};

Utils.compareNamedObjects = function compareNamedObjects(o1, o2) {
	return Utils.compareStrings(o1.name, o2.name);
};
