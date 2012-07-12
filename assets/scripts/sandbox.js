var u2p = function(url, host) {
    return -1;
};
chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (typeof request.u2p != "undefined") {
            u2p = eval(request.u2p);
        }
        else if (typeof request.match != "undefined") {
            var profileId;
            profileId = u2p(request.match.url, request.match.host);
            if (typeof profileId != "number") {
                profileId = -1;
            }
            sendResponse({"profileId": profileId});
        }
    });