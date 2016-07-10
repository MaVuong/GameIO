/**
 * Created by giangngo on 6/14/2016.
 */
var Utils = function () {
}
Utils.sizeof = function (object) {
    // initialise the list of objects and size
  var objects = [object];
  var size    = 0;

  // loop over the objects
  for (var index = 0; index < objects.length; index ++){

    // determine the type of the object
    switch (typeof objects[index]){

      // the object is a boolean
      case 'boolean': size += 4; break;

      // the object is a number
      case 'number': size += 8; break;

      // the object is a string
      case 'string': size += 2 * objects[index].length; break;

      // the object is a generic object
      case 'object':

        // if the object is not an array, add the sizes of the keys
        if (Object.prototype.toString.call(objects[index]) != '[object Array]'){
          for (var key in objects[index]) size += 2 * key.length;
        }

        // loop over the keys
        for (var key in objects[index]){

          // determine whether the value has already been processed
          var processed = false;
          for (var search = 0; search < objects.length; search ++){
            if (objects[search] === objects[index][key]){
              processed = true;
              break;
            }
          }

          // queue the value to be processed if appropriate
          if (!processed) objects.push(objects[index][key]);

        }

    }

  }

  // return the calculated size
  return size;
}

Utils.calcAngle = function (sourcePos, targetPos) {
    var dy = targetPos.y - sourcePos.y;
    var dx = targetPos.x - sourcePos.x;
    var theta = Math.atan2(dy, dx); // range (-PI, PI]
    theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
    if (theta < 0) {
        theta = 360 + theta;
    } // range [0, 360)
    return theta;
};

Utils.distace2Object = function (obj1, obj2) {
    return Math.sqrt(Math.pow(obj1.x - obj2.x, 2) + Math.pow(obj1.y - obj2.y, 2));
};


    Utils.lineRectIntersec = function (x1, y1, x2, y2, x, y, w, h) {
        var test1 = lineIntersect(x1, y1, x2, y2, x - w / 2, y - h / 2, x - w / 2, y + h / 2);
        var test2 = lineIntersect(x1, y1, x2, y2, x - w / 2, y - h / 2, x + w / 2, y - h / 2);
        var test3 = lineIntersect(x1, y1, x2, y2, x - w / 2, y + h / 2, x + w / 2, y + h / 2);
        var test4 = lineIntersect(x1, y1, x2, y2, x + w / 2, y + h / 2, x + w / 2, y - h / 2);
        return (test1 || test2 || test3 || test4);
    };

    Utils.get_around_zones = function (zone_index) {
        var cx = zone_index % 10; //x-index (0-9)
        var cy = Math.floor(zone_index / 10); //y-index (0-9)


        var zone_arr = [];//contains 9 zones including it self, may contain zone at other side of mao
        zone_arr.push(zone_index - 10 - 1);
        zone_arr.push(zone_index - 10);
        zone_arr.push(zone_index - 10 + 1);
        zone_arr.push(zone_index - 1);
        zone_arr.push(zone_index);
        zone_arr.push(zone_index + 1);
        zone_arr.push(zone_index + 10 - 1);
        zone_arr.push(zone_index + 10);
        zone_arr.push(zone_index + 10 + 1);

        //adjust to return only correct around zones
        var return_array = [];
        for (var i = 0; i < 9; i++) {// chi co 9 phan tu theo 3x3 thoi
            var zone_index = zone_arr[i];
            var cvx = zone_arr[i] % 10; //x-index
            var cvy = Math.floor(zone_arr[i] / 10); //y-index

            //check distance with current zone
            var distance = Math.sqrt(Math.pow(cvx - cx, 2) + Math.pow(cvy - cy, 2));
            if (zone_index >= 0 && zone_index <= 99 && distance < 2) { //distance between two successive zones is 1
                return_array.push(zone_index);
            }
        }
        return return_array;
    };


    //x,y to zone index
    Utils.posToZoneIndex = function (x, y) {
        var cv_x = Number(x) + 1500;
        var cv_y = Number(y) + 1000;
		
		if (x > 3000 || y > 3000)
			console.log("convert to Unit error, xp=%s yp=%s", x, y);
        // map size 3000 x 2000
        var xp = Math.floor(cv_x / 300); //x-index
        var yp = Math.floor(cv_y / 200); //y-index
		
        var index = Math.floor(yp * 10 + xp); //zone-index
        if (index > 99 || xp > 9 || yp > 9 || index < 0) {
			
            //console.log("convert to Unit error, xp=%s yp=%s index=%s", xp, yp, index);
            return -1;
        } else {
            return index;
        }
    };

