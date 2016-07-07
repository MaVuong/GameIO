var Vector = require('./Vector');


function Explosion(x, y, id, tank_angle, gun_angle,tid) {
    this.id = id;
    this.tid=tid;
    this.pos = new Vector(x, y);
    this.gun_angle = gun_angle;
	this.tank_angle = tank_angle;
	this.zone_id = null;

	this.ex_type=0;// 
	// =0 mặc định là xe tank nổ khi bị die 
	// =1 là tiếng đạn va chạm vào tường
	// =2 là tiếng đạn va chạm vào xe tank
	// =3 là tiếng đạn bắn ra từ xe tank bắn ra 1 viên đạn
	// =4 là tiếng đạn bắn ra từ xe tank bắn ra 2 viên  
	// =5 --------------------------------------3 viên 
	// =6 --------------------------------------4 viên 
}


module.exports = Explosion;