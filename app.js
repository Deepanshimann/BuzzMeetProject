const express=require("express");
const app=express();
const indexRouter=require("./routes/index")
const path=require("path");

const http =require("http");
const socketIO=require("socket.io");
const server=http.createServer(app);
const io=socketIO(server);

let waitingusers=[];
let rooms={};

io.on("connection",function(socket){

   socket.on("joinroom",function(){
   if(waitingusers.length>0){
let partner=waitingusers.shift();
const roomname=`${socket.id}-${partner.id}`

socket.join(roomname);
partner.join(roomname);

io.to(roomname).emit("joined",roomname);
   }else{
    waitingusers.push(socket);
   }
   });

   socket.on("signalingMessage",function(data){
    socket.broadcast.to(data.room).emit("signalingMessage",data.message);
   })

   socket.on("message",function(data){
    socket.broadcast.to(data.room).emit("message",data.message);
   })

   socket.on("startVideoCall",function({room}){
    socket.broadcast.to(room).emit("incomingCall");
   })

   socket.on("acceptCall", function({room}){
    socket.broadcast.to(room).emit("callAccepted");
   })
   socket.on("rejectCall", function({room}){
    socket.broadcast.to(room).emit("callRejected");
   })

 // Handle "leaveRoom" event
 socket.on("leaveRoom", function ({ room }) {
   socket.leave(room);

   // Notify the other user that the chat has ended
   socket.broadcast.to(room).emit("callEnded");

   // Remove the room and clean up
   let index = waitingusers.findIndex(waitingUser => waitingUser.id === socket.id);
   if (index !== -1) {
       waitingusers.splice(index, 1);
   }

   // Delete from rooms object
   delete rooms[socket.id];

   // Notify the client that they have left the room
   socket.emit("leftRoom");
});

//    socket.on("disconnect",function(){
//   let index= waitingusers.findIndex(
//     waitingUser=>waitingUser.id === socket.id);
//     waitingusers.splice(index,1);
//    });
socket.on("disconnect", function () {
   let roomname = rooms[socket.id];

   // Notify the other user in the room if the user disconnects
   if (roomname) {
       socket.broadcast.to(roomname).emit("callEnded");
       socket.leave(roomname);
   }

   let index = waitingusers.findIndex(waitingUser => waitingUser.id === socket.id);
   if (index !== -1) {
       waitingusers.splice(index, 1);
   }

   delete rooms[socket.id];
});
 
 })

app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));

app.use("/",indexRouter);

server.listen(3100);