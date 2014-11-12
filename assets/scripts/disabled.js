document.querySelector('#btnCancel').addEventListener('click', function () {
  window.close();
}, false);

var url = 'chrome://extensions/?id=' + chrome.i18n.getMessage('@@extension_id');
document.querySelector('#btnManage').setAttribute('data-open-tab', url);
document.addEventListener('click', function (e) {
  var url = e.target.getAttribute('data-open-tab');
  if (url) {
    chrome.tabs.create({url: url});
    window.close();
  }
}, false);

chrome.extension.getBackgroundPage().I18n.process(document);
