var AI = require('./AI');
var Player = require('./Player');
var Bullet = require('./Bullet');
var Vector = require('./Vector');
var Utils = require('./Utils');
var Explosion = require('./Explosion');
var Item = require('./Item');

function Room(id) {
    this.id = id;

    this.PLAYER_LIST = {}; //tank list
    this.count_player = 0;
	
	this.DEAD_PLAYER_LIST = {};
	
	
    this.EXPLOSION_LIST = {};
    this.count_explosion = 1;

    this.ITEM_LIST = {};
    this.count_item = 1;
    
    this.BULLET_LIST = {};
    this.count_bullet = 1;

    this.OBSTACLE_LIST = null;// list of obstacles
    this.FREE_ZONE_LIST = null; //list of free zones to generate random items
    
    this.ZONE_LIST = null;  //array of zones, each zone is an array of obstacles
    this.FREE_POSITION_LIST = null;   //free positions

    this.ai_id = -1; //starting id of ai
    this.ai_add_interval = 0;
    this.last_post_tank_added = null; //store last position the tank added

    this.count_real_user=0;
	this.count_boot=0;
	
	this.first_time_add_ai = true;
	
	this.all_tank_pack = [];
	this.best_players = [];
}

Room.MAX_HP_ITEMS = 20;
Room.MAX_AMMO_ITEMS = 20;
Room.ITEM_RADIUS = 50;
Room.MIN_DISTANCE_BETWEEN_PLAYERS = 150;
Room.MAX_PLAYER = 50;
Room.MAX_DEATH_LIFE = 50; //50 frames = 2 seconds before disconnected 



Room.prototype.loadMapAndAI = function () {
    fs = require('fs');
    var path = require('path');
    var fs = require('fs');
    var obj = JSON.parse(fs.readFileSync(path.join(__dirname, '../Map/mapgame2.json')));
    this.OBSTACLE_LIST = obj.mapObstacle;
    this.FREE_ZONE_LIST = obj.mapFreeRect; //free zone to gen items
    this.ZONE_LIST = obj.Unit; //array of zones, each zone is array of obs
    this.FREE_POSITION_LIST = obj.ArrFreePos;
    console.log("MAP %s IS LOADED-->", this.id);
}

Room.prototype.updateBestPlayers = function(){	
	this.best_players =[];
	var playerArr = []; //array of players to sorts
	for (var user_id in this.PLAYER_LIST){
		playerArr.push(this.PLAYER_LIST[user_id])
	}
	
	playerArr.sort(function(player1, player2) { return (player2.score - player1.score);});	
	
	var i= 0;
	var count = 0;
	while (i < playerArr.length && count < 5){		
		var player = this.PLAYER_LIST[playerArr[i].id];
		if ( player !== null){
            var sc_x=player.score;
            sc_x=Number(sc_x).toFixed(0);
            var name=player.name+"";
            if (name.length==0) {
                name="Guest"+Math.abs(player.id);
            }
			var player = {
				n:name,
				s:Number(sc_x)
			};			
			this.best_players.push(player);			
			count++;			
		};
		i++;
	}	
}

Room.prototype.updateTankMap = function() {
	this.all_tank_pack = [];
	for (var tank_id in this.PLAYER_LIST){
		var tank = this.PLAYER_LIST[tank_id];
		this.all_tank_pack.push({
			x:Number(tank.pos.x) ,
            y:Number(tank.pos.y)
		});
	}
}	

