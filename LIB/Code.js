function Code() {
    this.key1 = "";
    this.key2 = "";
    this.life = 10;
}

Code.prototype.endcodeiOS = function () {
    var crypto = require('crypto');
    var strRD = Math.floor(Math.random() * 156)+"AC";
    this.key1=crypto.createHash('md5').update(strRD).digest("hex");
    var end=this.key1.length*0.6;
    var begin=this.key1.length*0.1;
    this.key2=this.key1.substring(begin,end);
}
Code.prototype.JSEncode = function () {
    var crypto = require('crypto');
    var strRD = Math.floor(Math.random() * 156)+"AC";
    this.key1=crypto.createHash('md5').update(strRD).digest("hex");
    var end=this.key1.length*0.6;
    var begin=this.key1.length*0.1;
    this.key2=this.key1.substring(begin,end);
    
}

Code.prototype.updateTime = function () {
    this.life = this.life - 0.5;
}
Code.prototype.endcodeAndroid = function () {
}
module.exports = Code;