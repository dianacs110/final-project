// This file is required by app.js. It sets up event listeners
// for the two main URL endpoints of the application - /create and /chat/:id
// and listens for socket.io messages.
//we Export a function, so that we can pass 
// the app and io instances from the app.js file:
'use strict'

module.exports = function(app,io){
 //we use the get method for rendering home.html file on the screen
	app.get('/', function(req, res){

		res.render('home');
	});
      //when users click on the login buttom the create method generates new private chat room
	app.get('/create', function(req,res){

		// here we create unique id for the room
		let id = Math.round((Math.random() * 1000000));

		// res.redirect Redirects to the random room
		res.redirect('/chat/'+id);
	});
// then by the use of get method we get the chat.html file and
	app.get('/chat/:id', function(req,res){

		// Render it on the page 
		res.render('chat');
	});

	// after this we Initialize a new socket.io application, named 'chat'
	let chat = io.on('connection', function (socket) {

		// When the client emits the 'load' event, we reply with the 
		// number of people in this chat room

		socket.on('load',function(data){

			let room = findClientsSocket(io,data);
			if(room.length === 0 ) {

				socket.emit('peopleinchat', {number: 0});
			}
			else if(room.length === 1) {

				socket.emit('peopleinchat', {
					number: 1,
					user: room[0].username,
					id: data
				});
			}
			//we want our chat to be private so here we declare each room not to include more than  two people
			else if(room.length >= 2) {

				chat.emit('tooMany', {boolean: true});
			}
		});

		// When the client emits 'login', we save his name 
		// and add them to the room
		socket.on('login', function(data) {

			let room = findClientsSocket(io, data.id);
			// Only two people per room are allowed
			if (room.length < 2) {

				// Use the socket object to store data. Each client gets
				// their own unique socket object

				socket.username = data.user;
				socket.room = data.id;
				
				// then we Add the client to the room by socket.join method
				socket.join(data.id);

				if (room.length == 1) {
//here we create an array for storing our usernames
					let usernames = []
                 // we use push() method to add new usernames to the end of an array
					usernames.push(room[0].username);
					usernames.push(socket.username);

					

					// we Send the startChat event to all the people in the
					// room, along with a list of people that are in it.

					chat.in(data.id).emit('startChat', {
						boolean: true,
						id: data.id,
						users: usernames
					});
				}
			}
			else {
				socket.emit('tooMany', {boolean: true});
			}
		});

		// this is the disconnection function
		socket.on('disconnect', function() {

			// if somebode leaves the chat we Notify the other person in the chat room
			// that his partner has left

			socket.broadcast.to(this.room).emit('leave', {
				boolean: true,
				room: this.room,
				user: this.username
			});

			// leave the room
			socket.leave(socket.room);
		});


		// by the use of socket.on method we Handle the sending of messages
		socket.on('msg', function(data){

			//here When the server receives a message, it sends it to the other person in the room.
			socket.broadcast.to(socket.room).emit('receive', {msg: data.msg, user: data.user});
		});
	});
};

function findClientsSocket(io,roomId, namespace) {
	let res = [],
		ns = io.of(namespace ||"/");    // the default namespace is "/" Each namespace emits a connection event that receives each Socket instance as a parameter, To set up a custom namespace, we can call the of function

	if (ns) {
		for (let id in ns.connected) {
			if(roomId) {
				let index = ns.connected[id].rooms.indexOf(roomId) ;
				if(index !== -1) {
					res.push(ns.connected[id]);
				}
			}
			else {
				res.push(ns.connected[id]);
			}
		}
	}
	return res;
}


