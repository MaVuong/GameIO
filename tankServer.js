var Player=require('./LIB/Player');
var Code=require('./LIB/Code');
var Room=require('./LIB/Room');
var Utils = require('./LIB/Utils');
var os = require('os');
var mongojs = require("mongojs");
var ifaces = os.networkInterfaces();

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http,{'pingInterval': 2000, 'pingTimeout': 5000});
var us_server = "10.138.0.2";
//var us_server = "10.1.63.32";
var server_id = 0;
app.use(express.static(__dirname + '/DataGame'));
var update_best_player_frame = 0;
var ready_best_player = true;
var FRAME_DURATION = 40;
var db = mongojs('localhost:27017/tankio', ['players']);


app.get('/config', function(req, res){
  console.log('come here');
   var objectsend={};
  objectsend.display_banner=1;
  objectsend.display_fullscreen=1;
  objectsend.port=2020;
  objectsend.gameip="tank.gameio.live";//ip server dat tai my
 
  if (req.query.local !== 'undefined') {
  		var timezone = Number(req.query.local);
	  if (timezone >= (-2) && timezone <= 4) {
	  	objectsend.gameip="tankeu.gameio.live";//ip server dat tai EU:  104.155.45.73
	  } else if (timezone > 4) {
	  	objectsend.gameip="tankasia.gameio.live";//ip server o chau A   : 104.199.172.133
	  }			
  }
  res.setHeader('Content-Type', 'application/json');
  res.send(""+JSON.stringify(objectsend));  
});

http.listen(2020,'::', function(){
	console.log('---------------->listening on : 2020');
});



var CODE_LIST={};
var WAITING_SOCKET_LIST={};
var SOCKET_LIST={};
var ROOM_LIST={};
var ADMIN_CONNECT={};
var OTHER_SERVERS = {};
var BEST_PLAYERS = [];

var room_count=0;
var admin_id=0;
var waiting_id=0;
var MAX_TRY = 6;
var count_frame = 0;
var FRAME_STEP_INTERVAL = 40; //miliseconds
var isMasterServer = null;

getIpAddress(loadData, sendMyInfo);

function getIpAddress(cb1, cb2){
	Object.keys(ifaces).forEach(function (ifname) {
	  ifaces[ifname].forEach(function (iface) {
		if ('IPv4' !== iface.family || iface.internal !== false) {
		  // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
		  return null;
		}
		isMasterServer = (iface.address === us_server); 
		console.log('isMasterServer '+isMasterServer);
		if (isMasterServer){
			cb1();
		} else {
			cb2();
		}
	  });
	});	
}


function loadData(){
	//load best players from mongodb
	findBestPlayersList(initBestPlayerArr);
	setInterval(function(){	
		writeBestPlayerList();//write data to database
	},FRAME_DURATION*250);//10s
	
}
//load the data on databse to BEST_PLAYERS 
function initBestPlayerArr(items){
	for (var i=0; i < items.length; i++){
		var player = items[i];
		BEST_PLAYERS.push({id:player.id, n:player.name, s:player.score});	
		//console.log("init best player "+JSON.stringify(BEST_PLAYERS));	
	}
}




//================================Begin slave server functions==========================================================//

function sendMyInfo(){
	
	var socket = require("socket.io-client")('http://'+us_server+':2020');
	
	socket.on('connect', function () {		
		socket.emit('MyInfo', JSON.stringify({platform:-100}));					
		socket.on('ConnectionEstablished',function(){ //for update score		
			sendBestPlayers(socket);
		
				socket.on('BestPlayers',function(client_data){ //for update score
					//console.log("receive BestPlayers "+JSON.stringify(client_data) );
					updateBestPlayers(client_data);
					//console.log("after receive BestPlayers "+JSON.stringify(BEST_PLAYERS) );			
		});
		
	});
		
	});	
}



function updateBestPlayers(client_data){
	if (ready_best_player){
		ready_best_player = false;	
		BEST_PLAYERS = [];
		for (var i=0; i < client_data.length; i++){				
			BEST_PLAYERS.push(client_data[i]);
		}	
		ready_best_player = true;		
	}
}


//send best player to master server
function sendBestPlayers(socket){		
	setInterval(function(){	
		var objToSend = getBestPlayers();				
		socket.emit('updateScore123', JSON.stringify(objToSend));
	},4000);
	
	
}

	
	

//================================End slave server functions==========================================================//

//===============================Begin master server functions =======================================================//

function findBestPlayersList(cb){	
	db.players.find().toArray(function(err, items) {
          if (err) {
            console.log(err);
          } else {	
			cb(items);
          }          
});
}