/*
 * full_object_arr: array of zones, each zone is array of object
 * x, y: position of "Me", including Me
 */
Utils.getAllObjectsAroundMe = function (zone_index, full_object_arr) {
    
	/*
	if (zone_index === null) {
        zone_index = Utils.posToZoneIndex(x, y);// convert thanh vi tri don vi 0-99
    }
	*/
    var zone_arr = Utils.get_around_zones(zone_index);//get array of around zone index
    var object_arr = [];
    for (var i = 0; i < zone_arr.length; i++) {
        var index = zone_arr[i];// zone index
        var object_in_zone_arr = full_object_arr[index];
        for (var j = 0; j < object_in_zone_arr.length; j++) {
            object_arr.push(object_in_zone_arr[j]);
        }
    }
    return object_arr;
};



Utils.putObjectIntoRightZone = function(object, x, y, zone_object_arr){
	
    var zone_index = Utils.posToZoneIndex(x, y);
    object.zone_id = zone_index;
    if (zone_index >= 0) {
        zone_object_arr[zone_index].push(object);  //push bullet into the right zoneId
    }
}

Utils.getRandomPoint = function (x, y, radius, tank_arr, obstacle_arr){
	var stop1 = false;
	var i =0;
	var angle = 0;
	var x2, y2;
	while (i< 10 && !stop1)	{
		x2 = 0;
		y2 = 0;
		angle = 360*Math.random(); //*Math.PI*2;
		x2 = x+ Math.cos(angle)*radius;
		y2 = y+ Math.sin(angle)*radius;	
		
		//console.log(angle +'|'+Math.cos(angle));
		//console.log(angle +'|'+Math.sin(angle));
		
		if (isPointInMap(x2, y2)){ //stay inside the map
			var stop2 = false;
			var stop3 = false;
			var j =0;
			while (j < tank_arr.length && !stop2){
				var tank = tank_arr[j];
				if (Utils.isPointInRetangle(x2, y2, tank.pos.x, tank.pos.y, tank.w, tank.h)){					
					stop2 = true;
				} 
				j++;
			}

			if (!stop2){ //not stay inside any tank				
				var k =0;
				while (k < obstacle_arr.length && !stop3){
					var obstacle = obstacle_arr[k];
					if (Utils.isPointInRetangle(x2, y2, obstacle.x, obstacle.y, obstacle.w, obstacle.h)){						
						stop3 = true;
					} 
					k++;
				}
				if (!stop3)	{ //not stay in any obstacle
					stop1 = true; //successful find a the position
				}	
				
			}
			
		}	
		i++;
	}
	
	var pos = null;
	if (stop1){
		pos = {};
		pos.x =x2;
		pos.y = y2;
		pos.angle = angle;
	}
	return pos;
}

function isPointInMap(x, y){	
	return (x < 1450 && x > -1450 && y > -950 && y < 950);
}


Utils.isPointInRetangle =function(x, y, x_rect, y_rect, w, h){
	var dtX = Math.abs(x - x_rect);
    var dtY = Math.abs(y - y_rect);
    var kcW = w / 2;
    var kcH = h / 2;
    return (dtX < kcW && dtY < kcH); 
}


Utils.logObject = function (obj) {
    console.log("info :x=%s , y=%s, w=%s, h=%s", obj.x, obj.y, obj.w, obj.h);
};


function lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    var x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
    var y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
    if (x === undefined || y === undefined) {
        return false;
    } else {
        if (x1 >= x2) {
            if (!(x2 <= x && x <= x1)) {
                return false;
            }
        } else {
            if (!(x1 <= x && x <= x2)) {
                return false;
            }
        }
        if (y1 >= y2) {
            if (!(y2 <= y && y <= y1)) {
                return false;
            }
        } else {
            if (!(y1 <= y && y <= y2)) {
                return false;
            }
        }
        if (x3 >= x4) {
            if (!(x4 <= x && x <= x3)) {
                return false;
            }
        } else {
            if (!(x3 <= x && x <= x4)) {
                return false;
            }
        }
        if (y3 >= y4) {
            if (!(y4 <= y && y <= y3)) {
                return false;
            }
        } else {
            if (!(y3 <= y && y <= y4)) {
                return false;
            }
        }
    }
    return true;
}

