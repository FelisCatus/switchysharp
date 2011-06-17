/*////////////////////////////////////////////////////////////////////////////////
 //                                                                              //
 //   Switchy! Chrome Proxy Manager and Switcher                                 //
 //   Copyright (c) 2011 ayanamist aka gh05tw01f (ayanamist at gmail d0t com)    //
 //   Dual licensed under the MIT and GPL licenses.                              //
 //                                                                              //
 ////////////////////////////////////////////////////////////////////////////////*/

function ProxyPlugin() {
	this.proxyMode = Settings.getValue('proxyMode', 'direct');
	this.proxyServer = Settings.getValue('proxyServer', '');
	this.proxyExceptions = Settings.getValue('proxyExceptions', '');
	this.proxyConfigUrl = Settings.getValue('proxyConfigUrl', '');
	this.autoPacScriptPath = Settings.getValue('autoPacScriptPath', '');
	this.socksPacScriptPath = Settings.getValue('socksPacScriptPath', '');
	var memoryPath = ':memory:';
	this._proxy = chrome.proxy;
	chrome.proxy.settings.get({}, function(config) {
		switch (config.mode) {
			case 'direct':
				Settings.setValue('proxyMode', 'direct');
				Settings.setValue('proxyServer', '');
				Settings.setValue('proxyExceptions', '');
				Settings.setValue('proxyConfigUrl', '');
				break;
			case 'fixed_servers':
				Settings.setValue('proxyMode', 'manual');
				break;
			case 'pac_script':
				Settings.setValue('proxyMode', 'auto');
				if (config.pacScript.url !== undefined) {
					Settings.setValue('proxyConfigUrl', config.pacScript.url);
					Settings.setValue('autoPacScriptPath', config.pacScript.url);
					Settings.setValue('socksPacScriptPath', config.pacScript.url);
				}
				else {
					Settings.setValue('proxyConfigUrl', memoryPath);
					Settings.setValue('autoPacScriptPath', memoryPath);
					Settings.setValue('socksPacScriptPath', memoryPath);
				}
				break;
		}
	});
	this.setProxy = function(proxyMode, proxyString, proxyExceptions, proxyConfigUrl) {
		var config;
		this.proxyMode = Settings.setValue('proxyMode', proxyMode);
		this.proxyServer = proxyString;
		this.proxyExceptions = proxyExceptions;
		this.proxyConfigUrl = Settings.setValue('proxyConfigUrl', proxyConfigUrl);
		switch (proxyMode) {
			case 'direct':
				this.setDirect();
				break;
			case 'manual':
				var tmpbypassList = [];
				for (el in this.proxyExceptions.split(';')) {
					tmpbypassList.push(el.trim())
				}
				config = {
					mode: "fixed_servers",
					rules : {
						bypassList: tmpbypassList
					}
				};
				break;
			case 'auto':
				if (this.proxyConfigUrl == memoryPath) {
					config = {
						mode: "pac_script",
						pacScript: {
							data: Settings.getValue('pacScriptData', '')
						}
					}
				}
				else {
					config = {
						mode: "pac_script",
						pacScript: {
							url: this.proxyConfigUrl
						}
					}
				}
				break;
		}
		this._proxy.settings.set({'value': config}, function() {});
		return 0;
	};
	this.diagnose = function(i) {
		return 'OK';
	};
	this.checkEnvironment = function(i) {
		return 'OK';
	};
	this.writeTempFile = function(fileData, fileName) {
	};
	this.readFile = function(backupFilePath) {
	};
	this.setDirect = function() {
		var config = {mode: "direct"};
		this._proxy.settings.set({'value': config}, function() {});
		this.proxyMode = Settings.setValue('proxyMode', 'direct');
		this.proxyServer = Settings.setValue('proxyServer', '');
		this.proxyExceptions = Settings.setValue('proxyExceptions', '');
		this.proxyConfigUrl = Settings.setValue('proxyConfigUrl', '');
		return 0;
	};
	this.writeAutoPacFile = function(script) {
		this.autoPacScriptPath = Settings.setValue('autoPacScriptPath', memoryPath);
		Settings.setValue('pacScriptData', script);
		return 0;
	};
	this.writeSocksPacFile = function(script) {
		this.socksPacScriptPath = Settings.setValue('socksPacScriptPath', memoryPath);
		Settings.setValue('pacScriptData', script);
		return 0;
	};
}
