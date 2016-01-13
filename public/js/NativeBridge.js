
var NativeBridge = {
  callbacksCount : 1,
  callbacks : {},
  call : function call(functionName,callback) {
    var hasCallback = callback && typeof callback == "function";
    var callbackId = hasCallback ? NativeBridge.callbacksCount++ : 0;
    if (hasCallback)
      NativeBridge.callbacks[callbackId] = callback;
    var iframe = document.createElement("IFRAME");
    iframe.setAttribute("src", "js-frame:" + functionName+":"+callbackId);
    document.documentElement.appendChild(iframe);
    iframe.parentNode.removeChild(iframe);
    iframe = null;
  },
  saveImage:function saveImage(imageData, fileName){
    var iframe = document.createElement("IFRAME");
    iframe.setAttribute("src", "saveimage:"+fileName+":"+imageData);
    document.documentElement.appendChild(iframe);
    iframe.parentNode.removeChild(iframe);
    iframe = null;
  },
  saveStatistic:function saveStatistic(statistcs){
    var iframe = document.createElement("IFRAME");
    iframe.setAttribute("src", "savestatistic:"+statistcs);
    document.documentElement.appendChild(iframe);
    iframe.parentNode.removeChild(iframe);
    iframe = null;
  },
  resultForCallback : function resultForCallback(callbackId,result) {
    try {
      var callback = NativeBridge.callbacks[callbackId];
      if (!callback) return;

      callback(result);
    } catch(e) {alert(e)}
  }
};


