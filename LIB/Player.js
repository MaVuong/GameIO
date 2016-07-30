var Vector = require('./Vector');
var Utils = require('./Utils');

function Player(id) {
    this.id = id;   
    this.pos = new Vector(0, 0);
    this.w = 25;
    this.h = 22;	
    this.name = "USR_" + id;        
    this.name = "";
    
    this.room_id = null;
    this.zone_id = 0;
	this.death_life = 0;
    this.type = 1;// 1 la player binh thuong, -1 la Boot
	this.setBasicParams();
}


Player.prototype.setBasicParams =function(){
	this.score = Player.BEGIN_SCORE;
    this.level = 40;
    
	this.ammo = Player.BEGIN_AMMO;
    this.max_ammo = Player.BEGIN_AMMO;		
	
	this.hp = Player.BEGIN_HP;
    this.max_hp = Player.BEGIN_HP;
    
    var random_direction = Math.floor(Math.random() * 4) + 1; //1-4
    
	this.tank_moving_speed = Player.getMovingSpeed(this.level);
    
	this.tank_angle = 0;
    this.tank_angle_to_rotate = 0; //angle to rotate to
    this.tank_rotating_status = 0; //not rotating, > 0 in rotating; 1 anticlockwise; 2: clockwise
    this.moving_direction = random_direction; //move status 1, 2, 3,4
    
	this.tank_rotating_speed = 320;

    //current angle of the gun: 0, 90, 180, 270
    this.gun_angle = random_direction * 90 - 90;

    //the angle need to rotate to before shooting; > 0 rotate anticlockwise ; < 0: clockwise
    this.gun_angle_to_rotate = 0;

    /*
     * gun_rotating_status = -1: don't  rotate; =0 finishing rotate, not yet shoot;
     * =1 in anticlockwise rotating; =2 in clockwise rotating
     */
    this.gun_rotating_status = -1;
    this.gun_rotating_speed = 450;

    this.pack_bullet = [];
    this.pack_player = [];
    this.pack_item = [];
    this.pack_obs = [];

    this.type = 1;// 1 la player binh thuong, -1 la Boot

    this.is_collided = false;
    this.is_collidedWithOtherTank = false;
	this.is_remove = false;
    
	this.count = 0;

    this.dtmove=0;
    this.isFire=false;

    this.time_cout_update=18;// chi trong gioi han 0-20;

    this.count_skip=0;
    this.update_step=false;

    this.isStopMove=true;

    var arrcode=["ad","af","bh","ca","cn","jp","kr","dz","es","fr","gb","hk","vi","ru","us","us","th","tw","vn","tk","us"];
    var lenght=arrcode.length;
    var rid=parseInt(Math.random()*lenght);
    this.ccode=arrcode[rid];
}


Player.prototype.reset = function (x, y) {
    this.pos.x = x;
    this.pos.y = y;
	this.setBasicParams();
}


Player.MAX_LEVEL = 80;
Player.DELTA_HP_REDUCED_BE_SHOOTED = 16;//when shooted
Player.BEGIN_HP = 8000;
Player.BEGIN_AMMO = 140;
Player.BEGIN_SCORE = 0;
Player.BEGIN_TANK_SPEED = 50;

//min score for the level
Player.getLevelScore = function (level) {	
    var delta_level = Math.ceil(level/5)*50;		
	var level_score = delta_level* ((level-1)%5); //last round
	var length = Math.floor(level/5)
	for (var i=1; i<=length; i++){
		level_score+= 4*(i*50) + (i +1)*50;
	}		
    return level_score;	
}
	
	//return level_score;

//0 50 100 150 200 300  350--> 

Player.getMovingSpeed =function(level){
	if (level <= 10){
		return Player.BEGIN_TANK_SPEED +((level-1)%10);
	} else if (level <= 30){
		return Player.BEGIN_TANK_SPEED + 9 + (level-10)*0.5;
	} else if (level <= 70){
		return Player.BEGIN_TANK_SPEED + 19+ (level-30)*0.25;
	}
}

