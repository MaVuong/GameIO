var AI = require('./AI');
var Player = require('./Player');
var Bullet = require('./Bullet');
var Vector = require('./Vector');
var Utils = require('./Utils');
var Explosion = require('./Explosion');

function Room(id) {
    this.id = id;

    this.PLAYER_LIST = {}; //tank list
    this.count_player = 0;
    
    this.EXPLOSION_LIST = {};
    this.count_explosion = 0;

    this.ITEM_LIST = {};
    this.count_item = 0;
    
    this.BULLET_LIST = {};
    this.count_bullet = 0;

    this.OBSTACLE_LIST = null;// list of obstacles
    this.FREE_ZONE_LIST = null; //list of free zones to generate random items
    
    this.ZONE_LIST = null;  //array of zones, each zone is an array of obstacles
    this.FREE_POSITION_LIST = null;   //free positions
    
    this.AI_LIST = [];     //ai tank list

    this.ai_id = -1; //starting id of ai
    this.ai_add_interval = 0;
    this.last_post_tank_added = null; //store last position the tank added
    this.ai_added = false; //indicate if the ai are added or not

}

Room.MAX_HP_ITEMS = 15;
Room.MAX_AMMO_ITEMS = 15;

Room.prototype.loadMapAndAI = function () {
    fs = require('fs')
    var fs = require('fs');
    var obj = JSON.parse(fs.readFileSync('./Map/mapgame1.json', 'utf8'));
    this.OBSTACLE_LIST = obj.mapObstacle;
    this.FREE_ZONE_LIST = obj.mapFreeRect; //free zone to gen items
    this.ZONE_LIST = obj.Unit; //array of zones, each zone is array of obs
    this.FREE_POSITION_LIST = obj.ArrFreePos;
    console.log("MAP %s IS LOADED-->", this.id);
}


Room.prototype.updateFrameStep = function(delta_time) {

    var zone_tank_arr = [];//array of zones, each zone is array of tanks
    var zone_bullet_arr = []; //array of zones, each zone is array of bullets
    var zone_item_arr = [];
    var zone_explosion_arr = [];//array of zones, each zone is array of explosions
    var zone_item_arr = [];//array of zones, each zone is array of items

    // init the array
    for (var i = 0; i < 100; i++) {
        zone_tank_arr.push([]); //zone_tank_arr[[],[],[] ....,[]]
        zone_bullet_arr.push([]);
        zone_item_arr.push([]);
        zone_explosion_arr.push([]);
        zone_item_arr.push([]);
    }

    //delete all bullet are marked as is_remove from previous frame
    this.deleteObjectsFromPreviousStep(this.BULLET_LIST, false);

    //delete all tanks are marked as is_removed = true from previous frame
    this.deleteObjectsFromPreviousStep(this.PLAYER_LIST, true);

    //delete all items are marked as is_removed = true from previous frame
    this.deleteObjectsFromPreviousStep(this.ITEM_LIST, false);

    
    //update all explosion around me, explosion is calculated from previous frame, need to delete before calculate new explosions
    this.updateExplosionsAroundTanks(zone_explosion_arr);

    //reset to calculate new explosions
    zone_explosion_arr = [];
    for (var i = 0; i < 100; i++) {
        zone_explosion_arr.push([]);
    }

    
    //update tank positions and push tanks into their right zones
    this.updateObjectPositionAndPushIntoRightZone(this.PLAYER_LIST, zone_tank_arr, delta_time);
    
    //update bullet position and push the bullet into the right zones
    this.updateObjectPositionAndPushIntoRightZone(this.BULLET_LIST, zone_bullet_arr, delta_time);

    //check collision between Bullet-map, obstacles, tanks
    this.checkCollisionOfBullets(zone_tank_arr);

    //check collision between tanks, update the explosion list
    this.checkCollisionOfTanks(zone_tank_arr, zone_item_arr);

    //update gun angle and fire when finish rotate the gun
    this.updateGunAngleAndFire(delta_time);

    this.updateObjectsAroundTanks(zone_tank_arr, zone_bullet_arr, zone_explosion_arr);

    this.updateAi(zone_tank_arr); //change the direction if a number is reached

    this.updateAddingAi(delta_time);

}


//return number of player including AI
Room.prototype.getPlayerNumber = function () {
    return Object.keys(this.PLAYER_LIST).length;
}

