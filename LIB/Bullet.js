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
    this.skipFristFrame=true;	

    this.pos_contact={};// diem tiep xuc cuoi cung cua vien dan den chuong ngai vat, xe tank

    this.lastPos={};
    this.rootPos={};
    this.line_stt=0;
    this.b=0;
    this.a=0;
}


//set move direction: pos + angle (in degree)
Bullet.prototype.setMoveDirection = function (angle, begin_pos) {
    
    this.angle = (angle * 3.141592) / 180;
    this.pos = begin_pos;
    this.lastPos.x=this.pos.x;
    this.lastPos.y=this.pos.y;

    this.rootPos.x=this.pos.x;
    this.rootPos.y=this.pos.y;


    var num_cos=Math.cos(this.angle);
    num_cos=Math.abs(num_cos);
    var dtC=1-num_cos;
    if (num_cos<0.001) {// song song voi truc oy co dang x=Xo voi moi y
        this.line_stt=1;
    }else if (dtC<0.001) {// song song voi truc ox co dan y=Yo voi moi x
        this.line_stt=2;
        this.b=this.rootPos.y;
        this.a=0;
    }else{
        this.a=Math.tan(this.angle);// a=k=tan(goc)
        this.b=this.rootPos.y-this.a*this.rootPos.x;// b=y-ax
        //console.log("---------------------------this.a: %s root: %s - %s",this.a,this.rootPos.x,this.rootPos.y);
    }
}

//
Bullet.prototype.updatePosition = function (delta_time) {	

    if (this.is_remove) {return; }
    if (this.skipFristFrame) {
        this.skipFristFrame=false;
        return;
    }
    this.lastPos.x=this.pos.x;
    this.lastPos.y=this.pos.y;

    var delta_distance = delta_time * this.speed; //canh huyen
    this.moved_length = this.moved_length + delta_distance; //moved distance
    this.pos.x = this.pos.x + delta_distance * Math.cos(this.angle);
    this.pos.y = this.pos.y + delta_distance * Math.sin(this.angle);

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

        var arr_x=[obstacle.x-obstacle.w / 2,Number(obstacle.x)+obstacle.w / 2];
        var arr_y=[obstacle.y-obstacle.h / 2,Number(obstacle.y)+obstacle.h / 2];
        this.FindContactPos(arr_x,arr_y);
		return;
    }
    
    var centerPos={};
    centerPos.x=(Number(this.lastPos.x)+Number(this.pos.x))/2;
    centerPos.y=(Number(this.lastPos.y)+Number(this.pos.y))/2;

    dtX = Math.abs(centerPos.x - obstacle.x);
    dtY = Math.abs(centerPos.y - obstacle.y);
    if (dtX < kcW && dtY < kcH) {
        //console.log("------------------BBBB-----------------: ");
        this.is_remove = true;  

        var arr_x=[obstacle.x-obstacle.w / 2,Number(obstacle.x)+obstacle.w / 2];
        var arr_y=[obstacle.y-obstacle.h / 2,Number(obstacle.y)+obstacle.h / 2];
        this.FindContactPos(arr_x,arr_y);
    }
    
    
}

//check if collision happen, return true or false
Bullet.prototype.checkCollisionWithTank = function (tank) {
    var dtX = Math.abs(this.pos.x - tank.pos.x);
    var dtY = Math.abs(this.pos.y - tank.pos.y);
    var kcW = tank.w / 2;
    var kcH = tank.h / 2;
    if(dtX < kcW && dtY < kcH){

        var arr_x=[tank.pos.x-tank.w / 2,Number(tank.pos.x)+tank.w / 2];
        var arr_y=[tank.pos.y-tank.h / 2,Number(tank.pos.y)+tank.h / 2];
        this.FindContactPos(arr_x,arr_y);

        return true;
    }

    var isCollision=false;
    var centerPos={};
        centerPos.x=(Number(this.lastPos.x)+Number(this.pos.x))/2
        centerPos.y=(Number(this.lastPos.y)+Number(this.pos.y))/2;

        dtX = Math.abs(centerPos.x - tank.pos.x);
        dtY = Math.abs(centerPos.y - tank.pos.y);
        if(dtX < kcW && dtY < kcH){
           // console.log("------------------AAAA-----------------");
            isCollision= true;

            var arr_x=[Number(tank.pos.x)-tank.w / 2,Number(tank.pos.x)+tank.w / 2];
            var arr_y=[Number(tank.pos.y)-tank.h / 2,Number(tank.pos.y)+tank.h / 2];
            this.FindContactPos(arr_x,arr_y);
        }
    
    return isCollision;
}