//awarded score when shoot on target
Player.getAwarededScore = function (level, isLastOne) {
    if (isLastOne){
        return 5 + level * 10;
    } else {
        return 3;
    }
}   

Player.getMaxHp = function (level){
    return 80 +(level-1)*15;
}

Player.getMaxAmmo = function (level){
    return 140 +(level-1)*20;
}

//level 1-9 shoot 1 bullet, 10 -34: 2 bullet; 35 -79 shoot 3 bullet; 80 shoot 4 bullet
Player.getShootingStrength = function (level){ 
    return (level < 10)? 1 : (level < 35)? 2 : (level < 80)? 3 : 4; 
}




/*
 * Received the target angle, set the gun_angle_to_rotate and set gun_rotating status
 */
Player.prototype.changeGunAngle = function (target_angle) {

    //ensure 0 <= gun_angle  <= 360
    if (Math.abs(this.gun_angle) > 360) {
        this.gun_angle = this.gun_angle % 360;
    }

    this.gun_angle = Math.round(this.gun_angle);
    if (this.gun_angle < 0) {
        this.gun_angle = this.gun_angle + 360;
    }

    // gun_angle_to_rotate always < 180; + anticlockwise; - clockwise
    //set the smallest angle to rotate
    var delta_angle = this.gun_angle - target_angle;
    if (delta_angle > 0) {
        this.gun_angle_to_rotate = (Math.abs(delta_angle) > 180) ? 360 - Math.abs(delta_angle) : -Math.abs(delta_angle);
    } else {
        this.gun_angle_to_rotate = (Math.abs(delta_angle) > 180) ? Math.abs(delta_angle) - 360 : Math.abs(delta_angle);
    }

    //this.gun_rotating_status = 1 (anticlockwise); =2 clockwise
    this.gun_rotating_status = (this.gun_angle_to_rotate > 0) ? 1 : 2;
    
    if (Math.abs(this.gun_angle_to_rotate) < 5) { //too small
        this.gun_angle = target_angle; //set gun angle to target angle
        this.gun_rotating_status = 0;  //mark as finish rotating gun

    }
}

/*
 * Update the gun_angle and mark as fire if finish rotating
 */
Player.prototype.updateGunAngleAndStartingFire = function (delta_time) {
    if (this.gun_rotating_status < 0) { //don't rotate and don't fire
        return 0;
    }

    /*
    if (Math.abs(this.gun_angle) > 270) {
        console.log("Error: gun_angle is larger than 270 "+ this.gun_angle);
    }*/

    //update the gun_angle, gun_angle_to_rotate, gun_rotating_status each step
    if (this.gun_rotating_status > 0) { //in rotating
        var delta_angle = Math.round(this.gun_rotating_speed * delta_time);

        if (this.gun_rotating_status == 1) {//anticlockwise
            var left_angle_to_rotate = this.gun_angle_to_rotate - delta_angle;
            if (left_angle_to_rotate < 0) {
                this.gun_angle = this.gun_angle + this.gun_angle_to_rotate; //set to final angle
                this.gun_angle_to_rotate = 0;
                this.gun_rotating_status = 0;// mark to starting fire
            } else {
                this.gun_angle_to_rotate = left_angle_to_rotate; //left angle to rotate
                this.gun_angle = this.gun_angle + delta_angle; //current angle
            }
        } else { //clockwise (gun_angle_to_rotate <0)
            var left_angle_to_rotate = this.gun_angle_to_rotate + delta_angle;
            if (left_angle_to_rotate > 0) {//stop rotating
                this.gun_angle = this.gun_angle + this.gun_angle_to_rotate; //current angle
                this.gun_angle_to_rotate = 0; //stop rotate
                this.gun_rotating_status = 0;// fire
            } else { //continute to rotating
                this.gun_angle_to_rotate = left_angle_to_rotate; //
                this.gun_angle = this.gun_angle - delta_angle;
            }
        }

    }


    if (this.gun_rotating_status == 0) { //=0 fire, =-1 do nothing, =1, 2 continute to rotate in anti and clockwise
        this.gun_rotating_status = -1;
		if (this.type === -1){
			this.last_fire = Date.now();
		}		
        return 1; //indicate starting fire
    } else {
        return 0; //do nothing
    }

}