//return number of established sockets,i.e. real users
Room.prototype.getEstablishedSocket = function () {
    return (Object.keys(this.PLAYER_LIST).length - Object.keys(this.AI_LIST).length);
}


Room.prototype.clearAll = function () {
    this.OBSTACLE_LIST = null;// Object chuong ngai vat
    this.FREE_ZONE_LIST = null;
    this.ZONE_LIST = null;
    this.FREE_POSITION_LIST = null;
    this.AI_LIST = null;
    this.last_post_tank_added = null;
}


Room.prototype.removePlayer = function (player_id) {
    delete this.PLAYER_LIST[player_id];
}


Room.prototype.addPlayer = function (player) {
    this.PLAYER_LIST[player.id] = player;
    console.log("-----AddPlayer------------");

    var free_pos_number = this.FREE_POSITION_LIST.length;
    var rd = Math.floor(Math.random() * free_pos_number); //get a random zoneId
    if (rd >= free_pos_number) { //can not happen ?
        console.log("loi roi oi lay random add player vao position m_free");
        rd = free_pos_number - 1;
    }

    var free_pos = this.FREE_POSITION_LIST[rd]; //free position
    Utils.logObject(free_pos);// luu y: do luoi ve o client luon luon la boi so cua df_cell_draw_width=20 nen o day vi tri x,y cung phai la boi so cua 20
    player.pos.x = Number(free_pos.x);
    player.pos.y = Number(free_pos.y);
    player.tank_moving_speed = 80;

    this.last_post_tank_added = free_pos; //store last position the tank added
    console.log("-----Finish AddPlayer-------------");
    // se while cho den khi tim duoc vi tri thic hop, neu khong tim dc thi dat bien status da no ra khoi server
    // thang moi vao thi trong thoi gian 2s se dc bao ve va co hien tuong nhay nhay
    console.log("----------------->rd: %s vi tri x=%s y=%s", rd, free_pos.x, free_pos.y);
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
 *
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
        //if tank and real player ==> just reset; otherwise delete object
        if (isTank && arrToDelete[i] > 0) {
            this.resetPlayer(object_array[arrToDelete[i]]);         
        } else {            
            delete object_array[arrToDelete[i]]; //delete the object                        
        }


    }

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
        bullet.checkCollisionWithMapEdge();

        //check collision with around obstacles
        var obstacle_arr = this.getAllObstaclesAroundMe(bullet.zone_id);
        for (var i = 0; i < obstacle_arr.length; i++) {
            bullet.checkCollisionWithObstacle(obstacle_arr[i]);
        }

        //update collision with around tanks
        var tank_arr = this.getAllTanksAroundMe(bullet.zone_id, zone_tank_arr);
        for (var j = 0; j < tank_arr.length; j++) {
            var tank = tank_arr[j];
            if ((bullet.player_id !== tank.id) && bullet.checkCollisionWithTank(tank)) {
                bullet.is_remove = true;
                
                if (!tank.is_remove){
                    var is_last_bullet = tank.beShooted(shooter_id); // reduce hp, set the shooter
                    if (is_last_bullet){ //generate items and make Explosion
                    
                        //generae item      
                        var tank_arr_1 = this.getAllTanksAroundMe(tank.zone_id, zone_tank_arr);                 
                        var obstacle_arr_1 = this.getAllObstaclesAroundMe(tank.zone_id);        
                        this.generateItems(tank, tank_arr_1, obstacle_arr_1);   
                        
                        //make explosion
                        this.count_explosion++;
                        var explosion = new Explosion(tank.pos.x, tank.pos.y, this.count_explosion, tank.tank_angle, tank.gun_angle);
                        //list of explosion all over the map
                        this.EXPLOSION_LIST[explosion.id] = explosion;
                    
                        
                    }   
                    
                    var shooter_id = null;
                    if (this.PLAYER_LIST.hasOwnProperty(bullet.player_id)) {
                        var shooter = this.PLAYER_LIST[bullet.player_id];
                        shooter_id = shooter.id;
                        shooter.fireOnTarget(tank.level, is_last_bullet); //award the shooter
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
    for (i=0; i < tank.level; i++){
        var pos = Utils.getRandomPoint(tank.pos.x, tank.pos.y, 100, tank_arr, obstacle_arr);
        var type = (Math.random() < 0.5)? 1 : 2;
        this.count_item ++;
        if (pos !== null){
            var item = new Item(pos.x, pos.y, this.count_item, type);
            this.ITEM_LIST.push(item);
        }
    }
}



/*
 * check collision with other tanks,
 * result of this step is list of all explosion, explosion is putted into wright array
 * player is marked with isCollided and will be reduce the hp next frame
 */
Room.prototype.checkCollisionOfTanks = function(zone_tank_arr, zone_item_arr){
    
    for (var tankid  in this.PLAYER_LIST) {// update thong tin xu ly cac xe tank
        var current_tank = this.PLAYER_LIST[tankid];

        //check collision with other tanks
        //if the tank is collided with other, don't futher process
        // need to be revise later as this not deal with collision of multiple tanks
        if (!current_tank.is_collided_with_other_tank) {
           var tank_arr = this.getAllTanksAroundMe(current_tank.zone_id, zone_tank_arr);
            for (var i=0; i < tank_arr.length; i++){
                var other_tank = tank_arr[i];
                if (other_tank.id !== current_tank.id && (!other_tank.is_collided_with_other_tank)) {
                    if (Utils.distace2Object(current_tank.pos, other_tank.pos) < 100) {
                        if (current_tank.checkCollisionWithOtherTank(other_tank)) {
                            this.count_explosion++;
                            
                            //Explosion(x, y, id, tank_angle, gun_angle, zone_id)                           
                            var x_explosion = (current_tank.hp > other_tank.hp)? other_tank.pos.x : current_tank.pos.x;                         
                            var y_explosion = (current_tank.hp > other_tank.hp)? other_tank.pos.y : current_tank.pos.y;                         
                            var tank_anle = (current_tank.hp > other_tank.hp)? other_tank.tank_angle : current_tank.tank_angle;
                            var gun_anle = (current_tank.hp > other_tank.hp)? other_tank.gun_anle : current_tank.gun_anle;                                                      
                            var explosion = new Explosion(x_explosion,y_explosion, this.count_explosion, tank_angle, gun_angle);

                            //list of explosion all over the map
                            this.EXPLOSION_LIST[explosion.id] = explosion;

                            //mark to not duplicate
                            current_tank.is_collided_with_other_tank = true;
                            other_tank.is_collided_with_other_tank = true;
                                                    
                            //mark to process at next frame
                            current_tank.reduceHp(explosion.hp);
                            other_tank.reduceHp(explosion.hp);
                            break;
                        }
                    }
                }
            }
        }
    
        //check collection with map edge
        current_tank.checkCollisionWithMapEdge();

        //check collision with obstacle
        
        var obstacle_arr = this.getAllObstaclesAroundMe(current_tank.zone_id);        
        for (var i = 0; i < obstacle_arr.length; i++) {         
            current_tank.checkCollisionWithObstacle(obstacle_arr[i]);
        }
        
        //check if tank get item
        var item_arr = this.getAllItemsAroundMe(current_tank.zone_id, zone_item_arr);
        for (var i=0; i < item_arr.length; i++){
            current_tank.checkItem(item_arr[i]);
        }
    }
}


Room.prototype.updateObjectsAroundTanks = function(zone_tank_arr, zone_bullet_arr, zone_explosion_arr){
    for (var tankid  in this.PLAYER_LIST) {// update thong tin xu ly cac xe tank
        if (tankid > 0){ //real user
            var tank = this.PLAYER_LIST[tankid];
            tank.updateAllTanksAroundMe(zone_tank_arr);
            tank.updateAllBulletsAroundMe(zone_bullet_arr);
            tank.updateAllObstaclesAroundMe(this.ZONE_LIST);     
        }
    }

}


Room.prototype.updateExplosionsAroundTanks = function(zone_explosion_arr){
    for (var tankid  in this.PLAYER_LIST) {// update thong tin xu ly cac xe tank
        if (tankid > 0){ //real user        
            for (var i=0, l=this.EXPLOSION_LIST.length; i < l; i++){
                var explosion = this.EXPLOSION_LIST[i];
                Utils.putObjectIntoRightZone(explosion, explosion.x, explosion.y, zone_explosion_arr);  
            }
            var tank = this.PLAYER_LIST[tankid];
            tank.updateAllExplosionsAroundMe(zone_explosion_arr);
        }
    }
}



Room.prototype.updateGunAngleAndFire =function(delta_time){
    for (var tankid  in this.PLAYER_LIST) {// update thong tin xu ly cac xe tank
        var tank = this.PLAYER_LIST[tankid];
        var fire_status = tank.updateGunAngleAndStartingFire(delta_time);
        if (fire_status === 1) {
            this.createNewBullets(tank);
        }
    }
}


Room.prototype.updateAddingAi =function(delta_time) {
    this.ai_add_interval = this.ai_add_interval + delta_time;

    if (this.ai_add_interval > 2 && !this.ai_added) { //2 second call add ai
        this.ai_add_interval = 0;
        this.addingAi();
    }
}

Room.prototype.updateAi = function (zone_tank_arr) {
    for (var key in this.PLAYER_LIST) {
        if (key < 0) {
            var boot = this.PLAYER_LIST[key];
            boot.updateState();

            var can_fire = Date.now() - boot.last_fire < 300;
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


Room.prototype.addingAi = function() {
    //return;

    var player_number = this.getPlayerNumber();
    if (player_number > 40 || player_number == 0) {
        return;
    }

    var countAddAI = 10;
/*
     if (player_number > 30) {
     countAddAI = 2;
     } else if (countAddAI > 20) {
     countAddAI = 3;
     } else if (countAddAI > 10) {
     countAddAI = 4;
     }
*/
    //console.log("alskdjalksdjlas");
    var free_pos_number = this.FREE_POSITION_LIST.length;
    for (var i_ad = 0; i_ad < countAddAI; i_ad++) {

        var pos = this.getFreePos();


        if (pos.x === -2000 || pos.y === -2000) {
            console.log("add new AI but not have free position");
            break;
        } else {
            this.ai_id= this.ai_id - 1;
            if (this.ai_id < -1000000) {
                this.ai_id = -1;
            }

            var ai = new AI(this.ai_id);
            ai.lbdisplay = "";
            ai.pos.x = pos.x;
            ai.pos.y = pos.y;
            ai.setBeginLevel();
            console.log("Add new AI :%s pos: %s , %s", this.ai_id, pos.x, pos.y);
            this.PLAYER_LIST[this.ai_id] = ai;
        }
    }
    this.ai_added = true;
}

Room.prototype.getFreePos = function () {
    
    var pos = {};
    pos.x = -2000;
    pos.y = -2000;
    var free_pos_number = this.FREE_POSITION_LIST.length;
    
    var demw = 10;
    while (demw > 0) {
        var rd = Math.floor(Math.random() * free_pos_number);
        if (rd >= free_pos_number) {
            console.log(" ===+ERROR === AI random add player vao position m_free");
            rd = free_pos_number - 1;
        }
        var tmp_pos = this.FREE_POSITION_LIST[rd];
        var get_this_pos = true;

        for (var key in this.PLAYER_LIST) {
            var tank = this.PLAYER_LIST[key];
            if (Utils.distace2Object(tank.pos, tmp_pos) < 200) { //this post don't close any other tanks
                get_this_pos = false;
                break;
            }
        }
        if (get_this_pos) {//this post don't close any other tanks
            pos.x = Number(tmp_pos.x);
            pos.y = Number(tmp_pos.y);
            break;
        }
        demw = demw - 1;
    }
    return pos;
}


Room.prototype.createNewBullets = function (tank) {
    var shooting_streng = Player.getShootingStrength(tank.level);
    for (var i =0; i < shooting_streng; i++){
        this.count_bullet++;    
        if (this.count_bullet > 1000000) {
            this.count_bullet = 1;
        }
        
        //delta angle between bullets: 0.5 
        var delta = (i % 2 === 0) ? 0.5* i : -0.5*i;
        var shooting_angle =  tank.gun_angle + delta;
        
        var xbegin = tank.pos.x;
        var ybegin = tank.pos.y;
        var start_pos = new Vector(xbegin, ybegin);
        var new_bullet = new Bullet(tank.id, this.count_bullet);

        new_bullet.setMoveDirection(shooting_angle, start_pos);
        this.BULLET_LIST[new_bullet.id] = new_bullet;
        
    }
    
    
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