Room.prototype.updateFrameStep = function(delta_time, count_frame) {

    var zone_tank_arr = [];//array of zones, each zone is array of tanks
    var zone_bullet_arr = []; //array of zones, each zone is array of bullets    
    var zone_explosion_arr = [];//array of zones, each zone is array of explosions
    var zone_item_arr = [];//array of zones, each zone is array of items

    // init the array
    for (var i = 0; i < 100; i++) {
        zone_tank_arr.push([]); //zone_tank_arr[[],[],[] ....,[]]
        zone_bullet_arr.push([]);
        zone_item_arr.push([]);
        zone_explosion_arr.push([]);        
    }

    //delete all bullet are marked as is_remove from previous frame
    this.deleteObjectsFromPreviousStep(this.BULLET_LIST, false);

    //delete all tanks are marked as is_removed = true from previous frame
    this.deleteObjectsFromPreviousStep(this.PLAYER_LIST, true);  
	
	//delete all item are marked as is_removed = true from previous frame
    this.deleteObjectsFromPreviousStep(this.ITEM_LIST, false);
	
	
	
    //update all explosion around me, explosion is calculated from previous frame, need to delete before calculate new explosions
    this.updateExplosionsAroundTanks(zone_explosion_arr, count_frame);

    //reset to calculate new explosions
	this.EXPLOSION_LIST = [];
    zone_explosion_arr = [];	
    for (var i = 0; i < 100; i++) {
        zone_explosion_arr.push([]);
    }
   
    //update tank positions and push tanks into their right zones
    this.updateObjectPositionAndPushIntoRightZone(this.PLAYER_LIST, zone_tank_arr, delta_time);
    
    //update bullet position and push the bullet into the right zones
    this.updateObjectPositionAndPushIntoRightZone(this.BULLET_LIST, zone_bullet_arr, delta_time);

	//update item position and push the bullet into the right zones
    this.updateObjectPositionAndPushIntoRightZone(this.ITEM_LIST, zone_item_arr, delta_time);
	
    //check collision between Bullet-map, obstacles, tanks
    this.checkCollisionOfBullets(zone_tank_arr);

    //check collision between tanks, update the explosion list
    this.checkCollisionOfTanks(zone_tank_arr, zone_item_arr, count_frame);

    //this.updateItemsAroundTanks(zone_item_arr);

    this.updateObjectsAroundTanks(zone_tank_arr, zone_bullet_arr, zone_explosion_arr, zone_item_arr, count_frame);

	//increase death_life count of dead tanks
	this.increaseDeadTankCountTime();
	
    this.updateAi(zone_tank_arr); //change the direction if a number is reached

    this.updateAddingAi(delta_time);


    //update gun angle and fire when finish rotate the gun
    this.updateGunAngleAndFire(delta_time);
    
}


//return number of player including AI
Room.prototype.getPlayerNumber = function () {
    return (this.count_real_user + this.count_boot);
}

//return number of established sockets,i.e. real users
Room.prototype.getEstablishedSocket = function () {
	
    return (this.count_real_user);
}

Room.prototype.getDeadPlayerNumber = function(){
	return (Object.keys(this.DEAD_PLAYER_LIST).length);
}


Room.prototype.clearAll = function () {
    this.OBSTACLE_LIST = null;// Object chuong ngai vat
    this.FREE_ZONE_LIST = null;
    this.ZONE_LIST = null;
    this.FREE_POSITION_LIST = null;    
    this.last_post_tank_added = null;
}

/*
 * This function is for real user only, call when disconnect happen (die or user disconnect)
 */

Room.prototype.removePlayer = function (player_id) {
	var player = this.PLAYER_LIST[player_id];
	if (player === null){ //tank die --> already remove inside frame update
		return;
	}	
	//disconnected by user, have not die
	this.count_real_user--; 	
    delete this.PLAYER_LIST[player_id];
}


Room.prototype.addPlayer = function (player) {
    this.PLAYER_LIST[player.id] = player;
    //console.log("-----AddPlayer------------");    
    var free_pos = this.getFreePos();
    Utils.logObject(free_pos);// luu y: do luoi ve o client luon luon la boi so cua df_cell_draw_width=20 nen o day vi tri x,y cung phai la boi so cua 20
    player.pos.x = Number(free_pos.x);
    player.pos.y = Number(free_pos.y);

    //player.pos.x=0;
    //player.pos.y=0;

    this.last_post_tank_added = free_pos; //store last position the tank added
	this.count_real_user++;
    //console.log("-----Finish AddPlayer-------------");
    // se while cho den khi tim duoc vi tri thic hop, neu khong tim dc thi dat bien status da no ra khoi server
    // thang moi vao thi trong thoi gian 2s se dc bao ve va co hien tuong nhay nhay
    //console.log("----------------->rd: %s vi tri x=%s y=%s", rd, free_pos.x, free_pos.y);
}


