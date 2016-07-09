var Player=require('./LIB/Player');
var Code=require('./LIB/Code');
var Room=require('./LIB/Room');
var Utils = require('./LIB/Utils');


var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http,{'pingInterval': 2000, 'pingTimeout': 5000});

app.use(express.static(__dirname + '/DataGame'));

app.get('/config', function(req, res){
  
   var objectsend={};
  objectsend.display_banner=1;
  objectsend.display_fullscreen=1;
  objectsend.port=2020;
  objectsend.gameip="104.197.35.76";//ip server dat tai my
 
  if (req.query.local !== 'undefined') {
  		var timezone = Number(req.query.local);
	  if (timezone >= (-2) && timezone <= 4) {
	  	objectsend.gameip="104.155.45.73";//ip server dat tai EU:  104.155.45.73
	  } else if (timezone > 4) {
	  	objectsend.gameip="104.199.172.133";//ip server o chau A   : 104.199.172.133
	  }			
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.send(""+JSON.stringify(objectsend));  
});

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
var FRAME_STEP_INTERVAL = 40/1000;

io.on('connection', function(socket){
	waiting_id=waiting_id+1;
	if (waiting_id>99999999) {
		waiting_id=1;
	}
	
	socket.wait_id=waiting_id;
	socket.validatetime=MAX_TRY;
	socket.loaded=false;
	WAITING_SOCKET_LIST[waiting_id]=socket;

	socket.on('tathetcacketnoi',function(client_data){ //for admin only
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
		console.log("MyInfo:"+ JSON.stringify(client_json_data));
		if (client_json_data.platform===9) {
			var codeend=new Code();
			codeend.endcodeiOS();
            var data = {key:codeend.key1,id:socket.wait_id};
			console.log("Response	:"+ JSON.stringify(data));	
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
		
	});

	socket.on('MyValidate',function(client_data){
		console.log('client validate '+ JSON.stringify(client_data));
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
			player.name=socket.usrdpl;

			var room_id=null;
			for(var key  in ROOM_LIST){
				console.log("ROOM_LIST[key].countUser: %s",ROOM_LIST[key].getEstablishedSocket());
				if (ROOM_LIST[key].getEstablishedSocket() < 100) {// user limit =100
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
				new_room.addPlayer(player, socket);
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
		if (socket.is_removed ){
			return;
		}
		var socket_wait_id=socket.wait_id;
		if (socket_wait_id=="XXX") {
			console.log("ket noi kiem soat vua dong ket noi: "+socket.admin_id);
			delete ADMIN_CONNECT[socket.admin_id];
			return;
		}
		
		delete CODE_LIST[socket_wait_id];
		delete WAITING_SOCKET_LIST[socket_wait_id];
		delete SOCKET_LIST[socket_wait_id];
		//console.log("socket disconnected: id=%s da duoc go bo khoi room name :%s",socket.wait_id,socket.room_name);
		if (typeof(socket.room_name)!== 'undefined') {
			var roomdelete=ROOM_LIST[socket.room_name];
			if (typeof(roomdelete)=== 'undefined'){
				console.log("---ERROR CODE--------------loi gi do roi , khong tim thay room :"+socket.room_name);
			}else{
				roomdelete.removePlayer(socket_wait_id);
			}			
		}else{
			console.log("client khong phan hoi viec validate key , het timeout room name undefined"+socket_wait_id);
			if (typeof(socket.player)!== 'undefined') {
				console.log("---ERROR CODE---------cho nay vo cung kho hieu -----------"+socket.player);
			}
		}
		

		socket.player=null;
  	});

});



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
		console.log("het thoi gian nen xoa: "+socketObj_delete.wait_id); //xoa mai khong het ==> verify
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


function deleteDeadPlayer(room){
		var dead_player_arr = room.deleteDeadPlayer();
		for (var id in dead_player_arr){			
			var socket=SOCKET_LIST[dead_player_arr[id]];
			if (socket === null){ //user disconnected before be disconnected
				return;
			}
			if (typeof(socket)=== 'undefined'){
				return;
			}
			var socket_wait_id=socket.wait_id;			
			delete CODE_LIST[socket_wait_id];
			delete WAITING_SOCKET_LIST[socket_wait_id];
			delete SOCKET_LIST[socket_wait_id];
			socket.is_removed = true;
			console.log('server disconnect =======socket.is_removed ' +socket.is_removed);
			socket.disconnect(true);			
			
		}
}

var sizesend=0;
//update every thing in map
setInterval(function(){	
	for(var room_name  in ROOM_LIST){
		var room=ROOM_LIST[room_name];		
		deleteDeadPlayer(room);		//delete dead player from room
		room.updateFrameStep(FRAME_STEP_INTERVAL); //update every thing in the room
	}

	for (var socket_name in SOCKET_LIST) {
		var socket=SOCKET_LIST[socket_name];

		
			var up_step=socket.player.update_step;
			var objectsend={
				t:socket.player.pack_player,
				b:socket.player.pack_bullet,
				e:socket.player.pack_explosion			
			};
			if (up_step) {
				objectsend.o=socket.player.pack_obs;
				objectsend.i=socket.player.pack_item;
			}
			sizesend=sizesend+Utils.sizeof(objectsend);
			socket.emit('UpdatePosition',objectsend);			
			
	}
},40);

//update all tank in the map

setInterval(function(){	

	for(var room_name  in ROOM_LIST){
		var room = ROOM_LIST[room_name];		
		room.updateTankMap(); //update the map of all tanks
	}

	for (var socket_name in SOCKET_LIST) {
		var socket=SOCKET_LIST[socket_name];
		
			var room = ROOM_LIST[socket.room_name];		
			socket.emit('UpdateTankMap',room.all_tank_pack);		
		
	}

	//console.log("sizesend: %skb",sizesend/1024);
	sizesend=0;
	


},1000);


function deleteEmptyRoom(){
	var room_arr_to_delete =[];
	for(var room_name  in ROOM_LIST){
		var room=ROOM_LIST[room_name];		
		
		if (room.getEstablishedSocket()=== 0 && room.getDeadPlayerNumber() === 0 ) {
			room_arr_to_delete.push(room_name);
		}
	}
	
	for (var i=0; i < room_arr_to_delete.length; i++){
		console.log('delete room '+room_arr_to_delete[i]);		
		delete ROOM_LIST[room_arr_to_delete[i]];
	}
	 
}

//get player with highest score

setInterval(function(){	

	deleteEmptyRoom();
	
	for(var room_name  in ROOM_LIST){
		var room = ROOM_LIST[room_name];		
		room.updateBestPlayers(); //update the map of all tanks
	}

	for (var socket_name in SOCKET_LIST) {
		var socket=SOCKET_LIST[socket_name];
		//socket can be 
		
		var room = ROOM_LIST[socket.room_name];		
		socket.emit('BestPlayers', room.best_players);							
		
	}

},5000);
