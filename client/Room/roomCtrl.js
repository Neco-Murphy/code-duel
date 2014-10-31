angular.module('app')
  .controller('roomCtrl', function($scope, $log, $timeout, socket) {
    $scope.sent = false;
    var clock = $('.clock').FlipClock(600, {
      clockFace: 'MinuteCounter',
      autoStart: false,
      countdown: true,
      callbacks: {
        stop: function(){
          var currentTime = clock.getTime();
          if(currentTime.time === 0){
            $scope.timesup = true;
            //disable submit and reset button
            $('.submitButton').prop('disabled', true);
            $('.resetButton').prop('disabled', true);
            //send timeUp signal to the server
            socket.emit('timeUp');
          }
        }
      }
    });
     //timer init variables
     $scope.clock = {
       time: 0,
       min: 0,
       sec: 0,
       timer: null,
       notcalled: true
     };

     $scope.noOpponent = true;
     $scope.finishBeforeOpponent = false;
     $scope.victory=false;
     $scope.defeat=false;
     $scope.Gameover = false;

     //here are our variables for start theme and prompt
     var theme = "twilight";
     var editor = ace.edit("editor");
     var editorOpp = ace.edit("editorOpp");
     $scope.prompt = '//Your prompt will appear when your opponent joins the room \n //Ask a friend to join this room to duel';

    //this adds the editor to the view with default settings
    var setEditorDefault = function(editor, content, theme){
      editor.setHighlightGutterLine(true);
      editor.setTheme("ace/theme/"+ theme);
      editor.getSession().setMode("ace/mode/javascript");
      editor.setValue(content);
    };
    setEditorDefault(editor, $scope.prompt, theme);
    setEditorDefault(editorOpp, '//testing', theme);

     socket.on('joinedRoom', function(roominfo){
       console.log(roominfo.name + ' has been joined, BABIES');
       $scope.roomname = roominfo.name;
       $scope.playername = roominfo.player;
       $scope.playerId = roominfo.id;
     });

     //disable opponent code button as default
     $('.oponentCodeButton').prop('disabled', true);

     socket.on('displayPrompt', function(problem){
       console.log('received prompt: ' + JSON.stringify(problem));
       $scope.prompt = problem.prompt;
       $scope.problemName = problem.problemName;
       $scope.noOpponent=false;
       editor.setValue($scope.prompt);
       $scope.allPlayers = problem.opponents;

       //set opponents
        for(var i = 0; i < problem.opponents.length; i++){
          if($scope.playername === problem.opponents[i]){
            problem.opponents.splice(i, 1);
          }
        }
        $scope.opponents = problem.opponents;

       //delay clock 1 second to help sync up clocks
       if($scope.clock.notcalled){
         setTimeout(function(){
           $scope.startTimer();
         }, 1000);
         //only call timer 1x
         $scope.clock.notcalled = false;
       }
     });

    socket.on('destroyPrompt', function(){
      if(!$scope.Gameover){
        $scope.prompt = '//Your prompt will appear momentarily';
        editor.setValue($scope.prompt);
        $scope.noOpponent=true;
        $scope.stopTimer();
      }
     });

    socket.on('sendScore', function(codeScore){
      console.log(codeScore, "CODE SCORE");
      //var codeResult = codeScore.result;
      $scope.score = codeScore;
      $scope.finishBeforeOpponent=true;
      // editor.setValue('// Your score is: ' + $scope.score + '\n // Now waiting for your opponent to finish');
      //editor.setValue('// Your code resulted in: ' + codeResult + ' ||  Your score is: ' + $scope.score);
     });

    socket.on('isWinner', function(isWinner){
      console.log("is Winner??", JSON.stringify(isWinner.isWinner));
      editorOpp.setValue(isWinner.opponentCode);
      $scope.Gameover = true;
      $scope.finishBeforeOpponent = true;
      $scope.stopTimer();
      $(".oponentCodeButton").prop('disabled', false);
      setTimeout(function(){
        if(isWinner.isWinner){
          $scope.opponentScore = isWinner.opponentScore;
          $scope.message = "WINNER";
          // alert('wiiinnnnner');
          $('.well').html('YOU HAVE WON!'
            + '<br> Your score: ' + $scope.score
            + '<br>Your opponent\'s score: ' + isWinner.opponentScore
            + ''
            + '<br /> <a href="http://codeduel.azurewebsites.net">Go Home</a>');

        } else {
          $scope.opponentScore = isWinner.opponentScore;
          $scope.message = "LOSER";
          $('.well').html('YOU HAVE LOST!'
            + '<br> Your score: ' + $scope.score
            + '<br>Your opponent\'s score: ' + isWinner.opponentScore
            + ''
            + '<br /> <a href="http://codeduel.azurewebsites.net">Go Home</a>');
        }
      }, 1000);
     });

    //this is where we will need to test the code
    $scope.submit = function() {

      var userCode = editor.getValue();
      console.log('CODE-DUEL: Sending code to be evaluated.');

      socket.emit('sendCode',
        {
        code: userCode,
        problemName: $scope.problemName,
        timeTaken: $scope.clock.time,
        player: $scope.playername,
        roomname: $scope.roomname,
        id: $scope.playerId,
        players: $scope.allPlayers
      });
      // $scope.stopTimer();
      // $scope.sent = true;
    };

    $scope.flip = function(){
      if($('.flipper').hasClass('flip')){
        $('.oponentCodeButton').text('Opponent\'s Code');
      }else{
        $('.oponentCodeButton').text('Your Code');
      }
      $('.flipper').toggleClass('flip');
    };

    //this resets the editor to the original prompt
    $scope.reset = function() {
      console.log('reset');
      console.log($scope.prompt);
       editor.setValue($scope.prompt);
    };

    $scope.startTimer = function() {
      clock.start();
      $scope.clock.timer = $timeout(function(){
        $scope.clock.time++;
        $scope.clock.sec++;
        if ($scope.clock.sec === 60) {
          $scope.clock.min++;
          $scope.clock.sec = 0;
        }
        $scope.startTimer();
      }, 1000);
    };

    $scope.stopTimer = function() {
      clock.stop();
      $timeout.cancel($scope.clock.timer);
      $scope.clock.timer = null;
      $scope.clock.time = 0;
      $scope.clock.notcalled = true;
    };

  });