Room.prototype.addingAi = function() {
    

    var player_number = this.getPlayerNumber();
    if (player_number > 40 || player_number == 0) {
        return;
    }
    
	var countAddAI = (this.first_time_add_ai) ? 10 : 0;	
	
	if (!this.first_time_add_ai){
		var available_slots = Room.MAX_PLAYER - (this.count_real_user + this.count_boot);
		
		if (available_slots > 0){
			var temp = Math.ceil(available_slots * Math.random());		
			countAddAI = temp < 10 ? temp : 10;			
		}	
	}

		
		for (var i_ad = 0; i_ad < countAddAI; i_ad++) {
			var pos = this.getFreePos();        
            this.ai_id= this.ai_id - 1;
            if (this.ai_id < -1000000) {
                this.ai_id = -1;
            }
            var ai = new AI(this.ai_id);            
            ai.pos.x = pos.x;
            ai.pos.y = pos.y;
            ai.setBeginLevel();
           // console.log("Add new AI :%s pos: %s , %s", this.ai_id, pos.x, pos.y);
            this.PLAYER_LIST[this.ai_id] = ai;
        this.count_boot++;
		}
	

    
}



Room.prototype.resetPlayer = function (player) {

    var free_pos_number = this.FREE_POSITION_LIST.length;
    var rd = Math.floor(Math.random() * free_pos_number); //get a random zoneId
    if (rd >= free_pos_number) { //can not happen ?
        console.log("loi roi oi lay random add player vao position m_free");
        rd = free_pos_number - 1;
    }

    var free_pos = this.FREE_POSITION_LIST[rd]; //free position
    Utils.logObject(free_pos);// luu y: do luoi ve o client luon luon la boi so cua df_cell_draw_width=20 nen o day vi tri x,y cung phai la boi so cua 20
    player.reset(Number(free_pos.x), Number(free_pos.y));
    this.last_post_tank_added = free_pos; //store last position the tank added
}


/*
 * update position: tank, AI, bullet
 * for (tank)
 * check collision with:
 * other tank/AI/Obtacles/map/ --> change direction (not the same)
 * bullet --> reduce,.../
 *
 * if tank ==> tank die
 */

Room.prototype.deleteObjectsFromPreviousStep = function(object_array, isTank) {
    var arrToDelete = [];
    var keys = Object.keys(object_array);
    for (var i = 0, l = keys.length; i < l; i++) {
        var key = keys[i];
        if (object_array[key].is_remove) {
            arrToDelete.push(object_array[key].id);
        }
    }
    for (var i = 0, l = arrToDelete.length; i < l; i++) {
        //if tank and real player ==> push into the deleted array, will be close socket later
        if (isTank) {
			if (arrToDelete[i] > 0) {             
				this.DEAD_PLAYER_LIST[arrToDelete[i]] = object_array[arrToDelete[i]];
				this.count_real_user--;				
			} else{
				this.count_boot--;
			} 
		}
			
        delete object_array[arrToDelete[i]]; //delete the object                        
    }
}

/*
* real player who still receive update after 2 seconds
*/
Room.prototype.deleteDeadPlayer = function() {
	
    var arrToDelete = [];
    var keys = Object.keys(this.DEAD_PLAYER_LIST);	
    for (var i = 0, l = keys.length; i < l; i++) {
        var key = keys[i];
        if (this.DEAD_PLAYER_LIST[key].death_life > Room.MAX_DEATH_LIFE) {
            arrToDelete.push(this.DEAD_PLAYER_LIST[key].id);				
        }
    }
	
    for (var i = 0, l = arrToDelete.length; i < l; i++) {		
        delete this.DEAD_PLAYER_LIST[arrToDelete[i]]; //delete the object                        
    }	
	return arrToDelete;
	
}