/*
 * Receive direction signal from client, set the  moving_direction and tank_angle_to_rotate
 */
Player.prototype.setNewDirection = function (new_direction) {
    if (Math.round(this.tank_angle_to_rotate) !== 0) { //in rotating --> do nothing
        return;
    }

    //not same axis --> identify angle to rotating
    if (this.moving_direction % 2 !== new_direction % 2) {
        if (this.moving_direction === 1) {//0
            this.tank_angle_to_rotate = (new_direction === 2) ? 90 : -90;
        } else if (this.moving_direction === 2) {//90
            this.tank_angle_to_rotate = (new_direction === 3) ? 90 : -90;
        } else if (this.moving_direction === 3) {//180
            this.tank_angle_to_rotate = (new_direction === 2) ? -90 : 90;
        } else if (this.moving_direction === 4) {//270
            this.tank_angle_to_rotate = (new_direction === 3) ? -90 : 90;
        }
        this.tank_rotating_status = 2;  //mark as in rotating
    }

    //set new direction
    this.moving_direction = new_direction;


}

/*
 * Update tank angle for each step
 * then update position of the tank
 */

Player.prototype.updatePosition = function (delta_time) {   
    this.count_skip=this.count_skip+1; 
    if (this.count_skip>3) {
        this.count_skip=0;
        this.update_step=true;
    }else{
        this.update_step=false;
    }

    if (this.tank_angle_to_rotate > 0) { // anticlockwise
        var delta_angle = Math.round(delta_time * this.tank_rotating_speed); // angle has rotated in one frame
        //var tmp_angle=this.tank_angle_to_rotate;
        this.tank_angle_to_rotate = this.tank_angle_to_rotate - delta_angle; //angle left to final position
        if (this.tank_angle_to_rotate < 5) { //< 5 stop rotate
            this.tank_angle_to_rotate = 0;   //reset angle rotate
            this.tank_rotating_status = 0;      //don' rotate
           // this.gun_angle=this.gun_angle+tmp_angle;
        } else {
            this.tank_angle = this.tank_angle + delta_angle; //current angle of tank
           // this.gun_angle=this.gun_angle+delta_angle;// nong sung cung quay 1 goc giong xe tank
        }
    } else if (this.tank_angle_to_rotate < 0) { //clockwise
        var delta_angle = Math.round(delta_time * this.tank_rotating_speed);
        //var lastTG = this.tank_angle_to_rotate;
        //var tmp_angle=this.tank_angle_to_rotate;
        this.tank_angle_to_rotate = this.tank_angle_to_rotate + delta_angle;
        if (this.tank_angle_to_rotate > -5) {
            this.tank_rotating_status = 0;
            this.tank_angle_to_rotate = 0;
            //this.gun_angle=this.gun_angle+tmp_angle;// la cong boi vi tmp_angle=this.tank_angle_to_rotate la so am
        } else {
            this.tank_angle = this.tank_angle - delta_angle; //current angle of tank
            //this.gun_angle=this.gun_angle-delta_angle;// nong sung cung quay 1 goc giong xe tank
        }
    }


    if (this.tank_rotating_status > 0) {  //need to stop rotate before moving
        this.isStopMove=true;
        return;
    }

    //console.log(this.moving_direction +'|' + this.pos.x + ' before update position '+this.pos.y);
    this.isStopMove=false;
	this.dtmove=this.tank_moving_speed * delta_time;

		//need to find reason why x/y was converted to string
		if (typeof(this.pos.x) === "string"){
			this.pos.x = Number(this.pos.x);
		}
		
		if (typeof(this.pos.y) === "string"){
			this.pos.y = Number(this.pos.y);
		}
	
	
    if (this.moving_direction === 1) { //x-axis forward
        this.pos.x += Number(this.tank_moving_speed * delta_time);
        this.tank_angle = 0;
    }
    else if (this.moving_direction === 2) //y-axis forward
    {
        this.pos.y += Number(this.tank_moving_speed * delta_time);
        this.tank_angle = 90;
    }
    else if (this.moving_direction === 3) //x-axis backward
    {
        this.pos.x -= Number(this.tank_moving_speed * delta_time);
        this.tank_angle = 0;
    }
    else if (this.moving_direction === 4) //y-axis backward
    {
        this.pos.y -= Number(this.tank_moving_speed * delta_time);
        this.tank_angle = 90;
    }
	
}

