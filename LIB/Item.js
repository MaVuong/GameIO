var Vector = require('./Vector');
var Utils = require('./Utils');
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
    this.speed = 25;//velocity
	this.is_moving = true;
	this.is_remove = false;
}


Item.prototype.updatePosition = function (delta_time) {	
	if (this.is_moving){
		
		this.pos.update(this.angle, delta_time, this.speed);
		
		var left_distance = this.pos.getDistance(this.final_pos);
		if (left_distance < this.speed){
			this.pos.x = this.final_pos.x;
			this.pos.y = this.final_pos.y;
			this.is_moving = false;
		}
	} else {
		if (this.life_time++ > Item.MAX_LIFE_TIME){
			this.is_remove = true;
		}
	}	
}



Item.MAX_LIFE_TIME = 500; //250 frame = 10s

module.exports = Item;