Room.prototype.updateObjectPositionAndPushIntoRightZone = function(object_arr, zone_object_arr, delta_time) {
    //update tank positions and push tanks into their right zones
    for (var key  in object_arr) {

        var obj = object_arr[key];
        //update position before push into right zone
        obj.updatePosition(delta_time);
        Utils.putObjectIntoRightZone(obj, obj.pos.x, obj.pos.y, zone_object_arr);

    }
}

Room.prototype.checkCollisionOfBullets = function (zone_tank_arr) {
    for (var key in this.BULLET_LIST) {
        var bullet = this.BULLET_LIST[key];

        //check collision with map edge
        var collision = bullet.checkCollisionWithMapEdge();


		if (!collision){ //only check if bullet has not collided
			//check collision with around obstacles
			var obstacle_arr = this.getAllObstaclesAroundMe(bullet.zone_id);
			for (var i = 0; i < obstacle_arr.length; i++) {
				collision = bullet.checkCollisionWithObstacle(obstacle_arr[i]);
				if (collision) {

					this.count_explosion++;                    
                    if(this.count_explosion>1000){
                        this.count_explosion=1;
                    }
                    var explosion = new Explosion(bullet.pos_contact.x, bullet.pos_contact.y, this.count_explosion, 0, 0,0);
                    explosion.ex_type=1;
                    this.EXPLOSION_LIST[explosion.id] = explosion;
                    break; //collision happen, stop check for collision with other obstacles
				}				
			}

			if (!collision){//only check if bullet has not collided
				
				//update collision with around tanks
				var tank_arr = this.getAllTanksAroundMe(bullet.zone_id, zone_tank_arr);
				for (var j = 0; j < tank_arr.length; j++) {
					var tank = tank_arr[j];
					if ((bullet.player_id !== tank.id) && bullet.checkCollisionWithTank(tank)) { //collision happen
						bullet.is_remove = true;

                        this.count_explosion++;
                        if(this.count_explosion>1000){
                            this.count_explosion=1;
                        }
                        var explosion_hit = new Explosion(bullet.pos_contact.x, bullet.pos_contact.y, this.count_explosion, 0, 0,tank.id);
                        explosion_hit.ex_type=2;
                        this.EXPLOSION_LIST[explosion_hit.id] = explosion_hit;
						
						if (!tank.is_remove){
							var is_last_bullet = tank.beShooted(shooter_id); // reduce hp, set the shooter
							
							if (is_last_bullet){ //generate items and make Explosion
							
							
								//generate item      
								var tank_arr_1 = this.getAllTanksAroundMe(tank.zone_id, zone_tank_arr);                 
								var obstacle_arr_1 = this.getAllObstaclesAroundMe(tank.zone_id);        
								this.generateItems(tank, tank_arr_1, obstacle_arr_1);   
								
								//make explosion
                                this.count_explosion++;
                                if(this.count_explosion>1000){
                                    this.count_explosion=1;
                                }
                                
                                var explosion = new Explosion(tank.pos.x, tank.pos.y, this.count_explosion, tank.tank_angle, tank.gun_angle,tank.id);
                                //list of explosion all over the map
                                this.EXPLOSION_LIST[explosion.id] = explosion;
							
						   }   
							
							var shooter_id = null;
							if (this.PLAYER_LIST.hasOwnProperty(bullet.player_id)) {
								var shooter = this.PLAYER_LIST[bullet.player_id];
								tank.shooter_id = shooter.id;
								shooter.fireOnTarget(tank.level, is_last_bullet); //award the shooter
							}                   
						}
						
						break; //stop check collision with other tanks
					}
				}

			}
		}

			
		}

}

