var Vector = require('./Vector');


function Explosion(x, y, id, tank_angle, gun_angle) {
    this.id = id;
    this.pos = new Vector(x, y);
    this.gun_angle = gun_angle;
	this.tank_angle = tank_angle;
	this.zone_id = null;	
}


module.exports = Explosion;