//collision happen, adjust the position
Player.prototype.adjustPosition = function (distance_to_adjust) {
    //console.log(this.moving_direction +'|' + distance_to_adjust);

    if (this.tank_rotating_status > 0) { //in rotating ==> do nothing
        return;
    }
    this.dtmove=0;
    if (this.moving_direction === 1) { //x-asis forward
        this.pos.x -= distance_to_adjust;
    }
    else if (this.moving_direction === 2) {
        this.pos.y -= distance_to_adjust; //y-asis forward
    }
    else if (this.moving_direction === 3) { //x-asis backward
        this.pos.x += distance_to_adjust;
    }
    else if (this.moving_direction === 4) { //y-asis backward
        this.pos.y += distance_to_adjust;
    }


}

/*
 * Verify if tank collided with Map edge
 * If yes, adjust the position and change direction
 */
Player.prototype.checkCollisionWithMapEdge = function () {
    this.is_collided = false;
    if (this.pos.x < -1465) {
        this.pos.x = -1465;
        this.is_collided = true;
    } else if (this.pos.x > 1465) {
        this.pos.x = 1465;
        this.is_collided = true;
    }

    if (this.pos.y < -965) {
        this.pos.y = -965;
        this.is_collided = true;
    } else if (this.pos.y > 965) {
        this.pos.y = 965;
        this.is_collided = true;
    }
    if (this.is_collided) {
        this.dtmove=0;
    }
    if (this.is_collided&&this.type === -1) {// only boot
        this.changeDirection();
    }
	
	var collided = this.is_collided;
    if(this.is_collided){
        this.isStopMove=true;
    }
	this.is_collided = false;
	
	return collided;
	
}

/*
 * change direction of the tank
 */
Player.prototype.changeDirection = function () {

    this.moving_direction += (Math.random() >= 0.5) ? 1 : -1;
    this.adjustMovingDirection();
}


Player.prototype.adjustMovingDirection = function () {
    if (this.moving_direction < 1) {
        this.moving_direction = 4;
    }

    if (this.moving_direction > 4) {
        this.moving_direction = 1;
    }

}

//check if collision happen, if yes, adjust the position and change the direction
Player.prototype.checkCollisionWithObstacle = function (obstacle) {
    
    var dtX = Math.abs(this.pos.x - obstacle.x);
    var dtY = Math.abs(this.pos.y - obstacle.y);
    var kcW = this.w / 2 + obstacle.w / 2;
    var kcH = this.h / 2 + obstacle.h / 2;  
    
    
    if (dtX < kcW && dtY < kcH) {
        //console.log(this.pos.x + ' after update position, before adjust '+this.pos.y);
        if (typeof(this.moving_direction) === "string") {
            this.moving_direction = parseInt(this.moving_direction);
        }
        var overlapDistance = (this.moving_direction % 2 === 1) ? kcW - dtX : kcH - dtY;
        
        this.adjustPosition(overlapDistance);
        
        //console.log(this.pos.x + ' after adjust'+this.pos.y);
        //only boot automatically change direction 
        if (this.type === -1){
            this.changeDirection(); 
        }
        this.isStopMove=true;
		return true;
    }
	return false;
}

//check if collision with other tank happen, if yes, adjust position, change direction and
// return true, otherwise return 0
Player.prototype.checkCollisionWithOtherTank = function (tank) {
    var dtX = Math.abs(this.pos.x - tank.pos.x);
    var dtY = Math.abs(this.pos.y - tank.pos.y);
    var kcW = this.w / 2 + tank.w / 2;
    var kcH = this.h / 2 + tank.h / 2;
    if (dtX < kcW && dtY < kcH) {
        //var overlapDistance = (this.moving_direction % 2 === 1) ? kcW - dtX : kcH - dtY;
        //this.adjustPosition(overlapDistance);
        
        //only boot automatically change direction 
        if (this.type === -1){
            this.changeDirection();
        }   
        return true;
    } else {
        return false;
    }
}