/*
 * Generate items when a tank is killed
*/
Room.prototype.generateItems = function(tank, tank_arr, obstacle_arr){
    //return;
	//console.log('obstacle_arr '+JSON.stringify(obstacle_arr));
    for (i=0; i < tank.level; i++){		
		
        var pos = Utils.getRandomPoint(tank.pos.x, tank.pos.y, Room.ITEM_RADIUS, tank_arr, obstacle_arr);
		if (pos !== null){
			var type = (Math.random() < 0.5)? 1 : 2;
			this.count_item ++;
            if(this.count_item>10000){
                this.count_item=1;
            }
            var item = new Item(tank.pos.x, tank.pos.y, pos.x, pos.y, pos.angle, this.count_item, type);			
            this.ITEM_LIST[item.id] = item;			
        }
    }
}


Room.prototype.deleteOldItems = function(){
	var key_arr = Object.keys(this.ITEM_LIST);	
}

/*
 * random create items ammo :type=1,health:type=2; limit ammo_cout<40, limit hp_cout<20
*/
Room.prototype.generateRandomItems = function(){
    var count_ammo=0;
    var count_hp=0;
    for (var key_item in this.ITEM_LIST) {
        var current_item=this.ITEM_LIST[key_item];
        if (current_item.type===1) {
            count_ammo++;
        }else{
            count_hp++;
        }
    }
    var c=0;
    if (count_hp<20) {
        c++;
    }
    if (count_ammo<40) {
        c++;
    }
    var free_zone_cout=this.FREE_ZONE_LIST.length;
    for (var i = 0; i < c; i++) {// c min=1,max=2;
        this.count_item ++;
        if(this.count_item>10000){
            this.count_item=1;
        }
        var i_type=i+1;
        var random_index= Math.floor(Math.random() * free_zone_cout);
        var rect_tmp=this.FREE_ZONE_LIST[random_index];
        var acx=rect_tmp.x-rect_tmp.w/2;
        var acy=rect_tmp.y-rect_tmp.h/2;

        var xpos=Math.floor(Math.random() * rect_tmp.w);
        var ypos=Math.floor(Math.random() * rect_tmp.h);
        xpos=xpos+acx;
        ypos=ypos+acy;
        var itm_add=new  Item(xpos, ypos, this.count_item, i_type);
        //console.log('around me '+ JSON.stringify(bullet_arr));
        //console.log("add new item:(index:%s rect_tmp:%s %s %s %s) (%s %s %s  %s)",random_index,rect_tmp.x,rect_tmp.y,rect_tmp.w,rect_tmp.h,xpos, ypos, this.count_item, i_type);
        this.ITEM_LIST[itm_add.id] = itm_add;
    }
}

/*
 * check collision with other tanks,
 * result of this step is list of all explosion, explosion is putted into wright array
 * player is marked with isCollided and will be reduce the hp next frame
 */
