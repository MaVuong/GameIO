var Vector = require('./Vector');

//type=1: ammo, type=2: hp
function Item(x0, y0, x_final, y_final, angle, id, type) {
	
    this.id = id;
    this.pos = new Vector(x0, y0);
	this.final_pos = new Vector(x_final, y_final);	
	this.angle = angle;
	this.zone_id = null;	
	this.type = type;
	this.value = (type ===2)? 10 + 30*Math.random() : 30 + 40*Math.random(); //ammo: 30 -70, hp: 10 - 40
	this.life_time = 0;
    this.speed = 5;//velocity
	this.is_moving = true;
}

Item.MAX_LIFE_TIME = 500; //250 frame = 10s

module.exports = Item;