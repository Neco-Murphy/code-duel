var fs = require('fs');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var db = require('./db');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/client'));

// Log server errors
process.on('uncaughtException', function (err) {
    console.log(err);
});

// globals
var users = {
  userCount: 0,
  socketList: [],
  userNames: [],
  userRooms: []
};

io.on('connection', function(socket){

  // individual user
  var userId = socket.id;

  // add user to count
  users.userCount++;
  console.log("");
  console.log("Socket", userId, "connected");

  //grab all the highscores from the db and send them to login view
  db.getAllScores(function(err, scores){
    socket.emit('getHighScores', scores);
  });

// ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~


  // add to room
  socket.on('addToRoom', function(userInfo){
    // console.log('username is ', username);
    var user = userInfo.username;
    var room = userInfo.roomname;

    console.log('room is ', room);
    // variable used to determine number of users in a room
    var roomLen = io.sockets.adapter.rooms[room];


    // if room isn't full, add the user and update the users object

    var addUser =  function(){
      if (users.socketList.indexOf(userId) === -1){
        users.socketList.push(userId);
        users.userNames.push(user);
        //store an array of userID, user, room, score and code
        users.userRooms.push([userId, user, room, 0, 'not submitted yet']);
        socket.join(room);
        //send room and user data to room
        var roominfo = {
          name: room,
          id: userId,
          player: user
        };

        console.log(user ,"(",userId,")", "added to", room);
        setTimeout(function() {
          io.sockets.in(userId).emit('joinedRoom', roominfo);
        }, 1000);
      }
    };


    //   //check if user exist
    // db.checkIfUserExists(user, function(exists){
    //   if(exists){
    //    console.log('exists')
    //     db.updateUser(user, userId);
    //   } else {
    //     console.log('adding user')
    //     db.addUser(user, userId);

    //   }

    // });


    // when room has a total of 2 people,
     //prompt to that specific room
    var providePrompt = function(specificRoom){

      // this logic just grabs a random prompt
      var prompts = fs.readdirSync('./problems');
      // the directories in the 'problems' directory must be names after
      // their corresponding functions and there cannot be anything in
      // 'problems' that isn't a problem directory
      var problemName = prompts[Math.floor(Math.random() * prompts.length)];
      // reads the prompt from the appropriate directory and
      // sends it to a single room (the one pinging providePrompt)
      fs.readFile('./problems/' + problemName + '/prompt.js', 'utf8',
        function(err,data) {
        if (err) {
          console.error(err);
        }
        else {
          var prompt = data;
          io.sockets.in(specificRoom).emit('displayPrompt', {prompt: prompt, problemName: problemName, opponents: users.userNames});
        }
      });
    };


    // user one, room doesn't exist
    if(!roomLen){
      addUser();

    // second user to a single room
    } else if (Object.keys(roomLen).length === 1 || Object.keys(roomLen).length === 3 && users.socketList.indexOf(userId) === -1){
       // "highScore" is used later to evaluate whether both users in a room have submitted code
      io.sockets.adapter.rooms[room]['highScore'] = undefined;
      io.sockets.adapter.rooms[room]['firstPlayer'] = null;
      addUser();
      setTimeout(function(){
        providePrompt(room);
      }, 1000);
    }

  });

// ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~

  //helper fuction checks if room is full
  socket.on('checkRoom', function(specificRoom){
    var roomLen = io.sockets.adapter.rooms[specificRoom];
    var isFull;

    if(!roomLen){
      isFull = false;
    } else {
      // this needs to check for 4 items because
      // we're adding two extra properties per user the roomLen array
      isFull = Object.keys(roomLen).length > 3 ? true : false;
    }

    console.log("Fullness status of", specificRoom, ":", isFull);
    io.emit('roomStatus', isFull);

  });

  // ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~

  socket.on('timeUp', function(){
    //compare 2 codes and send the result to the user (will recieve twice)
    //call gameOver function here
  });

  // ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~

  var gameOver = function(code, score, test, userId, isPerfect) {

    var currentRoom;
    var currentUser = userId;
    var currentScore;
    var currentCode;
    var opponentId;
    var opponent;
    var opponentScore;
    var opponentCode;


    //assign user information
    //find user info by looking at users object
    for(var i = 0; i < users.userRooms.length; i++){
      if(users.userRooms[i][0] === currentUser){
          currentRoom = users.userRooms[i][2];
          if(isPerfect){
            currentScore = users.userRooms[i][3] = score;
            currentCode = users.userRooms[i][4] = code.code;
          }else{
            currentScore = users.userRooms[i][3];
            currentCode = users.userRooms[i][4];
          }
          break;
      }
    }

    //assign user information
    //find opponent by looking at users object
    for(var i = 0; i < users.userRooms.length; i++){
      console.log('checking the opponent')
      if(users.userRooms[i][2] === currentRoom && users.userRooms[i][0] !== currentUser){
        console.log('found the opponent')
        opponentId = users.userRooms[i][0];
        opponent = users.userRooms[i][1];
        opponentScore = users.userRooms[i][3];
        opponentCode = users.userRooms[i][4];
        break;
      }
    }

    var date = new Date();
    date = (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear();

    //compile results to store in db
    var results = {
      prompt: code.problemName,
      roomname: code.roomname,
      time: date
    }
    
    if(currentScore === 0 && opponentScore === 0){

      io.sockets.in(currentUser).emit('isWinner', {isWinner: false, opponentScore: opponentScore});
      io.sockets.in(opponentId).emit('isWinner', {isWinner: false, opponentScore: currentScore});

    }else if(isPerfect || currentScore > opponentScore){

      io.sockets.in(currentUser).emit('isWinner', {isWinner: true, opponentScore: opponentScore});
      io.sockets.in(opponentId).emit('isWinner', {isWinner: false, opponentScore: currentScore});
      results.winner = code.player;
      results.loser = opponent;
      results.score = currentScore;
      results.loserScore = opponentScore;
      db.saveScore(results);

    }else{
      
      io.sockets.in(currentUser).emit('isWinner', {isWinner: false, opponentScore: opponentScore});
      io.sockets.in(opponentId).emit('isWinner', {isWinner: true, opponentScore: currentScore});
      results.winner = opponent;
      results.loser = code.player;
      results.score = opponentScore;
      results.loserScore = currentScore;
      db.saveScore(results);
    }
  }

  // ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~


    var compareScore = function(userId, score, code){
      // look at the user obj to figure out where we are currently
      for(var i = 0; i < users.userRooms.length; i++){
        if(users.userRooms[i][0] === userId){
          //if its the first submit or the new score is the higher than the last one, assign new score and code
          if(!users.userRooms[i][3] || score > users.userRooms[i][3]){
            users.userRooms[i][3] = score;
            users.userRooms[i][4] = code.code;
          }
          return users.userRooms[i][3];
        }
      }
    };

  // ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~

  socket.on('sendCode', function(code){

    var errorsInCode = false;

    try {
      // get the function evaluated
      eval(code.code);
    } catch (e) {
      //if there is an error log..
      console.log(e);
      //and score is set to zero
      errorsInCode = true;
      var score = 0;
    }


    // grab the tests
    var test = require('./problems/' + code.problemName + '/test.js');

    if(!errorsInCode){
      try {

      var percentageRight = test.testFunction(eval(code.problemName));
      // Get the time it took to write the function
      var timeTaken = code.timeTaken;
      // Compute the score

      // The algorithm is mostly based on the tests with time taken
      // used to break ties between people who passed the same tests
      console.log('rwf', percentageRight);
      console.log('rwf', timeTaken);
      var score = Math.floor((percentageRight * 10) + (100/timeTaken));
      console.log("Final score is: " + score);

      } catch (e) {
        //log message if error when tests are run
        console.log(e);
        //set score to zero
        var score = 0;
      }
    }


    //check if the user got a perfect score
    if(percentageRight === 100){
      io.sockets.in(userId).emit('sendScore', score);
      gameOver(code, score, test, userId, true);
    }else{
      io.sockets.in(userId).emit('sendScore', compareScore(userId, score, code));
    }

  });


  // ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~  ***  ~~~~~~~~~~~~~

  // detects when socket disconnects and cleans up users obj
  socket.on('disconnect', function(){
    console.log("");
    console.log("Socket", userId, "disconnected");

    for(var i = 0; i < users.userRooms.length; i++){
      if(users.userRooms[i][0] === userId){

        // destroy "room" session for all users
        var currentRoom = users.userRooms[i][2];
        io.sockets.in(currentRoom).emit('destroyPrompt');

        // remove user/room from object
        users.userRooms.splice([i], 1);
        break;
      }
    }

    for(var i = 0; i < users.socketList.length; i++){
      if(users.socketList[i] === userId){
        users.socketList.splice([i], 1);
        users.userNames.splice([i], 1);
        break;
      }
    }

    users.userCount--;
    console.log("Remaining activity:");
    console.log(users);
  });
});

http.listen(port, function(){
  console.log('listening on port:', port);
});
