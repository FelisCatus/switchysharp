window.u2p = function(url, host) {
    return -1;
};

window.addEventListener("message", function (e) {
  if (typeof e.data.u2p !== "undefined") {
    try {
      window.u2p = eval(e.data.u2p);
    } catch (e) {
      console.log(e);
    }
  } else if (typeof e.data.match !== "undefined") {
    var profileId = u2p(e.data.match.url, e.data.match.host);
    if (typeof profileId != "number") profileId = -1;
    e.source.postMessage({"reqid": e.data.reqid, "profileId": profileId}, "*");
  }
}, false);