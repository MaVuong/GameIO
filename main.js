var Player=require('./LIB/Player');
var Code=require('./LIB/Code');
var Room=require('./LIB/Room');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http,{'pingInterval': 2000, 'pingTimeout': 5000});
app.use(express.static(__dirname + '/DataGame'));

http.listen(2020, function(){
	console.log('listening on : 2020');
});

var CODE_LIST={};
var WAITING_SOCKET_LIST={};
var SOCKET_LIST={};
var ROOM_LIST={};
var ADMIN_CONNECT={};

var room_count=0;
var admin_id=0;
var waiting_id=0;

var MAX_TRY = 6;

io.on('connection', function(socket){
	waiting_id=waiting_id+1;
	if (waiting_id>99999999) {
		waiting_id=1;
	}
	
	socket.wait_id=waiting_id;
	socket.validatetime=MAX_TRY;
	socket.loaded=false;
	WAITING_SOCKET_LIST[waiting_id]=socket;

	socket.on('tathetcacketnoi',function(client_data){
		if (socket.wait_id=="XXX") {
			var json_data=JSON.parse(client_data);

			console.log("client_data:"+client_data);

			if (json_data.fnsend=="thoathetclient") {
				var msg=json_data.msgsend;
				for (var socket_id in SOCKET_LIST) {
					var client_socket=SOCKET_LIST[socket_id];
					client_socket.emit('ServerCloseMaintain',msg);
				}
				for (var socket_id in SOCKET_LIST) {
					var client_socket=SOCKET_LIST[socket_id];
					client_socket.disconnect();
				}
				SOCKET_LIST=[];
			}
		}
	});

	socket.on('MyInfo',function(client_data){


		var client_json_data=JSON.parse(client_data);
		if (client_json_data.platform===9) {
			var codeend=new Code();
			codeend.endcodeiOS();
            var data = {key:codeend.key1,id:socket.wait_id};

			socket.emit('RequestValidate',{key:codeend.key1,id:socket.wait_id+""});
			CODE_LIST[waiting_id]=codeend.key2;
			socket.usrdpl=client_json_data.usr;
		}else{
			if (client_json_data.platform===-1001) {
				if (admin_id>100000) {
					admin_id=0;
				}
				delete WAITING_SOCKET_LIST[socket.wait_id];

				admin_id++;
				socket.validatetime=2000;
				socket.wait_id="XXX";
				socket.admin_id=""+admin_id;
				ADMIN_CONNECT[socket.admin_id]=socket;
				
				//connection view info server, lma 1 app quan ly cai nay luon 
			}else{
				console.log("AAAAAAA:"+client_data);
				socket.disconnect();
			}
			
		}
		//console.log("MyInfo:"+client_json_data.usr);
	});

	socket.on('MyValidate',function(client_data){
		console.log('client validate '+ client_data);
		if (socket.loaded) {
			console.log("--------------------> client validate 2 lan lien -------");
			return;
		}
		
		var socket_wait_id=socket.wait_id;
		var key_check_2=CODE_LIST[socket_wait_id];

		if (key_check_2 === client_data) { //verify success
			delete CODE_LIST[socket_wait_id];
			delete WAITING_SOCKET_LIST[socket_wait_id];
			SOCKET_LIST[socket_wait_id]=socket;

			var player=new Player(socket_wait_id);
			player.lbdisplay=socket.usrdpl;

			var room_id=null;
			for(var key  in ROOM_LIST){
				if (ROOM_LIST[key].countUser < 100) {// user limit =100
					room_id=key;
					break;
				}
			}
			if (room_id === null) {
				room_count++;
				if (room_count>1000000) {
					room_count=1;
				}
				// khoi tao room va add vao list_room
				room_id=room_count;
				var new_room=new Room(room_id);
				ROOM_LIST[room_id]=new_room;
				new_room.loadMapAndAI();
				new_room.addPlayer(player);
			}else{
                ROOM_LIST[room_id].addPlayer(player);
			}

			socket.loaded=true;
			player.room_id=room_id;
			socket.room_name=room_id;
			socket.player=player;
		}else{
			console.log("co mot ket noi khong hop le:"+socket.wait_id);
			socket.disconnect();

		}
	});



	socket.on('changeDir',function(client_data){
		var new_direction = Number(client_data);
		if (new_direction>=1 && new_direction<=4 && socket.loaded) {
			socket.player.setNewDirection(new_direction);
		}
	});

	socket.on('fireTarget',function(client_data){
		var target_angle=Number(client_data);
		if (target_angle >=0 && target_angle <= 360 && socket.loaded) {
			socket.player.changeGunAngle(target_angle);
		}
	});


	socket.on('disconnect', function () {
		var socket_wait_id=socket.wait_id;
		if (socket_wait_id=="XXX") {
			console.log("ket noi kiem soat vua dong ket noi: "+socket.admin_id);
			delete ADMIN_CONNECT[socket.admin_id];
			return;
		}
		
		delete CODE_LIST[socket_wait_id];
		delete WAITING_SOCKET_LIST[socket_wait_id];
		delete SOCKET_LIST[socket_wait_id];
		console.log("socket disconnected: id=%s da duoc go bo khoi room name :%s",socket.wait_id,socket.room_name);
		if (typeof(socket.room_name)!== 'undefined') {
			var roomdelete=ROOM_LIST[socket.room_name];
			if (typeof(roomdelete)=== 'undefined'){
				console.log("---ERROR CODE--------------loi gi do roi , khong tim thay room :"+socket.room_name);
			}else{
				roomdelete.removePlayer(socket_wait_id);
			}			
		}else{
			console.log("client khong phan hoi viec validate key , het timeout "+socket_wait_id);
			if (typeof(socket.player)!== 'undefined') {
				console.log("---ERROR CODE---------cho nay vo cung kho hieu -----------"+socket.player);
			}
		}
		

		socket.player=null;
  	});

});

