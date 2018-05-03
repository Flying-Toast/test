const server = require('./server.js');
const helpers = require('./helpers.js');
const xss = require('xss');
const readline = require('readline');
const hashmap = require('hashmap');

//stdin commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.on('line', function(line) {
  try {
    eval(line);
  } catch (err) {
    console.log(err);
  }
});
//////////////////////////////


var game = {};
game.players = [];
game.map = new Map(3000, 3000);
game.playerMap = new hashmap();
var config = {
  playerSpeed: 1 / 6 //pixels per millisecond
};

server.io.on('connection', function(socket) {

  socket.on('newGame', function(playerOptions) {

    if (game.players.indexOf(game.playerMap.get(socket.id)) !== -1) {
      game.players.splice(game.players.indexOf(game.playerMap.get(socket.id)), 1); //remove player from players array
      game.playerMap.delete(socket.id);
    }

    playerOptions.id = socket.id;
    newPlayer(playerOptions);
  });

  socket.on('disconnect', function() {
    if (game.players.indexOf(game.playerMap.get(socket.id)) !== -1) {
      game.players.splice(game.players.indexOf(game.playerMap.get(socket.id)), 1); //remove player from players array
    }
    game.playerMap.delete(socket.id);
  });

  socket.on('input', function(inputs) {
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      game.playerMap.get(socket.id).inputs.push(input);
    }
  });

});

function newPlayer(options) {
  var player = new Player(helpers.randInt(0, game.map.width), helpers.randInt(0, game.map.height), options.nickname, options.id, []);

  if (!player.nickname) {
    player.nickname = 'Unnamed Sorcerer';
  }

  game.playerMap.set(player.id, player);
  game.players.push(player);
}

function Map(width, height) {
  this.width = width;
  this.height = height;
}

function Player(x, y, nickname, id, inventory) {
  this.x = x;
  this.y = y;
  this.nickname = xss(nickname.substring(0, 15));
  this.id = id;
  this.inventory = inventory;
  this.inputs = [];
  this.angle = 0;
  this.lastMove = 0;
}

//loops
function updateLoop() {
  server.io.emit('update', game);
}

function physicsLoop() {
  for (var i = 0; i < game.players.length; i++) {
    var player = game.players[i];


    for (var j = 0; j < player.inputs.length; j++) {
      var input = player.inputs[j];

      switch (input.type) {
        case 'move':
          if (player.lastMove !== 0) {
            var dt = Date.now() - player.lastMove;
          } else {
            dt = 0;
          }

          var lenToMouse = Math.sqrt(Math.pow(input.facing.x - input.windowWidth / 2, 2) + Math.pow(input.facing.y - input.windowHeight / 2, 2));
          player.x += (config.playerSpeed / lenToMouse * (input.facing.x - input.windowWidth / 2)) * dt;
          player.y += (config.playerSpeed / lenToMouse * (input.facing.y - input.windowHeight / 2)) * dt;
          player.lastMove = Date.now();
          player.angle = Math.atan2(input.facing.x - input.windowWidth / 2, -(input.facing.y - input.windowHeight / 2));
          break;
      }
      player.inputs.splice(player.inputs.indexOf(input, 1));
    }

  }

}

setInterval(physicsLoop, 20);
setInterval(updateLoop, 45);