//write best player to database
function writeBestPlayerList(){
	ready_best_player = false;
	var tmpArr = Utils.copyArray(BEST_PLAYERS);
	ready_best_player = true;

	if (tmpArr.length > 0){				
		mergeBestPlayerAndStore(tmpArr);		
	};
	
	}


function mergeBestPlayerAndStore(current_best_players){	
	db.players.find().toArray(function(err, items) {
          if (err) {
            console.log(err);
          } else {	
			var arr = mergeBestPlayers(current_best_players, items);
			//reset best player in the memore
			ready_best_player = false;
			BEST_PLAYERS = [];
			Utils.copyToArray(arr, BEST_PLAYERS);		
			ready_best_player = true;
			storeBestPlayers(arr);
          }          
});
}

function storeBestPlayers(best_player_arr){
	db.players.remove({}, function(err,res){
		if (!err && ready_best_player){
				for (var i =0; i < best_player_arr.length; i++){
					var player = best_player_arr[i];						
					db.players.insert({id:player.id, name:player.n,score:player.s});					
				}
		}
	});	
}


function updateBestPlayerAtMaster(current_best_players){
	var i= 0;
	var count = 0;				
	BEST_PLAYERS = [];
	while (i < current_best_players.length && count < 5){				
		BEST_PLAYERS.push(current_best_players[i]);
		count++;			
		i++;
	}						
		
}

//===============================End master server functions =======================================================//


