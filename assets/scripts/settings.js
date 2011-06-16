/*/////////////////////////////////////////////////////////////////////////
//                                                                       //
//   Switchy! Chrome Proxy Manager and Switcher                          //
//   Copyright (c) 2009 Mohammad Hejazi (mohammadhi at gmail d0t com)    //
//   Dual licensed under the MIT and GPL licenses.                       //
//                                                                       //
/////////////////////////////////////////////////////////////////////////*/

var Settings = {};

Settings.configCache = {};

Settings.setValue = function setValue(key, value) {
	Settings.configCache[key] = value;

	var config = {};
	if (localStorage.config)
		config = JSON.parse(localStorage.config);
	
	config[key] = value;
	localStorage.config = JSON.stringify(config);	
};

Settings.getValue = function getValue(key, defaultValue) {
	if (Settings.configCache[key] != undefined)
		return Settings.configCache[key];
	
	if (!localStorage.config)
		return defaultValue;
	
	var config = JSON.parse(localStorage.config);
	if (config[key] == undefined)
		return defaultValue;
	
	Settings.configCache[key] = config[key];
	return config[key];
};

Settings.keyExists = function keyExists(key) {
	if (!localStorage.config)
		return false;
	
	var config = JSON.parse(localStorage.config);
	return (config[key] != undefined);
};

Settings.setObject = function setObject(key, object) {
	localStorage[key] = JSON.stringify(object);
};

Settings.getObject = function getObject(key) {
	if (localStorage[key] == undefined)
		return undefined;
	
	return JSON.parse(localStorage[key]);
};