Player.prototype.reduceHp = function (delta_hp) {
    this.hp = Number(this.hp) - Number(delta_hp);
    this.is_remove = (this.hp <= 0);
	
}




//if the is_remove === true ==> do nothing as the tank was died
// if hp > 0 && hp - delta_hp <  0 ==> last bullet
// if hp > 0 && hp - delta_hp >  0 ==> normal bullet
Player.prototype.beShooted = function (shooter_id) {
    this.reduceHp(Player.DELTA_HP_REDUCED_BE_SHOOTED);
    if (shooter_id !== null){
        this.is_shooted = true;
        this.shooter_id = shooter_id;
    }   
    return (this.hp <= 0) ? true : false;   
}

Player.prototype.fireOnTarget = function (level, is_last_bullet) {
    //increase the score
    this.score += Player.getAwarededScore(level, is_last_bullet);   
	if (this.type === 1){ //only adjust level of real user
		this.adjustLevel();	
	}
    
}

//check if the new score enough to gain new level
Player.prototype.adjustLevel = function () {
	
    if (this.score > Player.getLevelScore(this.level+1)){
        //if yes, adjust
        this.level++;
        this.max_ammo = Player.getMaxAmmo(this.level);
        this.max_hp = Player.getMaxHp(this.level);
		this.tank_moving_speed = Player.getMovingSpeed(this.level);
    }
}



Player.prototype.checkItem = function (item) {
	
	
    if (Utils.distace2Object(item.pos, this.pos) < 50 && !item.is_moving){		
        item.is_remove = true;
        if (item.type === 1 && this.ammo < this.max_ammo){
            this.ammo = (this.ammo + item.value < this.max_ammo) ? this.ammo + item.value : this.max_ammo;
        }
        
        if (item.type === 2 && this.hp < this.max_hp){
            this.hp = (this.hp + item.value < this.max_hp) ? this.hp + item.value : this.max_hp;            
        }
					
    }   
}



