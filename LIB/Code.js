function Code() {
    this.key1 = "";
    this.key2 = "";
    this.life = 10;
}

Code.prototype.endcodeiOS = function () {
    var charendcode1 = 'TanhPhoXBuonZLamTWoVuongConHiChieLanhBUWotEMdeMThPbuonXNamNghWeKhoiDDtoaNWZguoiLuaThWuaChimDuoiSuongHHNu=BeZsxTronCharguODuigTieChiddChAhLTheTiengDyDhQuyeNbDDIK'
    var charendcode2 = 'TOshrRaDDaXaDbgaZKeTuDZemPaohDoRuoiDnongAnhDugMinhFAhdYeuDhhXuaChniConRAntHanFDangQyacSaTahKizhSuWzyACDLonDntCaoDBuaNodChiDoiAVsaiDbgAdKnCabgiiAymOGSXanhMauDemA'
    var charendcode3 = 'CdaoLAnhNagxyaAnhDemRaDOtthNATorTancHOdnGyoiXuaKhoisdKHinguDTDanAochoDDKhiNuaDoxxaLunfSangEnJgoiNhjkeChuHNgayXuaEsoiHExtRoixHeTDchAngCohDchiDnaUdAuEmJyeuFkNhu'

    var charClient1 = "Q2Rhb0xBbmhOYWd4eWFBbmhEZW1SYURPdHRoTkFUb3JUYW5jSE9kbkd5GlEb2lBVnNhaURiZ0FkS25DYWJnaWlBeW1PR1NYYW5oTWF1RGVtb2lYdWFLaveHhhTHVuZlNhbmdFbkpnb2lOaGprZUNodUhOZ2F5WHVhRXNvaUhFe";
    var charClient2 = "VE9zaHJSYUREYVhhRGJnYVpLZVR1RFplbVBhb2hEb1J1b2lEbm9uZ0FuaER1Z0G9pQ0NzZEtIaW5ndURURGFuQW9jaG9EREtoaU51YUR1pbmhGQWhkWWV1RGhoWHVhQ2huaUNvblJBbnRIYW5GRGFuZ1F5YWNTYVRhaEtpemoP";
    var random1 = "IOGAME" + Math.random();
    var stt = Math.floor(Math.random() * 156);

    if (stt > 156) {
        console.log("-----------------------LOI ROI ----chiso code ma hoa:" + stt);
        stt = 150;
    } else if (stt < 0) {
        stt = 20;
    }

    var kitu = new Buffer(random1).toString('base64');
    var mh1 = charendcode1.substring(stt, stt + 3) + charendcode2.substring(stt, stt + 3) + charendcode3.substring(stt, stt + 3) + kitu;
    this.key1 = new Buffer(mh1).toString('base64');

    var crypto = require('crypto');
    var hkeyx2 = charClient1.substring(stt, stt + 4) + this.key1 + charClient2.substring(stt, stt + 4);
    //console.log("hkeyx2: "+hkeyx2);
    this.key2 = crypto.createHash('md5').update(hkeyx2).digest("hex");


}
Code.prototype.updateTime = function () {
    this.life = this.life - 0.5;
}
Code.prototype.endcodeAndroid = function () {
}
module.exports = Code;