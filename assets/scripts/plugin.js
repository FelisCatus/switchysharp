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
	var memoryPath = ':memory:';
	if (chrome.experimental !== undefined && chrome.experimental.proxy !== undefined)
		this._proxy = chrome.experimental.proxy;
	else
		if (chrome.proxy !== undefined)
			this._proxy = chrome.proxy;
		else
			alert('Need proxy api support, please update your Chrome');
	this._proxy.settings.get({}, function(config) {
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
				}
				else {
					Settings.setValue('proxyConfigUrl', memoryPath);
					Settings.setValue('autoPacScriptPath', memoryPath);
				}
				break;
		}
	});
	this._parseProxy = function(str) {
		if (str) {
			var proxy = {scheme: 'http', host: '', port: 80};
			var t1 = str.split(':');
			proxy.host = t1[0];
			var t2 = proxy.host.split('=');
			if (t2.length > 1) {
				proxy.scheme = t2[0] == 'socks' ? 'socks4' : t2[0];
				proxy.host = t2[1];
			}
			if (t1.length > 1)
				proxy.port = parseInt(t1[1]);
			return proxy;
		}
		else
			return {}
	};
	this.setProxy = function(proxyMode, proxyString, proxyExceptions, proxyConfigUrl) {
		var config;
		this.proxyMode = Settings.setValue('proxyMode', proxyMode);
		this.proxyServer = Settings.setValue('proxyServer', proxyString);
		this.proxyExceptions = Settings.setValue('proxyExceptions', proxyExceptions);
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
				var profile = ProfileManager.parseProxyString(proxyString);
				if (profile.useSameProxy) {
					config = {
						mode: "fixed_servers",
						rules : {
							singleProxy: this._parseProxy(profile.proxyHttp),
							bypassList: tmpbypassList
						}
					};
				}
				else {
					if (profile.proxySocks) {
						if ( ! profile.proxyHttp)
							profile.proxyHttp = profile.proxySocks;
						if ( ! profile.proxyFtp)
							profile.proxyFtp = profile.proxySocks;
						if ( ! profile.proxyHttps)
							profile.proxyHttps = profile.proxySocks;
					}
					config = {
						mode: "fixed_servers",
						rules : {
							proxyForHttp: this._parseProxy(profile.proxyHttp),
							proxyForHttps: this._parseProxy(profile.proxyHttps),
							proxyForFtp: this._parseProxy(profile.proxyFtp),
							bypassList: tmpbypassList
						}
					};
				}
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
}
