/*////////////////////////////////////////////////////////////////////////////////
 //                                                                              //
 //   Switchy! Chrome Proxy Manager and Switcher                                 //
 //   Copyright (c) 2011 ayanamist aka gh05tw01f (ayanamist at gmail d0t com)    //
 //   Dual licensed under the MIT and GPL licenses.                              //
 //                                                                              //
 ////////////////////////////////////////////////////////////////////////////////*/
var memoryPath = ':memory:';
var ProxyPlugin = {};
ProxyPlugin.proxyMode = Settings.getValue('proxyMode', 'direct');
ProxyPlugin.proxyServer = Settings.getValue('proxyServer', '');
ProxyPlugin.proxyExceptions = Settings.getValue('proxyExceptions', '');
ProxyPlugin.proxyConfigUrl = Settings.getValue('proxyConfigUrl', '');
ProxyPlugin.autoPacScriptPath = Settings.getValue('autoPacScriptPath', '');
ProxyPlugin.init = function() {
	if (chrome.experimental !== undefined && chrome.experimental.proxy !== undefined)
		ProxyPlugin._proxy = chrome.experimental.proxy;
	else
		if (chrome.proxy !== undefined)
			ProxyPlugin._proxy = chrome.proxy;
		else
			alert('Need proxy api support, please update your Chrome');
	ProxyPlugin._proxy.settings.get({}, function(config) {
		switch (config.mode) {
			case 'direct':
				ProxyPlugin.proxyMode = Settings.setValue('proxyMode', 'direct');
				ProxyPlugin.proxyServer = Settings.setValue('proxyServer', '');
				ProxyPlugin.proxyExceptions = Settings.setValue('proxyExceptions', '');
				ProxyPlugin.proxyConfigUrl = Settings.setValue('proxyConfigUrl', '');
				break;
			case 'fixed_servers':
				ProxyPlugin.proxyMode = Settings.setValue('proxyMode', 'manual');
				ProxyPlugin.proxyServer;
				break;
			case 'pac_script':
				ProxyPlugin.proxyMode = Settings.setValue('proxyMode', 'auto');
				if (config.pacScript.url !== undefined) {
					ProxyPlugin.proxyConfigUrl = Settings.setValue('proxyConfigUrl', config.pacScript.url);
					ProxyPlugin.autoPacScriptPath = Settings.setValue('autoPacScriptPath', config.pacScript.url);
				}
				else {
					ProxyPlugin.proxyConfigUrl = Settings.setValue('proxyConfigUrl', memoryPath);
					ProxyPlugin.autoPacScriptPath = Settings.setValue('autoPacScriptPath', memoryPath);
				}
				break;
		}
	});
};
ProxyPlugin._parseProxy = function(str) {
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
ProxyPlugin.setProxy = function(proxyMode, proxyString, proxyExceptions, proxyConfigUrl) {
	var config;
	ProxyPlugin.proxyMode = Settings.setValue('proxyMode', proxyMode);
	ProxyPlugin.proxyServer = Settings.setValue('proxyServer', proxyString);
	ProxyPlugin.proxyExceptions = Settings.setValue('proxyExceptions', proxyExceptions);
	ProxyPlugin.proxyConfigUrl = Settings.setValue('proxyConfigUrl', proxyConfigUrl);
	switch (proxyMode) {
		case 'direct':
			config = {mode: "direct"};
			break;
		case 'manual':
			var tmpbypassList = [];
			var proxyExceptionsList = ProxyPlugin.proxyExceptions.split(';')
			var proxyExceptionListLength = proxyExceptionsList.length;
			for (var i = 0; i < proxyExceptionListLength; i++) {
				tmpbypassList.push(proxyExceptionsList[i].trim())
			}
			proxyExceptionsList = null;
			proxyExceptionListLength = null;
			var profile = ProfileManager.parseProxyString(proxyString);
			if (profile.useSameProxy) {
				config = {
					mode: "fixed_servers",
					rules : {
						singleProxy: ProxyPlugin._parseProxy(profile.proxyHttp),
						bypassList: tmpbypassList
					}
				};
			}
			else {
				if (profile.proxySocks) {
					var socksProxyString = profile.socksVersion == 4 ? 'socks=' + profile.proxySocks : 'socks5=' + profile.proxySocks;
					if ( ! profile.proxyHttp)
						profile.proxyHttp = socksProxyString;
					if ( ! profile.proxyFtp)
						profile.proxyFtp = socksProxyString;
					if ( ! profile.proxyHttps)
						profile.proxyHttps = socksProxyString;
					socksProxyString = null;
				}
				config = {
					mode: "fixed_servers",
					rules : {
						proxyForHttp: ProxyPlugin._parseProxy(profile.proxyHttp),
						proxyForHttps: ProxyPlugin._parseProxy(profile.proxyHttps),
						proxyForFtp: ProxyPlugin._parseProxy(profile.proxyFtp),
						bypassList: tmpbypassList
					}
				};
			}
			tmpbypassList = null;
			break;
		case 'auto':
			if (ProxyPlugin.proxyConfigUrl == memoryPath) {
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
						url: ProxyPlugin.proxyConfigUrl
					}
				}
			}
			break;
	}
	ProxyPlugin._proxy.settings.set({'value': config}, function() {});
	profile = null;
	config = null;
	return 0;
};
ProxyPlugin.writeAutoPacFile = function(script) {
	ProxyPlugin.autoPacScriptPath = Settings.setValue('autoPacScriptPath', memoryPath);
	Settings.setValue('pacScriptData', script);
	return 0;
};
