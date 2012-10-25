/*
Copyright (c) 2011 Shyc2001 (http://twitter.com/shyc2001)
This work is based on:
*"Switchy! Chrome Proxy Manager and Switcher" (by Mohammad Hejazi (mohammadhi at gmail d0t com))
*"SwitchyPlus" by @gh05tw01f (http://twitter.com/gh05tw01f)

    This file is part of SwitchySharp.
    SwitchySharp is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SwitchySharp is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SwitchySharp.  If not, see <http://www.gnu.org/licenses/>.
*/
var RuleManager = {};

RuleManager.PatternTypes = {
	wildcard: "wildcard",
	regexp: "regexp"
};

RuleManager.rules = {};

RuleManager.allRules = {};

RuleManager.TempRules = {};

RuleManager.enabled = true;

RuleManager.ruleListEnabled = false;

RuleManager.autoPacScriptPath = undefined;

RuleManager.profilesScripts = {};

RuleManager.defaultRule = {
	id: "defaultRule",
	name: "Default Rule",
	urlPattern: "",
	patternType: RuleManager.PatternTypes.wildcard,
	profileId : ProfileManager.directConnectionProfile.id
};

RuleManager.init = function init() {
	RuleManager.loadRules();
};

RuleManager.loadRules = function loadRules() {
	var rules = Settings.getObject("rules");
	if (rules != undefined) {
		for (var i in rules) {
			var rule = rules[i];
			rule = RuleManager.fixRule(rule);
		}

		RuleManager.rules = rules;
	}
	
	RuleManager.enabled = Settings.getValue("switchRules", true);
	
	var rule = Settings.getObject("defaultRule");
	if (rule != undefined)
		RuleManager.defaultRule = rule;

	RuleManager.ruleListEnabled = Settings.getValue("ruleListEnabled", false);
};

RuleManager.save = function saveRules() {
	Settings.setObject("rules", RuleManager.rules);
	Settings.setValue("switchRules", RuleManager.enabled);		
	Settings.setObject("defaultRule", RuleManager.defaultRule);
	Settings.setValue("ruleListEnabled", RuleManager.ruleListEnabled);		
};

RuleManager.isEnabled = function isEnabled() {
	return RuleManager.enabled;
};

RuleManager.setEnabled = function setEnabled(enabled) {
	RuleManager.enabled = (enabled == true ? true : false);
};

RuleManager.isRuleListEnabled = function isRuleListEnabled() {
	return RuleManager.ruleListEnabled;
};

RuleManager.setRuleListEnabled = function setRuleListEnabled(enabled) {
	RuleManager.ruleListEnabled = (enabled == true ? true : false);
};

RuleManager.getDefaultRule = function getDefaultRule() {
	return RuleManager.defaultRule;
};

RuleManager.setDefaultRule = function setDefaultRule(rule) {
	RuleManager.defaultRule = rule;
};

RuleManager.getRules = function getRules() {
	var rules = {};
	for (var i in RuleManager.rules) {
		var rule = RuleManager.rules[i];
		rule = RuleManager.normalizeRule(rule);
		rules[i] = rule;
	}
	
	return rules;
};

RuleManager.setRules = function setRules(rules) {
	rules = $.extend(true, {}, rules);
	RuleManager.rules = rules;
};

RuleManager.addRule = function addRule(rule) {
	RuleManager.rules[rule.id] = rule;
	RuleManager.save();
	
	if (RuleManager.isAutomaticModeEnabled(undefined))
		ProfileManager.applyProfile(RuleManager.getAutomaticModeProfile(false));
};

RuleManager.addTempRule = function addTempRule(domain, profileId) {
	RuleManager.TempRules[domain] = profileId;
	
	if (RuleManager.isAutomaticModeEnabled(undefined))
		ProfileManager.applyProfile(RuleManager.getAutomaticModeProfile(false));
};

RuleManager.getSortedRuleArray = function getSortedRuleArray() {
	var rules = RuleManager.getRules();
	var ruleArray = [];
	for (var i in rules)
		ruleArray[ruleArray.length] = rules[i];

	ruleArray = ruleArray.sort(Utils.compareNamedObjects);
	return ruleArray;
};