//get all tanks around one tank to send to client
Player.prototype.updateAllTanksAroundMe = function(full_tank_list){
    this.time_cout_update=this.time_cout_update+1;
    var send_full_infomation=false;
    if (this.time_cout_update>=10) {
        send_full_infomation=true;
        this.time_cout_update=0;
    }
    console.log("this.time_cout_update: %s",this.time_cout_update);
    this.pack_player =[];
    var tank_arr = Utils.getAllObjectsAroundMe(this.zone_id, full_tank_list);
    for (var i=0; i < tank_arr.length; i++){
        var tank = tank_arr[i];
        //don't send information as this tank is in collision
        var dt_x_c=Math.abs(Number(tank.pos.x)-this.pos.x);
        var dt_y_c=Math.abs(Number(tank.pos.y)-this.pos.y);
        if (dt_x_c<300&&dt_y_c<200) {//gioi han chi la 600x400 tren man hinh thuong va retina la 1200x800

            var dirMV=tank.moving_direction;
            if(tank.tank_rotating_status>0||tank.isStopMove){
                dirMV=0;
            }
            dirMV=parseInt(dirMV);

            var t_xpos=Number(tank.pos.x+2000).toFixed(1);
            var t_ypos=Number(tank.pos.y+2000).toFixed(1);
            t_xpos=t_xpos*10;
            t_xpos=Number(t_xpos).toFixed(0);
            t_ypos=t_ypos*10;
            var Psend=t_xpos*100000+t_ypos;
            Psend=parseInt(Psend);

            //---------------Gun + tank Angle
            var t_a=Number(tank.tank_angle);
            var g_a=Number(tank.gun_angle);
            if (t_a<0) {
                t_a=t_a+360;
            }else if (t_a>=360) {
                t_a=t_a-360;
            }

            if (g_a<0) {
                g_a=g_a+360;
            }else if(g_a>=360){
                g_a=g_a-360;
            }
            t_a=parseInt(t_a);
            g_a=parseInt(g_a);
            var r_g_t=t_a*1000+g_a;
            if(dirMV>0){
                dirMV=dirMV*1000000;
                r_g_t=r_g_t+dirMV;
            }

            //------------Hp+Ammo
            var h_p=tank.hp;
            var m_mo=tank.ammo;
            if (h_p<0) {
                h_p=0;
            }
            if (m_mo<0) {
                m_mo=0;
            }
            m_mo=parseInt(m_mo);
            h_p=parseInt(h_p);
            var e_hp_ammo=(h_p*10000)+m_mo;



            //-------------score+level
            var s_send=parseInt(tank.score);
            var lv_s=parseInt(tank.level);
            lv_s=lv_s*1000000+s_send;




            var objx={
                p: Psend,
                i: parseInt(tank.id),// bao gom ca so am lan so duong
                s: lv_s,
                e:e_hp_ammo,
                r:r_g_t,
                m:parseInt(tank.tank_moving_speed)
            };
            if (send_full_infomation) {
                

                var name=tank.name;
                if(name.trim().length<1){
                    name="Guest"+Math.abs(parseInt(tank.id));
                }
                objx.n=name+"";
                objx.c=tank.ccode;
            }
            this.pack_player.push(objx);
        }
        /*

        this.pack_player.push({
            x: Number(tank.pos.x).toFixed(2) + "",
            y: Number(tank.pos.y).toFixed(2) + "",
            id: tank.id + "",
            r: Number(tank.tank_angle).toFixed(2) + "",
            //typeTank:player_tmp.typeTank,
            lbdisplay: tank.lbdisplay,
            level: tank.level + "",
            score: tank.score + "",
            hp: tank.hp + "",
            dir:dirMV,
            ammo: tank.ammo+"",
            sp: this.tank_moving_speed+"",
            gR: tank.gun_angle + ""
        });
        */
    }
     
    
}


Player.prototype.updateAllObstaclesAroundMe = function(full_obstacle_list){
    this.pack_obs = [];
    var obstacle_arr =  Utils.getAllObjectsAroundMe(this.zone_id, full_obstacle_list);
    
    for (var i=0; i < obstacle_arr.length; i++){
        var obstacle = obstacle_arr[i];

        var dt_x_c=Math.abs(Number(obstacle.x)-this.pos.x);
        var dt_y_c=Math.abs(Number(obstacle.y)-this.pos.y);
        if (dt_x_c<400&&dt_y_c<300) {
            var t_xpos=Number(obstacle.x);
            var t_ypos=Number(obstacle.y);
            t_xpos=Number(t_xpos+2000).toFixed(0);
            t_ypos=Number(t_ypos+2000).toFixed(0);

            t_xpos=t_xpos*10;
            t_ypos=t_ypos*10;
            var Psend=t_xpos*100000+t_ypos;

            var w_f=Number(obstacle.w).toFixed(0);
            var h_f=Number(obstacle.h).toFixed(0);
            var w_h=Number(w_f)*1000+Number(h_f);

            var strid=obstacle.id.replace("obj","");
            var numid=Number(strid);
            numid=numid*1000000+w_h;
            this.pack_obs.push({
                p: Psend,
                o:numid
            });
        }

        //if (Utils.distace2Object(this.pos, obstacle) < 400) {
        //    var strid=obstacle.id.replace("obj","");
        //    this.pack_obs.push({
        //        x: obstacle.x,
        //        y: obstacle.y,
        //        w: obstacle.w,
        //        h: obstacle.h,
        //        id: strid
        //    });
        //}


    }
     
}


