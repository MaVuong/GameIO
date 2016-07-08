var Utils=require('./Utils');
var Player=require('./Player');

function AI(id) {
    Player.call(this, id); //inheritance
    this.count_step = 0;
    this.next_count_step = 0;
    this.is_shooted = false;
    this.shooter_id = null;
	this.last_fire = 0;
	this.type = -1;	
}


//inheritance
AI.prototype = Object.create(Player.prototype);
AI.prototype.constructor = AI;

//Constant
AI.SHOOTING_DURATION = 300;


AI.prototype.setBeginLevel = function () {
	
    this.level = (Math.random() < 0.3) ? (10 + Math.floor(Math.random() * 10) + 1) : (Math.floor(Math.random() * 10) + 1); //1-20
	this.max_hp = Player.getMaxHp(this.level);
	this.max_ammo = Player.getMaxAmmo(this.level);
    this.hp = this.max_hp - Math.floor(Math.random() * 50);	
    this.score = Player.getLevelScore(this.level) + Math.floor(Math.random() * 50);
	this.tank_moving_speed = Player.getMovingSpeed(this.level);
}

//change the direction of the AI after next_count_step
AI.prototype.updateState = function () {
    this.count_step = this.count_step + 1;

    if (this.next_count_step > 100) {
        if (this.count_step >= this.next_count_step) {
            this.next_count_step = 0;
            this.count_step = 0;

            var current_moving_direction = this.moving_direction % 2;
            this.moving_direction = Math.floor(Math.random() * 4) + 1;
            this.adjustMovingDirection();
            var new_moving_direction = this.moving_direction % 2;
            if (current_moving_direction == new_moving_direction) {
                this.moving_direction = Math.floor(Math.random() * 4) + 1;
                this.adjustMovingDirection();
            }
        }
    } else {
        this.next_count_step = Math.floor(Math.random() * 300) + 100;
    }

}

//(zone_tank_arr, zoneIdArr, arr_Obs_arround);
//shoot closest tank
AI.prototype.shootClosestTank = function (tank_arr, obstacle_arr) {

    var min_distance = 300;
    var target = null;
    
        for (var j = 0; j < tank_arr.length; j++) {
            var tank = tank_arr[j];//get tank

            if (this.id !== tank.id) {

                //get distance
                var distance = Utils.distace2Object(this.pos, tank.pos);
                //console.log('this '+ this.numberID+ ' closest ' + tank.numberID +' '+distance);
                if (distance < min_distance) {
                    //check if there is obstacle between this boot and the tank
                    var intersect = false;
                    var k = 0;

                    while (k < obstacle_arr.length && !intersect) {
                        if (Utils.lineRectIntersec(this.pos.x, this.pos.y, tank.pos.x, tank.pos.y,
                                obstacle_arr[k].x, obstacle_arr[k].y, obstacle_arr[k].w, obstacle_arr[k].h)) {
                            intersect = true;
                        }
                        k++;
                    }

                    if (!intersect) {
                        min_distance = distance;
                        target = tank;
                    }
                }

            }

    }
    if (target !== null && min_distance < 100) {        
        this.shootTarget(target);
    }

}

AI.prototype.shootTarget = function (target) {

    var source_pos = this.pos;
    var target_pos = target.pos;
    var angle = Utils.calcAngle(source_pos, target_pos);
    this.changeGunAngle(angle);
}


module.exports = AI;