io.on('connection', function(socket){
	console.log("receive connection");
	waiting_id=waiting_id+1;
	if (waiting_id>99999999) {
		waiting_id=1;
	}
	var address = socket.handshake.address;
 	//console.log("address: %s",address);
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

	//get score update from slave server
	socket.on('updateScore123', function(client_data){ //for update score
			if (ready_best_player){
				ready_best_player = false;
				var received_best_players = JSON.parse(client_data);			
				
				var current_best_players = Utils.copyArray(BEST_PLAYERS);	

				//console.log("recieve best player "+JSON.stringify(ready_best_player));
				//console.log("current best player "+JSON.stringify(current_best_players));
				
				var arr = mergeBestPlayers(current_best_players, received_best_players);
				//console.log("arr "+JSON.stringify(arr));
				arr.sort(function(player1, player2) { return (player2.s - player1.s);});				
				updateBestPlayerAtMaster(arr);
				ready_best_player = true;
			}
	});
	
		
	socket.on('MyInfo',function(client_data){
		var client_json_data=JSON.parse(client_data);
		
		
		if (client_json_data.platform>8&&client_json_data.platform<12) {
			var codeend=new Code();
			if (client_json_data.platform===9) {
				codeend.endcodeiOS();
			}
			if (client_json_data.platform===10) {
				codeend.JSEncode();
			}
			var clientName=client_json_data.usr;
			if (clientName.length>=12){
				socket.disconnect(true);
				return;
			}
			var data = {key:codeend.key1,id:socket.wait_id};
			socket.emit('RequestValidate',data);
			CODE_LIST[waiting_id]=codeend.key2;
			socket.usrdpl=client_json_data.usr;
			socket.ccode=client_json_data.code;
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
			}else if (client_json_data.platform===-100) {//other servers
				delete WAITING_SOCKET_LIST[socket.wait_id];

				server_id++;
				socket.validatetime=2000;
				socket.wait_id="YYY";
				socket.server_id=""+server_id;
				OTHER_SERVERS[socket.server_id]=socket;				
				socket.emit('ConnectionEstablished');
				
			} else	{
				console.log("AAAAAAA:"+client_data);
				socket.disconnect();
			}
			
		}
		
	});

	socket.on('MyValidate',function(client_data){
		//console.log('client validate '+ JSON.stringify(client_data));
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

			var player=new Player(socket_wait_id);
			player.name=socket.usrdpl;
			var c_code=socket.ccode;
			if(typeof(c_code)!='undefined'){
				if(c_code.length==2){
					player.ccode=socket.ccode;
				}
			}

			var room_id=null;
			for(var key  in ROOM_LIST){
				//console.log("ROOM_LIST[key].countUser: %s",ROOM_LIST[key].getEstablishedSocket());
				if (ROOM_LIST[key].getEstablishedSocket() < 50) {// user limit =100
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
		console.log("-----socket disconnected: id=%s da duoc go bo khoi room name :%s",socket.wait_id,socket.room_name);
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
			//console.log('server disconnect =======socket.is_removed ' +socket.is_removed);
			socket.disconnect(true);			
			
		}
}

setInterval(function(){	
	count_frame++;
	
	for(var room_name  in ROOM_LIST){
		var room=ROOM_LIST[room_name];		
		deleteDeadPlayer(room);		//delete dead player from room
		room.updateFrameStep(FRAME_STEP_INTERVAL/1000, count_frame); //update every thing in the room
	}
	
	if (count_frame%2 === 0 ){ //send data after 2 frame
		for (var socket_name in SOCKET_LIST) {
			var socket=SOCKET_LIST[socket_name];
			
				var up_step=socket.player.update_step;
				var objectsend={
					t:socket.player.pack_player,
					b:socket.player.pack_bullet,
					e:socket.player.pack_explosion
				};
				
				if (count_frame % 4 === 0 ){
					objectsend.i=socket.player.pack_item;
				}

				if (count_frame % 8 === 0 ){
					objectsend.o=socket.player.pack_obs;
		
				}				
				socket.emit('UpdatePosition',objectsend);							
		}		
	} else {
		if (count_frame === 1){
			for(var room_name  in ROOM_LIST){
				var room = ROOM_LIST[room_name];		
				room.updateTankMap(); //update the map of all tanks
			}

			for (var socket_name in SOCKET_LIST) {
				var socket=SOCKET_LIST[socket_name];
				
					var room = ROOM_LIST[socket.room_name];				
					socket.emit('UpdateTankMap',room.all_tank_pack);				
			}
			
		}
	}
	
	if (count_frame === 24 ){
		count_frame = 0;
	}
	
},FRAME_STEP_INTERVAL);


//update all tank in the map
/*
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


},1000);
*/



setInterval(function(){	

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
	

},3600000);//60x60x1000


//send best players ever to other servers and clients
setInterval(function(){	
		
		var tmpArr = Utils.copyArray(BEST_PLAYERS);
		
		//push best player list to clients
		for (var socket_name in SOCKET_LIST) {
			var socket=SOCKET_LIST[socket_name];				
			socket.emit('BestPlayers', tmpArr);				
			//console.log("send best player to client "+JSON.stringify(tmpArr));
		}
		
		//push best player list to slave servers		
		if (Object.keys(OTHER_SERVERS).length > 0){
			for (var socket_name in OTHER_SERVERS) {
			var socket=OTHER_SERVERS[socket_name];				
				//console.log("send best player to other server "+ready_best_player+"|"+JSON.stringify(tmpArr));
			socket.emit('BestPlayers',tmpArr);				
			}		
		}
	
},5000);



//update best players in the room
setInterval(function(){
	for(var room_name  in ROOM_LIST){
		var room = ROOM_LIST[room_name];		
		room.updateBestPlayers(); //update the map of all tanks
	}

},5000);



//get best players in this server, used with both master and slave servers
function getBestPlayers(){
	var best_players =[];

		for (var room_name in ROOM_LIST) {			
			var room = ROOM_LIST[room_name];
			var room_best_players = room.best_players;	
			for (var i =0; i < room_best_players.length; i++){
				best_players.push(room_best_players[i]);
			} 										
		}
		
	best_players.sort(function(player1, player2) { return (player2.s - player1.s);});	
	
	var i= 0;
	var count = 0;
	var arr = [];
	while (i < best_players.length && count < 5){				
		arr.push(best_players[i]);
			count++;			
			i++;
	}	
	return arr;
}


function mergeBestPlayers(arr1, arr2){
	
	for (var i=0; i < arr2.length; i++){
		var player2 = arr2[i];
		var exist = false;		
		for (var j=0; j < arr1.length; j++){
			
			if (player2.id === arr1[j].id){
				exist = true;
				if (player2.s > arr1[j].s){
					arr1[j].s =player2.s;
				}
				break;
			} 
		}
		if (!exist){
			arr1.push(player2);
		}	
	}
	
	arr1.sort(function(player1, player2) { return (player2.s - player1.s);});	
	
	var i= 0;
	var count = 0;
	var arr = [];
	while (i < arr1.length && count < 5){				
		arr.push(arr1[i]);
			count++;			
			i++;
	}	
	return arr;
	
}

//send best player to master server	
	setInterval(function(){	
		var tmpArr = Utils.copyArray(BEST_PLAYERS);
		var current_best_players = getBestPlayers();		
		var arr = mergeBestPlayers(tmpArr, current_best_players);
				//console.log("arr "+JSON.stringify(arr));
				arr.sort(function(player1, player2) { return (player2.s - player1.s);});				
				updateBestPlayerAtMaster(arr);		
		
	},4000);
	