RuleManager.getProfileByUrl = function getProfileByUrl(url) {
	if(url.indexOf("chrome://") > -1 || url.indexOf("file://") > -1)
		return ProfileManager.directConnectionProfile;
	else
	{
		var i = url.indexOf("#");
		if(i>0) url = url.substr(0, i);
		RuleManager.LastUri = url;
		var host = parseUri(RuleManager.LastUri)["authority"];
		RuleManager.LastDomain = host;
		return ProfileManager.getProfile(RuleManager._u2p(url, host, RuleManager.shExpMatch, RuleManager.regExpMatch));
	}
};

RuleManager.ruleExists = function ruleExists(urlPattern, patternType) {
	if (patternType == RuleManager.PatternTypes.wildcard)
		urlPattern = RuleManager.wildcardToRegexp(urlPattern);
	
	var rules = RuleManager.rules;
	for (var i in rules) {
		var rule = rules[i];
		var ruleUrlPattern = rule.urlPattern;
		if (rule.patternType == RuleManager.PatternTypes.wildcard)
			ruleUrlPattern = RuleManager.wildcardToRegexp(ruleUrlPattern);
		
		if (ruleUrlPattern == urlPattern)
			return true;
	}
	return false;
};

RuleManager.ruleExistsForUrl = function ruleExistsForUrl(url) {
	var rules = RuleManager.rules;
	for (var i in rules) {
		var rule = rules[i];
		if (RuleManager.matchPattern(url, rule.urlPattern, rule.patternType))
			return true;
	}
	return false;
};

RuleManager.downloadPacScript = function downloadPacScript(url) {
	var result = "";
	
	if(url.indexOf("data:") == 0)
	{
		result = dataURI.decode(url).data;
	}
	else{
		$.ajax({
			url: url,
			success: function(data, textStatus){
				result = data;
			},
			error: function(request, textStatus, thrownError){
				Logger.log("Error downloading PAC file!", Logger.Types.warning);
			},
			dataType: "text",
			cache: true,
			timeout: 10000,
			async: false
		});
	}
	return result;
};

RuleManager.downloadProfilesPacScripts = function downloadProfilesPacScripts() {
	var scripts = {};
	var rules = RuleManager.getRules();
	rules["default"] = RuleManager.getDefaultRule();
	var counter = 1;
	for (var i in rules) {
		var rule = rules[i];
		var profile = ProfileManager.getProfile(rule.profileId);
		if (profile == undefined)
			continue;
		
		if (profile.proxyMode != ProfileManager.ProxyModes.auto)
			continue;
		
		var script = RuleManager.downloadPacScript(profile.proxyConfigUrl);
		if (!script || script.length == 0) {
			scripts[profile.id] = {functionName: "", script: ""};
			continue;
		}
		
		var functionName = "Proxy" + counter++;
		script = "var " + functionName + " = (function(){\r\n\t" + 
				 script.replace(/([\r\n]+)/g, "\r\n\t") + "\r\n\treturn FindProxyForURL;\r\n})();\r\n";
		scripts[profile.id] = {functionName: functionName, script: script};
	}
	
	return scripts;
};

RuleManager.saveAutoPacScript = function saveAutoPacScript() {
	RuleManager.profilesScripts = RuleManager.downloadProfilesPacScripts();

	var script = RuleManager.generateAutoPacScript();
	try {
		var result = ProxyPlugin.writeAutoPacFile(script);
		if (result != 0 || result != "0")
			throw "Error Code (" + result + ")";
		
	} catch(ex) {
		Logger.log("Plugin Error @RuleManager.saveAutoPacScript() > " + ex.toString(), Logger.Types.error);		
		return false;
	}
};