Player.prototype.updateAllBulletsAroundMe = function(full_bullet_list){
    var bullet_arr =  Utils.getAllObjectsAroundMe(this.zone_id, full_bullet_list);
    //console.log('around me '+ JSON.stringify(bullet_arr));
    this.pack_bullet = [];
    for (var i=0; i < bullet_arr.length; i++){
        var bullet = bullet_arr[i];

        var dt_x_c=Math.abs(Number(bullet.pos.x)-this.pos.x);
        var dt_y_c=Math.abs(Number(bullet.pos.y)-this.pos.y);

        if (dt_x_c<300&&dt_y_c<200) {
            var t_xpos=Number(bullet.pos.x);
            var t_ypos=Number(bullet.pos.y);
            t_xpos=Number(t_xpos+2000).toFixed(0);
            t_ypos=Number(t_ypos+2000).toFixed(0);

            t_xpos=t_xpos*10;
            t_ypos=t_ypos*10;
            var Psend=t_xpos*100000+t_ypos;

            var idbullet=parseInt(bullet.id);// chi gioi han tu 1-1000 xem Room dong 778

            var bullet_angle=parseInt(bullet.degreeAngle);
            bullet_angle=bullet_angle*100000;// max=36000000
            bullet_angle=bullet_angle+idbullet;
            this.pack_bullet.push({
                p:Psend,
                i:bullet_angle
            });

        }



        //this.pack_bullet.push({
        //    x: parseInt(bullet.pos.x),
        //    y: parseInt(bullet.pos.y),
        //    // opp: bullet.opacity,
        //    ag:parseInt(bullet.degreeAngle),
        //    id: bullet.id
        //});


    }
}


Player.prototype.updateAllExplosionsAroundMe = function(full_explosion_list, count_frame){
    var explosion_arr =  Utils.getAllObjectsAroundMe(this.zone_id, full_explosion_list);
    if (count_frame % 2 === 0){
		this.pack_explosion = [];	
	}
	
    for (var i=0; i < explosion_arr.length; i++){
        var explosion = explosion_arr[i];

        var dt_x_c=Math.abs(Number(explosion.pos.x)-this.pos.x);
        var dt_y_c=Math.abs(Number(explosion.pos.y)-this.pos.y);

        if (dt_x_c<300&&dt_y_c<200) {
            var t_xpos=Number(explosion.pos.x);
            var t_ypos=Number(explosion.pos.y);
            t_xpos=Number(t_xpos+2000).toFixed(0);
            t_ypos=Number(t_ypos+2000).toFixed(0);

            t_xpos=t_xpos*10;
            t_ypos=t_ypos*10;
            var Psend=t_xpos*100000+t_ypos;



            this.pack_explosion.push({
                p:Psend,
                t:explosion.tid,// tank id
                e: explosion.ex_type
            });

        }
        
    }
    
}

Player.prototype.updateAllItemsAroundMe = function(full_item_list){
    var item_arr =  Utils.getAllObjectsAroundMe(this.zone_id, full_item_list);
    this.pack_item = [];

    //var objitem_test={};
    //objitem_test.id=3;
    //objitem_test.pos={};
    //objitem_test.pos.x=100;
    //objitem_test.pos.y=50;
    //objitem_test.type=2;
    //item_arr=[objitem_test];

    for (var i=0; i < item_arr.length; i++){
        var item = item_arr[i];
        var t_xpos=Number(item.pos.x);
        var t_ypos=Number(item.pos.y);
        t_xpos=Number(t_xpos+2000).toFixed(0);
        t_ypos=Number(t_ypos+2000).toFixed(0);
        t_xpos=t_xpos*10;
        t_ypos=t_ypos*10;
        var Psend=t_xpos*100000+t_ypos;

        var id_it=parseInt(item.id);// id cua item chi tu 1-10000

        var type_it=parseInt(item.type);
        type_it=type_it*100000+id_it;

        this.pack_item.push({
            p:Psend,
            i:type_it
        });
    }

    //this.pack_item.push({
    //    id: 3,
    //    x: 100,
    //    y: 50,
    //    type:2
    //});

}

Player.prototype.resetPackArr = function(){
    this.pack_explosion = [];
    this.pack_bullet = [];
    this.pack_obs = [];
    this.pack_player = [];
    this.pack_item = [];
}

module.exports = Player;