Room.prototype.checkCollisionOfTanks = function(zone_tank_arr, zone_item_arr, count_frame){
    
    for (var tankid  in this.PLAYER_LIST) {// update thong tin xu ly cac xe tank
        var current_tank = this.PLAYER_LIST[tankid];

        //check collision with other tanks
        //if the tank is collided with other, don't further process
        // need to be revise later as this not deal with collision of multiple tanks
        if (!current_tank.is_collided_with_other_tank) {
           var tank_arr = this.getAllTanksAroundMe(current_tank.zone_id, zone_tank_arr);
            for (var i=0; i < tank_arr.length; i++){
                var other_tank = tank_arr[i];
                if (other_tank.id !== current_tank.id && (!other_tank.is_collided_with_other_tank)) {
                    if (Utils.distace2Object(current_tank.pos, other_tank.pos) < 100) {
                        if (current_tank.checkCollisionWithOtherTank(other_tank)) {
                            this.count_explosion++;
                            if(this.count_explosion>1000){
                                this.count_explosion=1;
                            }
                            
                            //Explosion(x, y, id, tank_angle, gun_angle, zone_id) 
							var dead_tank = (current_tank.hp > other_tank.hp)? other_tank : current_tank;                         		                                                           
                            var explosion = new Explosion(dead_tank.pos.x, dead_tank.pos.y , this.count_explosion, dead_tank.tank_angle, dead_tank.gun_angle,dead_tank.id);
							
                            //list of explosion all over the map
                            this.EXPLOSION_LIST[explosion.id] = explosion;

                            //mark to not duplicate
                            current_tank.is_collided_with_other_tank = true;
                            other_tank.is_collided_with_other_tank = true;                                           
												                            
                            var delta_hp = dead_tank.hp;							
                            //mark to process at next frame
                            current_tank.reduceHp(delta_hp);
                            other_tank.reduceHp(delta_hp);
							
							//generate item      
							var tank_arr_1 = this.getAllTanksAroundMe(dead_tank.zone_id, zone_tank_arr);                 
							var obstacle_arr_1 = this.getAllObstaclesAroundMe(dead_tank.zone_id);        
							this.generateItems(dead_tank, tank_arr_1, obstacle_arr_1);   
							
                            break;
                        }
                    }
                }
            }
        }


	    //check collection with map edge

			var collided_with_map_edge = current_tank.checkCollisionWithMapEdge();

			if (!collided_with_map_edge){
				//check collision with obstacle        
				var obstacle_arr = this.getAllObstaclesAroundMe(current_tank.zone_id);        
				for (var i = 0; i < obstacle_arr.length; i++) {         
					var collision = current_tank.checkCollisionWithObstacle(obstacle_arr[i]);
					if (collision){ 
						break;
					}
				}
			}
			
        
        //check if tank get item
        var item_arr = this.getAllItemsAroundMe(current_tank.zone_id, zone_item_arr);
        for (var i=0; i < item_arr.length; i++){
            current_tank.checkItem(item_arr[i]);
        }
    }
	
	//reset marking for next frame
	    for (var tankid  in this.PLAYER_LIST) {
			var tank = this.PLAYER_LIST[tankid];
			if (tank.is_collided_with_other_tank === true){
				tank.is_collided_with_other_tank = false;
			}
		}
}

Room.prototype.updateObjectsAroundTanks = function(zone_tank_arr, zone_bullet_arr, zone_explosion_arr, zone_item_arr, count_frame){	
    for (var tankid  in this.PLAYER_LIST) {// update thong tin xu ly cac xe tank
        if (tankid > 0){ //real user
            var tank = this.PLAYER_LIST[tankid];
            tank.updateAllTanksAroundMe(zone_tank_arr, count_frame);
            tank.updateAllBulletsAroundMe(zone_bullet_arr);
            tank.updateAllObstaclesAroundMe(this.ZONE_LIST);			
			tank.updateAllItemsAroundMe(zone_item_arr);
        }
    }
	
	for (var tankid  in this.DEAD_PLAYER_LIST) {// update thong tin xu ly cac xe tank        
        var tank = this.DEAD_PLAYER_LIST[tankid];			
            tank.updateAllTanksAroundMe(zone_tank_arr, count_frame);
            tank.updateAllBulletsAroundMe(zone_bullet_arr);
			tank.updateAllItemsAroundMe(zone_item_arr);
    }
}


Room.prototype.updateExplosionsAroundTanks = function(zone_explosion_arr, count_frame){
	for (var explosion_id in  this.EXPLOSION_LIST){
        var explosion = this.EXPLOSION_LIST[explosion_id];
		//console.log('explosion '+JSON.stringify(explosion));
        Utils.putObjectIntoRightZone(explosion, explosion.pos.x, explosion.pos.y, zone_explosion_arr);  
    }
    for (var tankid  in this.PLAYER_LIST) {// update thong tin xu ly cac xe tank
        if (tankid > 0){ //real user            			
            var tank = this.PLAYER_LIST[tankid];			
            tank.updateAllExplosionsAroundMe(zone_explosion_arr, count_frame);
        }
    }

	
	for (var tankid  in this.DEAD_PLAYER_LIST) {// update thong tin xu ly cac xe tank        
        var tank = this.DEAD_PLAYER_LIST[tankid];			
        tank.updateAllExplosionsAroundMe(zone_explosion_arr, count_frame);		
    }
}