//==========name array ==============
var name_arr=["ArrowAssasin",
"Avenger",
"Blaze",
"Bodhi",
"Captain",
"Cyborg",
"Dark",
"Death",
"Demon",
"Doom",
"Doctor",
"Enigma",
"Fallen",
"Fate",
"Flame",
"Frozen",
"Ghost",
"Great",
"Infinite",
"Killer",
"Knight",
"Mist",
"Neo",
"Nightmare",
"Ninja",
"Outlaw",
"Seeker",
"Shadow",
"Silver",
"Sinister",
"Slayer",
"Sniper",
"Playboyize",
"Gigastrength",
"Deadlyinx",
"Techpill",
"Methshot",
"Methnerd",
"TreeEater",
"Sharpcharm",
"Snarelure",
"Skullbone",
"Burnblaze",
"Emberburn",
"Emberfire",
"Evilember",
"Firespawn",
"Flameblow",
"SniperGod",
"TalkBomber",
"SniperWish",
"RavySnake",
"WebTool",
"TurtleCat",
"LuckyDusty",
"RumChicken",
"StonedTime",
"CouchChiller",
"VisualMaster",
"DeathDog",
"ZeroReborn",
"TechHater",
"eGremlin",
"BinaryMan",
"AwesomeTucker",
"FastChef",
"JunkTop",
"PurpleCharger",
"CodeBuns",
"BunnyJinx",
"GoogleCat",
"StrangeWizard",
"Fuzzy_Logic",
"New_Cliche",
"Ignoramus",
"Stupidasole",
"whereismyname",
"Nojokur",
"Illusionz",
"Spazyfool",
"Supergrass",
"Dreamworx",
"Fried_Sushi",
"Stark_Naked",
"Need_TLC",
"Raving_Cute",
"Lunatick",
"GarbageCanLid",
"Crazy_Nice",
"Booteefool",
"Harmless_Venom",
"Lord_Tryzalot",
"Sir_Gallonhead",
"Boy_vs_Girl",
"MPmaster",
"King_Martha",
"Spamalot",
"Soft_member",
"girlDog",
"Evil_kitten",
"farquit",
"viagrandad",
"happy_sad",
"haveahappyday",
"SomethingNew",
"5mileys",
"cum2soon",
"takes2long",
"w8t4u",
"askme",
"Bidwell",
"massdebater",
"iluvmen",
"Inmate",
"idontknow",
"likme",
"kizzmybutt",
"hairygrape",
"Poker_Star",
"thongsmisty",
"buzzfunding",
"waltycreamed",
"clotweekly",
"pauseillegal",
"utensilponie",
"indigoeffects",
"flushpocket",
"draggingeritrean",
"defensivecrush",
"filamentbugger",
"supplierboyz",
"spadefilms",
"wirelessdrained",
"mckinleyallen",
"ironicfastidious",
"torresidue",
"rockerswanted",
"shotvenatici",
"bibsenvelope",
"thymeethnic",
"coamingcowboys",
"robotzodiacal",
"accentnap",
"usesmoons",
"^_^",
"911",
"*_*",
"#_#",
":)",
":(",
":|",
"==>:(",
"*-*",
"#-#",
":((((",
":)))",
":|||",
"Sniper",
"Love",
"Killer",
"Lion",
"Tiger",
"Shooter",
"King",
"Warrior",
"Alone",
"Cai",
"Chen",
"Gao",
"Huang",
"Li",
"Lin",
"Liu",
"Ma",
"Wang",
"Wu",
"Yang",
"Zhang",
"Cao",
"Cui",
"Deng",
"Ding",
"Fan",
"Guo",
"Hu",
"Jiang",
"Jin",
"Ke",
"Kong",
"Lan",
"Lei",
"Lian",
"Liang",
"Lu",
"Sato",
"Suzuki",
"Takahashi",
"Tanaka",
"Watanabe",
"Ito",
"Nakamura",
"Kobayashi",
"Yamamoto",
"Kato",
"Yoshida",
"Yamada",
"Sasaki",
"Yamaguchi",
"Matsumoto",
"Inoue",
"Kimura",
"Shimizu",
"Hayashi",
"Saito",
"God"];


Utils.getName = function(){
	var index = Math.floor(Math.abs(name_arr.length * Math.random() -1 ));
	return name_arr[index];
}



module.exports = Utils;