RuleManager.wildcardToRegexp = function wildcardToRegexp(pattern) {
	pattern = pattern.replace(/([\\\+\|\{\}\[\]\(\)\^\$\.\#])/g, "\\$1");
//	pattern = pattern.replace(/\./g, "\\.");
	pattern = pattern.replace(/\*/g, ".*");
	pattern = pattern.replace(/\?/g, ".");
//	var regexp = /*new RegExp*/("^" + pattern + "$");
	var regexp = pattern;
	return regexp;
};

RuleManager.shExpMatch = function shExpMatch(url, pattern) {
	pattern = pattern.replace(/\./g, "\\.");
	pattern = pattern.replace(/\*/g, ".*");
	pattern = pattern.replace(/\?/g, ".");
	var regexp = new RegExp("^" + pattern + "$");
	return regexp.test(url);
};

RuleManager.regExpMatch = function regExpMatch(url, pattern) {
	var regexp = new RegExp(pattern);
	return regexp.test(url);
};

RuleManager.matchPattern = function matchPattern(url, pattern, patternType) {
	if (patternType == RuleManager.PatternTypes.regexp)
		return RuleManager.regExpMatch(url, pattern);
	
	return RuleManager.shExpMatch(url, pattern);
};

RuleManager.domainToRule = function domainToRule(domain, patternType) {
	var nameId = RuleManager.generateId("Quick Rule ");
	return {
		id: nameId,
		name: nameId,
		urlPattern: patternType == RuleManager.PatternTypes.regexp ? "^https?://" + RuleManager.wildcardToRegexp(domain) + "/" : "*://" + domain + "/*",
		patternType: patternType,
		profileId : ProfileManager.directConnectionProfile.id
	};
};

RuleManager.generateId = function generateId(ruleName) {
	var rules = RuleManager.rules;
	var ruleId = ruleName;
	if (rules[ruleId] != undefined) {
		for (var j = 2; ; j++) {
			var newId = ruleId + j;
			if (rules[newId] == undefined) {
				ruleId = newId;
				break;
			}
		}
	}
	return ruleId;
};

RuleManager.ruleToString = function ruleToString(rule, prettyPrint) {
	if (!prettyPrint)
		return "Rule: " + JSON.stringify(rule);
	
	var result = [];
	if (rule.name != undefined)
		result.push(rule.name); 
	
	if (rule.urlPattern != undefined && rule.urlPattern.trim().length > 0) {
		result.push("URL Pattern: " + rule.patternType + "(" + rule.urlPattern + ")"); 
	}
	if (rule.profileId != undefined && rule.profileId.trim().length > 0)
		result.push("Proxy Profile: " + ProfileManager.getProfiles()[rule.profileId]);
	
	return result.join("\r\n");
};

RuleManager.ruleToExpr = function ruleToExpr(rule) {
	var urlPattern = rule.urlPattern || "";
	
	// Check Non-ASCII chars
	for (var i = 0; i < urlPattern.length; i++) {
		var code = urlPattern.charCodeAt(i);
		if (code >= 128) {
			alert('Invalid non-ASCII char "' + urlPattern[i] + '" (U+' + code.toString(16).toUpperCase() +  ')' + " in " + urlPattern);
			return '(false)';
		}
	}
	
	if (rule.patternType == RuleManager.PatternTypes.wildcard) {
		if(urlPattern[0] == "@")
			urlPattern = urlPattern.substring(1);
		else{
			if(urlPattern.indexOf("://") <= 0 && urlPattern[0] != "*")
				urlPattern = "*" + urlPattern;
			
			if (urlPattern[urlPattern.length - 1] != "*")
				urlPattern += "*";
			}
	}
	// just declare to see whether regular expression rule is valid
	try {
			if (rule.patternType == RuleManager.PatternTypes.regexp) {
					var tmp = new RegExp(urlPattern);
			}
			else {
					var tmp = new RegExp(RuleManager.wildcardToRegexp(urlPattern));
			}
	}
	catch(e) {
			delete tmp;
			alert("Invalid " + (rule.patternType == RuleManager.PatternTypes.regexp ? "regular expression" : "wildcard") + " : " + urlPattern);
			return '(false)';
	}
	delete tmp;

	var matchFunc = (rule.patternType == RuleManager.PatternTypes.regexp ? "regExpMatch" : "shExpMatch");
	var script = "(";
	script += matchFunc + "(url, " + JSON.stringify(urlPattern) + ")";
	if (rule.patternType != RuleManager.PatternTypes.regexp)
	{
		var urlPattern2 = null;
		if(urlPattern.indexOf("://*.")>0) urlPattern2 = urlPattern.replace("://*.", "://");
		else if(urlPattern.indexOf("*.") == 0) urlPattern2 = "*://" + urlPattern.substring(2);
		
		if(urlPattern2)
		{
			script += " || shExpMatch(url, " + JSON.stringify(urlPattern2) + ")";
		}
	}

	return script + ")";
};

RuleManager._getPacRuleProxy = function getPacRuleProxy(profileId) {
	var proxy = "DIRECT";
	if (profileId != ProfileManager.directConnectionProfile.id) {
		var profile = ProfileManager.getProfile(profileId);
		if (profile != undefined && profile.proxyMode == ProfileManager.ProxyModes.manual) {
			if (profile.proxyHttp && profile.proxyHttp.length > 0)
				proxy = "PROXY " + profile.proxyHttp;
			
			if (profile.proxySocks && profile.proxySocks.length > 0
				&& !profile.useSameProxy && profile.proxySocks != profile.proxyHttp) { // workaround for Gnome
				if (profile.socksVersion == 5)
					proxy = "SOCKS5 " + profile.proxySocks + (proxy != "DIRECT" ? "; " + proxy : "");
				else
					proxy = "SOCKS " + profile.proxySocks + (proxy != "DIRECT" ? "; " + proxy : "");
			} 
		}
	}
	return proxy;
};

RuleManager.getPacRuleProxy = function getPacRuleProxy(profileId) {	
	var proxy = "'DIRECT'";
	if (profileId != ProfileManager.directConnectionProfile.id) {
		var profile = ProfileManager.getProfile(profileId);
		if (profile != undefined && profile.proxyMode != ProfileManager.ProxyModes.direct) {
			if (profile.proxyMode == ProfileManager.ProxyModes.manual) {
				if (profile.proxyHttp && profile.proxyHttp.length > 0)
					proxy = "PROXY " + profile.proxyHttp;
				
				if (profile.proxySocks && profile.proxySocks.length > 0
					&& !profile.useSameProxy && profile.proxySocks != profile.proxyHttp) { // workaround for Gnome
					if (profile.socksVersion == 5)
						proxy = "SOCKS5 " + profile.proxySocks + (proxy != "'DIRECT'" ? "; DIRECT" : "");
					else
						proxy = "SOCKS " + profile.proxySocks + (proxy != "'DIRECT'" ? "; DIRECT" : "");
				}
				if(proxy != "'DIRECT'") proxy = "'" + proxy + "'";
				
			} else if (profile.proxyMode == ProfileManager.ProxyModes.auto) {
				var script = RuleManager.profilesScripts[profile.id];
				if (script) {
					proxy = script.functionName + "(url, host)";
				}
			}
		}
	}
	return proxy;
};

RuleManager.getPacDefaultProxy = function getPacDefaultProxy(defaultProfile) {
    // TODO: merge RuleManager.getPacDefaultProxy and RuleManager.getPacRuleProxy in one function
	var proxy = "'DIRECT'";
    var profile = defaultProfile;
    if (profile != undefined && profile.proxyMode != ProfileManager.ProxyModes.direct) {
        if (profile.proxyMode == ProfileManager.ProxyModes.manual) {
            if (profile.proxyHttp && profile.proxyHttp.length > 0)
                proxy = "PROXY " + profile.proxyHttp;
            
            if (profile.proxySocks && profile.proxySocks.length > 0
                && !profile.useSameProxy && profile.proxySocks != profile.proxyHttp) { // workaround for Gnome
                if (profile.socksVersion == 5)
                    proxy = "SOCKS5 " + profile.proxySocks + (proxy != "'DIRECT'" ? "; DIRECT" : "");
                else
                    proxy = "SOCKS " + profile.proxySocks + (proxy != "'DIRECT'" ? "; DIRECT" : "");
            }
            if(proxy != "'DIRECT'") proxy = "'" + proxy + "'";
            
        } else if (profile.proxyMode == ProfileManager.ProxyModes.auto) {
            var script = RuleManager.profilesScripts[profile.id];
            if (script && script.functionName && script.functionName != "") {
                proxy = script.functionName + "(url, host)";
            }
        }
    }
	return proxy;


	
	var proxy = "DIRECT";
	var profile = defaultProfile;
	if (profile != undefined && (profile.isAutomaticModeProfile || profile.proxyMode == ProfileManager.ProxyModes.manual)) {
		if (profile.proxyHttp && profile.proxyHttp.length > 0)
			proxy = "PROXY " + profile.proxyHttp;
		
		if (profile.proxySocks && profile.proxySocks.length > 0
			&& !profile.useSameProxy && profile.proxySocks != profile.proxyHttp) { // workaround for useSameProxy in Gnome
			if (profile.socksVersion == 5)
				proxy = "SOCKS5 " + profile.proxySocks + (proxy != "DIRECT" ? "; " + proxy : "");
			else
				proxy = "SOCKS " + profile.proxySocks + (proxy != "DIRECT" ? "; " + proxy : "");
		} 
	}
	return "'" + proxy + "'";
};

RuleManager.generatePacScript = function generatePacScript(rules, defaultProfile) {
	var script = [];
	
	for (var i in RuleManager.profilesScripts) {
		var profileScript = RuleManager.profilesScripts[i];
		script.push(profileScript.script);
	}
	
	script.push("function regExpMatch(url, pattern) {");
	script.push("\ttry { return new RegExp(pattern).test(url); } catch(ex) { return false; }");
	script.push("}\n");
	script.push("function FindProxyForURL(url, host) {");
	
	var u2p = [ "(function(url, host, shExpMatch, regExpMatch){" ];
	for (var i in RuleManager.TempRules) {
		var profileId = RuleManager.TempRules[i];
		script.push("\tif (host == '" + i + "') return " + RuleManager.getPacRuleProxy(profileId) + ";");
		u2p.push("\tif (host == '" + i + "') return '" + profileId + "';");
	}
	for (var i in rules) {
		var rule = rules[i];
		var expr = RuleManager.ruleToExpr(rule);
		var proxy;
		if (rule.proxy) { // predefined proxy (see |generateAutoPacScript|)
			proxy = rule.proxy;
		}
		else {
			proxy = RuleManager.getPacRuleProxy(rule.profileId);
		}
		script.push("\tif " + expr + " return " + proxy + ";");
		u2p.push("\tif " + expr + " return '" + rule.profileId + "';");
	}
	if(defaultProfile.proxyExceptions)
	{
		var proxyExceptionsList = defaultProfile.proxyExceptions.split(';');
		for(var i in proxyExceptionsList)
			script.push("\tif(shExpMatch(host, '" + proxyExceptionsList[i].trim() + "')) return 'DIRECT';");
	}
	
	var proxy = RuleManager.getPacDefaultProxy(defaultProfile);
	script.push("\treturn " + proxy + ";");
	script.push("}");
	
	u2p.push("\treturn '" + defaultProfile.id + "';");
	u2p.push("})");
	RuleManager._u2p = eval(u2p.join("\n"));
	
	return script.join("\n");
};

RuleManager.generateRuleList = function generateRuleList() {
	var rules = RuleManager.getRules();
	var allRules = undefined;
	if (RuleManager.isEnabled() && RuleManager.isRuleListEnabled())
		allRules = Settings.getObject("ruleListRules");
	
	if (!allRules) {
		allRules = {
			wildcard : [],
			regexp : []
		};
	}
	for (var i in rules) {
		var rule = rules[i];
		if (rule.patternType == RuleManager.PatternTypes.regexp)
			allRules.regexp.push(rule.urlPattern);
		else
			allRules.wildcard.push(rule.urlPattern);
	}
	var wildcardRules = "[wildcard]\r\n" + allRules.wildcard.join("\r\n");
	var regexpRules = "[regexp]\r\n" + allRules.regexp.join("\r\n");
	var header = "; Summary: Proxy Switchy! Exported Rule List\r\n"
		+ "; Date: " + new Date().toLocaleDateString() + "\r\n"
		+ "; Website: http://bit.ly/proxyswitchy";
		
	var ruleListData = header + "\r\n\r\n#BEGIN\r\n\r\n" + wildcardRules + "\r\n\r\n" + regexpRules + "\r\n\r\n#END";
	
	return ruleListData;
};

RuleManager.ruleListToScript = function ruleListToScript() {
//	if (!RuleManager.isRuleListEnabled())
//		return "";
//
//	var defaultProfile = RuleManager.getAutomaticModeProfile(false);	
//	var defaultProxy = RuleManager.getPacDefaultProxy(defaultProfile);
//	var ruleListRules = Settings.getObject("ruleListRules");
//	var ruleListProfileId = Settings.getValue("ruleListProfileId");
//	var ruleListProxy = RuleManager.getPacRuleProxy(ruleListProfileId);
//	if (ruleListRules == undefined)
//		return "";
//	
//	// start with reverse rules (starting with '!') (top priority)
//	for (var i = 0; i < ruleListRules.wildcard.length; i++) {
//		var urlPattern = ruleListRules.wildcard[i];
//		if (urlPattern[0] == '!') {
//			urlPattern = urlPattern.substr(1);
//			rules["__ruleW" + i] = {
//				urlPattern: urlPattern,
//				patternType: RuleManager.PatternTypes.wildcard,
//				profileId : ruleListProfileId,
//				proxy: defaultProxy
//			};
//		}
//	}
//	for (var i = 0; i < ruleListRules.regexp.length; i++) {
//		var urlPattern = ruleListRules.regexp[i];
//		if (urlPattern[0] == '!') {
//			urlPattern = urlPattern.substr(1);
//			rules["__ruleR" + i] = {
//				urlPattern: urlPattern,
//				patternType: RuleManager.PatternTypes.regexp,
//				profileId : ruleListProfileId,
//				proxy: defaultProxy
//			};
//		}
//	}
//	
//	// normal rules
//	for (var i = 0; i < ruleListRules.wildcard.length; i++) {
//		var urlPattern = ruleListRules.wildcard[i];
//		if (urlPattern[0] != '!') {
//			urlPattern = urlPattern.substr(1);
//			rules["__ruleW" + i] = {
//				urlPattern: urlPattern,
//				patternType: RuleManager.PatternTypes.wildcard,
//				profileId : ruleListProfileId,
//				proxy: ruleListProxy
//			};
//		}
//	}
//	for (var i = 0; i < ruleListRules.regexp.length; i++) {
//		var urlPattern = ruleListRules.regexp[i];
//		if (urlPattern[0] != '!') {
//			urlPattern = urlPattern.substr(1);
//			rules["__ruleR" + i] = {
//				urlPattern: urlPattern,
//				patternType: RuleManager.PatternTypes.regexp,
//				profileId : ruleListProfileId,
//				proxy: ruleListProxy
//			};
//		}
//	}
};

RuleManager.generateAutoPacScript = function generateAutoPacScript() {
	var rules = RuleManager.getRules();
	var defaultProfile = ProfileManager.getProfile(RuleManager.getDefaultRule().profileId);
	var defaultProxy = RuleManager.getPacDefaultProxy(defaultProfile);

	if (RuleManager.isEnabled() && RuleManager.isRuleListEnabled()) {
		var ruleListRules = Settings.getObject("ruleListRules");
		var ruleListProfileId = Settings.getValue("ruleListProfileId");
		var ruleListProxy = RuleManager.getPacRuleProxy(ruleListProfileId);
		if (ruleListRules != undefined) {
			// start with reverse rules (starting with '!') (top priority)
			for (var i = 0; i < ruleListRules.wildcard.length; i++) {
				var urlPattern = ruleListRules.wildcard[i];
				if (urlPattern[0] == '!') {
					urlPattern = urlPattern.substr(1);
					rules["__ruleW" + i] = {
						urlPattern: urlPattern,
						patternType: RuleManager.PatternTypes.wildcard,
						profileId : defaultProfile.id,
						proxy: defaultProxy
					};
				}
			}
			for (var i = 0; i < ruleListRules.regexp.length; i++) {
				var urlPattern = ruleListRules.regexp[i];
				if (urlPattern[0] == '!') {
					urlPattern = urlPattern.substr(1);
					rules["__ruleR" + i] = {
						urlPattern: urlPattern,
						patternType: RuleManager.PatternTypes.regexp,
						profileId : defaultProfile.id,
						proxy: defaultProxy
					};
				}
			}
			// normal rules
			for (var i = 0; i < ruleListRules.wildcard.length; i++) {
				var urlPattern = ruleListRules.wildcard[i];
				if (urlPattern[0] != '!') {
					rules["__ruleW" + i] = {
						urlPattern: urlPattern,
						patternType: RuleManager.PatternTypes.wildcard,
						profileId : ruleListProfileId,
						proxy: ruleListProxy
					};
				}
			}
			for (var i = 0; i < ruleListRules.regexp.length; i++) {
				var urlPattern = ruleListRules.regexp[i];
				if (urlPattern[0] != '!') {
					rules["__ruleR" + i] = {
						urlPattern: urlPattern,
						patternType: RuleManager.PatternTypes.regexp,
						profileId : ruleListProfileId,
						proxy: ruleListProxy
					};
				}
			}
		}
	}
	
	RuleManager.allRules = rules;
	
	return RuleManager.generatePacScript(rules, defaultProfile);
};

RuleManager.getAutoPacScriptPath = function getAutoPacScriptPath(withSalt) {
	if (RuleManager.autoPacScriptPath == undefined) {
		try {
			RuleManager.autoPacScriptPath = ProxyPlugin.autoPacScriptPath;
		} catch(ex) {
			Logger.log("Plugin Error @RuleManager.getAutoPacScriptPath() > " + ex.toString(), Logger.Types.error);
			return undefined;
		}
	}
	
	return RuleManager.autoPacScriptPath + (withSalt ? "?" + new Date().getTime() : "");
};

RuleManager.getAutomaticModeProfile = function getAutomaticModeProfile(withSalt) {
	return ProfileManager.autoSwitchProfile;
};

RuleManager.isAutomaticModeEnabled = function isAutomaticModeEnabled(currentProfile) {
	if (currentProfile == undefined)
		currentProfile = ProfileManager.getCurrentProfile();
	
	return (currentProfile.proxyMode == ProfileManager.ProxyModes.auto) && (currentProfile.id == ProfileManager.autoSwitchProfile.id);
};

RuleManager.loadRuleList = function loadRuleList(scheduleNextReload) {
	if (!RuleManager.isEnabled() || !RuleManager.isRuleListEnabled())
		return RuleManager.loadRuleListCallback = null;
	
	if (scheduleNextReload) {
		var interval = Settings.getValue("ruleListReload", 1) * 1000 * 60;
		setTimeout(function() {
			RuleManager.loadRuleList(true);
		}, interval);
	}
	
	var ruleListUrl = Settings.getValue("ruleListUrl");
	//if (!(/^https?:\/\//).test(ruleListUrl)) {
	//	Logger.log("Invalid rule list url: (" + ruleListUrl + ")", Logger.Types.error);
	//	return false;
	//}
	
	$.ajax({
		url: ruleListUrl,
		success: function(data, textStatus){
			if (data.length <= 1024 * 1024){ // bigger than 1 megabyte
				RuleManager.parseRuleList(data);
				Settings.setValue("lastListUpdate", new Date().toString());
				RuleManager.doLoadRuleListCallback(true);
			}
			else {
				Logger.log("Too big rule list file!", Logger.Types.error);
				RuleManager.doLoadRuleListCallback(false);
			}
		},
		error: function(request, textStatus, thrownError){
			Logger.log("Error downloading rule list file!", Logger.Types.warning);
			RuleManager.doLoadRuleListCallback(false);
		},
		dataType: "text",
		cache: true,
		async: true,
		timeout: 10000
	});
	return true;
};

RuleManager.doLoadRuleListCallback = function doLoadRuleListCallback(success)
{
	if(RuleManager.loadRuleListCallback)
	{
		RuleManager.loadRuleListCallback(success);
		RuleManager.loadRuleListCallback = null;
	}
}

RuleManager.parseRuleList = function parseRuleList(data) {
	if (Settings.getValue("ruleListAutoProxy", false))
		return RuleManager.parseAutoProxyRuleList(data);
	
	return RuleManager.parseSwitchyRuleList(data);
};

RuleManager.parseSwitchyRuleList = function parseSwitchyRuleList(data) {
	if (data == null)
		return;

	data = (/#BEGIN((?:.|[\n\r])+)#END/i).exec(data);
	if (!data || data.length < 2)
		return;
	
	data = data[1].trim();
	var lines = data.split(/[\r\n]+/);
	var rules = {
		wildcard: [],
		regexp: []
	};
	var patternType = RuleManager.PatternTypes.wildcard;
	for (var index = 0; index < lines.length; index++) {
		var line = lines[index].trim();
		
		if (line.length == 0 || line[0] == ';' || line[0] == '!') // comment line
			continue;
		
		if (line.toLowerCase() == "[wildcard]") {
			patternType = RuleManager.PatternTypes.wildcard;
			continue;
		}
		
		if (line.toLowerCase() == "[regexp]") {
			patternType = RuleManager.PatternTypes.regexp;
			continue;
		}

		if (line[0] == '[') // unknown section
			continue;
		
		rules[patternType].push(line);
	}
	
	Settings.setObject("ruleListRules", rules);
	
	if (RuleManager.isAutomaticModeEnabled(undefined)) {
		var profile = RuleManager.getAutomaticModeProfile(false);
		ProfileManager.applyProfile(profile);
	}
};

RuleManager.parseAutoProxyRuleList = function parseAutoProxyRuleList(data) {
	if (data == null || data.length < 2) {
		Logger.log("Too small AutoProxy rules file!", Logger.Types.warning);
		return;
	}
	
	if (data.substr(0, 10) != "[AutoProxy") {
		data = $.base64Decode(data); //Base64 encoded AutoProxy list
		if (data.substr(0, 10) != "[AutoProxy") {
			Logger.log("Invalid AutoProxy rules file!", Logger.Types.warning);
			return;
		}
	}
	
	var lines = data.split(/[\r\n]+/);
	var rules = {
		wildcard: [],
		regexp: []
	};
	var patternType;
	for (var index = 0; index < lines.length; index++) {
		var line = lines[index].trim();
		
		if (line.length == 0 || line[0] == ';' || line[0] == '!' || line[0] == '[') // comment line
			continue;
		
		var exclude = false;
		if (line.substr(0, 2) == "@@") {
			exclude = true;
			line = line.substring(2);
		}
		if (line[0] == '+') {
            line = line.substring(1);
        }
		if (line[0] == '/' && line[line.length - 1] == '/') { // regexp pattern
			patternType = RuleManager.PatternTypes.regexp;
			line = line.substring(1, line.length - 1);
		}
		else if (line.indexOf('^') > -1) {
			patternType = RuleManager.PatternTypes.regexp;
			line = RuleManager.wildcardToRegexp(line);
			line = line.replace(/\\\^/g, "(?:[^\\w\\-.%\\u0080-\\uFFFF]|$)");
		}
		else if (line.substr(0, 2) == "||") {
			patternType = RuleManager.PatternTypes.regexp;
			line = '^[\\w\\-]+:\\/+(?!\\/)(?:[^\\/]+\\.)?' + RuleManager.wildcardToRegexp(line.substring(2));
		}
		else if (line[0] == "|"){
			patternType = RuleManager.PatternTypes.wildcard;
			if(line[line.length - 1] == "|")
				line = "@" + line.substring(1, line.length - 2);
			else
				line = "@" + line.substring(1) + "*";
		}
		else {
			patternType = RuleManager.PatternTypes.wildcard;
			line = "http://*" + line;
		}

		if (exclude)
			line = "!" + line;

		rules[patternType].push(line);
	}
	
	Settings.setObject("ruleListRules", rules);
	
	if (RuleManager.isAutomaticModeEnabled(undefined)) {
		var profile = RuleManager.getAutomaticModeProfile(false);
		ProfileManager.applyProfile(profile);
	}
};

RuleManager.normalizeRule = function normalizeRule(rule) {
	var newRule = {
		name: "",
		urlPattern: "",
		patternType: RuleManager.PatternTypes.wildcard,
		profileId : ProfileManager.directConnectionProfile.id
	};
	$.extend(newRule, rule);
	return newRule;
};

RuleManager.fixRule = function fixRule(rule) {
	if (rule.patternType == "regex") // backward compatibility
		rule.patternType = RuleManager.PatternTypes.regexp;

	return rule;
};

RuleManager.hasRules = function hasRules() {
	var result = false;
	for (i in RuleManager.rules) {
		result = true;
		break;
	}
	
	return result;
};

RuleManager.equals = function equals(rule1, rule2) {
	return (rule1.urlPattern == rule2.urlPattern
			&& rule1.patternType == rule2.patternType
			&& rule1.profileId == rule2.profileId);
};

RuleManager.contains = function contains(rule) {
	var rules = RuleManager.getRules();
	for (i in rules) {
		if (RuleManager.equals(rules[i], rule))
			return rules[i];
	}
	return undefined;
};

RuleManager.init();