Room.prototype.increaseDeadTankCountTime = function(){
	for (var tankid  in this.DEAD_PLAYER_LIST) {// update thong tin xu ly cac xe tank        
        var tank = this.DEAD_PLAYER_LIST[tankid];			        
		tank.death_life++;        
    }
}


Room.prototype.updateGunAngleAndFire =function(delta_time){
    for (var tankid  in this.PLAYER_LIST) {// update thong tin xu ly cac xe tank
        var tank = this.PLAYER_LIST[tankid];
        var fire_status = tank.updateGunAngleAndStartingFire(delta_time);
        if (fire_status === 1) {
            if (tank.ammo <= 0) {
                return;
            }
            //tank.ammo-=1;
            this.createNewBullets(tank);
        }
    }
}


Room.prototype.updateAddingAi =function(delta_time) {
    this.ai_add_interval = this.ai_add_interval + delta_time;	
	if (this.first_time_add_ai){
		if (this.ai_add_interval > 1){
			this.addingAi();
			this.ai_add_interval = 0;
			this.first_time_add_ai = false;
		} 		
	} else {		
		if (this.ai_add_interval > 4) {				
		        this.addingAi();
				this.ai_add_interval = 0;
		}
	}
}

Room.prototype.updateAi = function (zone_tank_arr) {
    for (var key in this.PLAYER_LIST) {
        if (key < 0) {
            var boot = this.PLAYER_LIST[key];
            boot.updateState();

            var can_fire = Date.now() - boot.last_fire > AI.SHOOTING_DURATION;			
            if (boot.is_shooted && boot.shooter_id !== 0) {				
                if (can_fire && this.PLAYER_LIST.hasOwnProperty(boot.shooter_id)) {					
                    var target = this.PLAYER_LIST[boot.shooter_id];					
                    boot.shootTarget(target);
                }
                boot.is_shooted = false;
                boot.shooter_id = 0;
                boot.changeDirection();
            } else {
				
                if (can_fire){
					
                    var tank_arr = this.getAllTanksAroundMe(boot.zone_id, zone_tank_arr);
                    var obstacle_arr = this.getAllObstaclesAroundMe(boot.zone_id);
                    boot.shootClosestTank(tank_arr, obstacle_arr);                  
                }
            }
        }
    }
}



Room.prototype.getFreePos = function () {

    var free_pos_number = this.FREE_POSITION_LIST.length;
    var rd = 0;  
	var demw = 10;	
    while (demw > 0) {
        var rd = Math.floor(Math.random() * free_pos_number);
        if (rd >= free_pos_number) {
            rd = free_pos_number - 1;
        }
        var tmp_pos = this.FREE_POSITION_LIST[rd];
        var get_this_pos = true;

        for (var key in this.PLAYER_LIST) {
            var tank = this.PLAYER_LIST[key];
            if (Utils.distace2Object(tank.pos, tmp_pos) < Room.MIN_DISTANCE_BETWEEN_PLAYERS) { //this post don't close any other tanks
                get_this_pos = false;
                break;
            }
        }
        if (get_this_pos) {//this post don't close any other tanks
            return tmp_pos;
        }
        demw = demw - 1;
    }
	
	//could not find a safe pos, return random pos		
	//console.log(this.FREE_POSITION_LIST[rd].x + '|'+this.FREE_POSITION_LIST[rd].y)
    return this.FREE_POSITION_LIST[rd];
}


