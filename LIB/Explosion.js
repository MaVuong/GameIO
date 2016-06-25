var Vector = require('./Vector');


function Explosion(x, y, hp, id) {
    this.id = id;
    this.pos = new Vector(x, y);
    this.hp = hp;
    this.zone_id = null;
}


module.exports = Explosion;