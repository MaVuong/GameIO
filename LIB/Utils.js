/**
 * Created by giangngo on 6/14/2016.
 */
var Utils = function () {
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
	var x2 = x;
	var y2 = y;
	while (i< 10 && !stop1)	{
		var angle = Math.random()*Math.PI*2;
		x2 = x+ Math.cos(angle)*radius;
		y2 = y+ Math.sin(angle)*radius;	
		var stop2 = false;
		var j =0;
		while (j < tank_arr.length && !stop2){
			var tank = tank_arr[j];
			if (Utils.isPointInRetangle(x2, y2, tank.pos.x, tank.pos.y, tank.w, tank.h)){
				stop1 = true;
				stop2 = true;
			} 
			j++;
		}

		var stop3 = false;
		var k =0;
		while (k < obstacle_arr.length && !stop3){
			var obstacle = obstacle_arr[k];
			if (Utils.isPointInRetangle(x2, y2, obstacle.x, obstacle.y, obstacle.w, obstacle.h)){
				stop1 = true;
				stop3 = true;
			} 
			k++;
		}		
		i++;
	}
	
	var pos = null;
	if (!stop1 && isPointInMap(x2, y2)){
		pos = {};
		pos.x =x2;
		pos.y = y2;
	}
	return pos;
}

function isPointInMap(x, y){
	return (x < 1500 && x > -1500 && y > -1000 && y < 1000);
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

module.exports = Utils;