Room.prototype.createNewBullets = function (tankfire) {
    // var shooting_streng = Player.getShootingStrength(tank.level);
    // for (var i =0; i < shooting_streng; i++){
    //     this.count_bullet++;    
    //     if (this.count_bullet > 1000000) {
    //         this.count_bullet = 1;
    //     }
        
    //     //delta angle between bullets: 0.5 
    //     var delta =0;// = (i % 2 === 0) ? 0.5* i : -0.5*i;
    //     var shooting_angle =  tank.gun_angle + delta;
    //     var shooting_angle_radian=shooting_angle*3.141592653589/180;
    //     var xbegin = tank.pos.x+20*Math.cos(shooting_angle_radian);
    //     var ybegin = tank.pos.y+20*Math.sin(shooting_angle_radian);
    //     var start_pos = new Vector(xbegin, ybegin);
    //     var new_bullet = new Bullet(tank.id, this.count_bullet);



    //     new_bullet.setMoveDirection(shooting_angle, start_pos);
    //     this.BULLET_LIST[new_bullet.id] = new_bullet;
        
    // }
    
    var g_angle=tankfire.gun_angle;
    

    var xt=0;
    var yt=0;
    if (tankfire.moving_direction==1) {
        xt=tankfire.dtmove;
    }
    if (tankfire.moving_direction==3) {
        xt=-tankfire.dtmove;
    }
    if (tankfire.moving_direction==2) {
        yt=tankfire.dtmove;
    }
    if (tankfire.moving_direction==4) {
        yt=-tankfire.dtmove;
    }

    var shooting_streng = Player.getShootingStrength(tankfire.level);
    var dt_angle=g_angle;
    var dt_ag=0;
    if (shooting_streng===2) {
        dt_angle=dt_angle-3;
        dt_ag=6;
    }
    if (shooting_streng===3) {
        dt_angle=dt_angle-4;
        dt_ag=4;
    }
    if (shooting_streng===4) {
        dt_angle=dt_angle-12;
        dt_ag=6;
    }
    for (var i =0; i < shooting_streng; i++){
		if (tankfire.ammo > 0){
			tankfire.ammo--;
			this.count_bullet++;
			if (this.count_bullet>10000) {
				this.count_bullet=1;
			}
			var gocban=dt_angle+i*dt_ag;
			if (gocban>360) {
				gocban=gocban-360;
			}else if (gocban<0) {
				gocban=360+gocban;
			}
			var gocdg=gocban*3.141592653589/180; 
			var xbegin=tankfire.pos.x+23*Math.cos(gocdg)+xt;
			var ybegin=tankfire.pos.y+23*Math.sin(gocdg)+yt;

			var diembanbandau=new Vector(xbegin,ybegin);
			var new_bullet=new Bullet(tankfire.id,this.count_bullet);
			
			new_bullet.setMoveDirection(gocban,diembanbandau);
			this.BULLET_LIST[new_bullet.id]=new_bullet;
		}		
    }


    this.count_explosion++;
    if(this.count_explosion>1000){
        this.count_explosion=1;
    }
    var gocdg_2=g_angle*3.141592653589/180; 
    var xbegin_2=tankfire.pos.x+23*Math.cos(gocdg_2)+xt;
    var ybegin_2=tankfire.pos.y+23*Math.sin(gocdg_2)+yt;
    var explosion = new Explosion(xbegin_2, ybegin_2, this.count_explosion, 0, 0,tankfire.id);
    explosion.ex_type=2+shooting_streng;
    this.EXPLOSION_LIST[explosion.id] = explosion;
}



Room.prototype.getAllObstaclesAroundMe = function (zone_id) {
    return Utils.getAllObjectsAroundMe(zone_id, this.ZONE_LIST);
}

//zone_id of "me"
Room.prototype.getAllTanksAroundMe = function (zone_id, zone_tank_arr) {
    return Utils.getAllObjectsAroundMe(zone_id, zone_tank_arr);
}

Room.prototype.getAllItemsAroundMe = function (zone_id, zone_item_arr) {
    return Utils.getAllObjectsAroundMe(zone_id, zone_item_arr);
}




module.exports = Room;