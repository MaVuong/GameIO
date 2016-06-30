var Vector = require('./Vector');

//type=1: ammo, type=2: hp
function Item(x, y, id, type) {
	
    this.id = id;
    this.pos = new Vector(x, y);
	this.zone_id = null;	
	this.type = type;
	this.value = (type ===2)? 10 + 30*Math.random() : 30 + 40*Math.random();
	this.life_time = 0;
}

Item.MAX_LIFE_TIME = 500; //250 frame = 10s

module.exports = Item;