setInterval(function(){
	for(var irname  in ROOM_LIST){
		var roomtmp=ROOM_LIST[irname];
		var croomusr=roomtmp.getEstablishedSocket();
		if (croomusr==0) {
			delete ROOM_LIST[irname];
			break;
		}
	}
},5000);



setInterval(function(){
	var arrayDelete=[];
	for(var i  in WAITING_SOCKET_LIST){
		var socketObj=WAITING_SOCKET_LIST[i];
		socketObj.validatetime=socketObj.validatetime-1;
		if (socketObj.validatetime<0) {
			arrayDelete.push(i);
		}
	}
	var lengthdelete=arrayDelete.length;
	for(var mx=0;mx<lengthdelete;mx++){
		var indexDelte=arrayDelete[mx];
		var socketObj_delete=WAITING_SOCKET_LIST[indexDelte]; 
		socketObj_delete.disconnect();
		console.log("het thoi gian nen xoa: "+socketObj_delete.wait_id);
	}
	arrayDelete=[];



	var length_admID=0;
	for(var va in ADMIN_CONNECT){
		length_admID=length_admID+1;
	}
	if (length_admID>0) {
		for(var va in ADMIN_CONNECT){
			var leng1=0;
			for(var i  in WAITING_SOCKET_LIST){
				leng1=leng1+1;
			}
			var leng2=0;
			for(var i  in CODE_LIST){
				leng2=leng2+1;
			}
			var tmpalluser=0;
			for (var sname in SOCKET_LIST) {
				tmpalluser=tmpalluser+1;
			}

			var c_room=0;
			for (var xcsroom in ROOM_LIST) {
				c_room=c_room+1;
			}

			var adminsk=ADMIN_CONNECT[va];
			adminsk.validatetime=adminsk.validatetime-1;
			if (adminsk.validatetime>0) {
				var demuserthat=waiting_id-admin_id;
				var datainfo={waitingSK:leng1,waitingCode:leng2,countplay:tmpalluser,
							  admcount:length_admID,timeleft:adminsk.validatetime,
							  countroom:c_room,maxplayerID:demuserthat,admin_id:adminsk.admin_id};
				adminsk.emit('updateInfoAdmin',datainfo);
			}else{
				adminsk.disconnect();
			}
			
		}
	}
	

},1000);



setInterval(function(){
	var timedt=40/1000;
	for(var irname  in ROOM_LIST){
		var roomtmp=ROOM_LIST[irname];
		roomtmp.updateFrameStep(timedt);
	}

	for (var sname in SOCKET_LIST) {
		var usr_tmp=SOCKET_LIST[sname];
		var numbersend=usr_tmp.player.id +"";		
		
		/*
		if (usr_tmp.player.pack_item.length > 0){
			console.log('emit '+JSON.stringify(usr_tmp.player.pack_item));
		}*/
		usr_tmp.emit('UpdatePosition',{
			numberID:numbersend,
			tank:usr_tmp.player.pack_player,
			obstacbles:usr_tmp.player.pack_obs,
			bullet:usr_tmp.player.pack_bullet,
			explosion: usr_tmp.player.pack_explosion,
			item:usr_tmp.player.pack_item
		});
		
	}
},40);