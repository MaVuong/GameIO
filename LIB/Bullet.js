var Vector = require('./Vector');

function Bullet(player_id, bullet_id) {
    this.id = bullet_id;
    this.player_id = player_id;
    this.pos = {};
    this.moved_length = 0;
    this.r = 5;
    this.angle = 0;// radian
    this.speed = 400;//velocity
    this.isNew = true;
    this.opacity = 1;
    this.is_remove = false;
    this.zone_id = 0;
}

//set move direction: pos + angle (in degree)
Bullet.prototype.setMoveDirection = function (angle, begin_pos) {
    this.angle = (angle * 3.141592) / 180;
    this.pos = begin_pos;
}

//
Bullet.prototype.updatePosition = function (delta_time) {	

    if (this.is_remove) {return; }

    var delta_distance = delta_time * this.speed; //canh huyen
    this.moved_length = this.moved_length + delta_distance; //moved distance
    this.pos.x = Math.round(this.pos.x + delta_distance * Math.cos(this.angle));
    this.pos.y = Math.round(this.pos.y + delta_distance * Math.sin(this.angle));

    if (this.moved_length > 150) {
        var tile = this.moved_length - 150;
        this.opacity = 1 - tile * 0.01;
        if (this.opacity < 0) {
            this.opacity = 0;
        }
    }
    if (this.moved_length > 300) {
        this.is_remove = true;
	}
}


//check if collision happen, if yes, mark the bullet to remove
Bullet.prototype.checkCollisionWithObstacle = function (obstacle) {
    var dtX = Math.abs(this.pos.x - obstacle.x);
    var dtY = Math.abs(this.pos.y - obstacle.y);
    var kcW = obstacle.w / 2;
    var kcH = obstacle.h / 2;

    if (dtX < kcW && dtY < kcH) {
        this.is_remove = true;	
		
    }
}

//check if collision happen, return true or false
Bullet.prototype.checkCollisionWithTank = function (tank) {
    var dtX = Math.abs(this.pos.x - tank.pos.x);
    var dtY = Math.abs(this.pos.y - tank.pos.y);
    var kcW = tank.w / 2;
    var kcH = tank.h / 2;
    return (dtX < kcW && dtY < kcH);
}

//mark to remove if collide with map edge
Bullet.prototype.checkCollisionWithMapEdge = function () {
    if (this.pos.x < -1450 || this.pos.x > 1450 || this.pos.y < -950 || this.pos.y > 950) {
        this.is_remove = true;
		
    }

}

module.exports = Bullet;