//mark to remove if collide with map edge
Bullet.prototype.checkCollisionWithMapEdge = function () {
    if (this.pos.x < -1460 || this.pos.x > 1460 || this.pos.y < -960 || this.pos.y > 960) {
        this.is_remove = true;
		
    }

}










Bullet.prototype.getXPos = function (ypos) {
    if (this.line_stt==1) {
        return this.rootPos.x;
    }else if (this.line_stt==2) {
        console.log("---------------XPOS-se check va khong bao gio co truong hop nay, neu co chi co la song song hoa trung nhau ------------");
    }
    return (ypos-this.b)/this.a;
}
Bullet.prototype.getYPos = function (xpos) {
    if (this.line_stt==2) {
        return this.rootPos.y;
    }else if (this.line_stt==1) {
        console.log("---------------YPOS-se check va khong bao gio co truong hop nay, neu co chi co la song song hoa trung nhau ------------");
    }
    return (this.a*xpos+this.b);
}




// tim tiep diem va cham voi cac canh 
Bullet.prototype.FindContactPos = function (arrX,arrY) {
    
    var arrPos=[];
    if (this.line_stt==1) { // kiem tra 2 duong 
        arrPos.push({x:this.getXPos(arrY[0]),y:arrY[0]});
        arrPos.push({x:this.getXPos(arrY[1]),y:arrY[1]});
    }else if(this.line_stt==2){ // kiem tra 2 duong
        arrPos.push({x:arrX[0],y:this.getYPos(arrX[0])});
        arrPos.push({x:arrX[1],y:this.getYPos(arrX[1])});
    }else{// kiem tra ca 4 duong 
        arrPos.push({x:arrX[0],y:this.getYPos(arrX[0])});
        arrPos.push({x:arrX[1],y:this.getYPos(arrX[1])});
        arrPos.push({x:this.getXPos(arrY[0]),y:arrY[0]});
        arrPos.push({x:this.getXPos(arrY[1]),y:arrY[1]});
    }
    this.pos_contact.x=-10000;
    this.pos_contact.y=-10000;
    for (var i_t = 0,imax=arrPos.length; i_t < imax; i_t++) {
        var pos_c=arrPos[i_t];
        var cxx=this.CheckPositionInLine(pos_c);
        if (cxx) {
            this.pos_contact.x=pos_c.x;
            this.pos_contact.y=pos_c.y;
        }
    }
    if (this.pos_contact.x==-10000) {// vì lý do gì đấy khôgn biết được ,mà không thể tìm được giao điểm thì lấy chính vị trí hiện tại của viên đạn 
        this.pos_contact.x=this.pos.x;
        this.pos_contact.y=this.pos.y;

        
    }
}
Bullet.prototype.CheckPositionInLine = function (pos_check){
   var am= Math.sqrt(Math.pow(pos_check.x-this.lastPos.x, 2) + Math.pow(pos_check.y-this.lastPos.y, 2));
   var bm= Math.sqrt(Math.pow(pos_check.x-this.pos.x, 2) + Math.pow(pos_check.y-this.pos.y, 2));
   var ab= Math.sqrt(Math.pow(this.lastPos.x-this.pos.x, 2) + Math.pow(this.lastPos.y-this.pos.y, 2));
   var d_distance=Math.abs(ab-am-bm);

   //console.log("d_distance: %s  (%s , %s)  k=%s",Number(d_distance).toFixed(2),Number(pos_check.x).toFixed(2),Number(pos_check.y).toFixed(2),Number((pos_check.y-this.rootPos.y)/(pos_check.x-this.rootPos.x)).toFixed(2));
   if (d_distance<0.2) {
        return true;
   }else{
        return false;
   }
}















module.exports = Bullet;