"use strict";

var $ = function(id) {
    return document.getElementById(id);
};

var socket = io.connect("/desktop");

window.onload = function() {
    setupSocketListeners();
}

function setupSocketListeners() {
    // socket.on("move", function(player) {
    //     characters[player.id].x = player.x;
    //     characters[player.id].y = player.y;
    // });
    socket.on("update", function(player) {
        if (player) {
            if (characters[player.id].x != player.x) {
                characters[player.id].walk();
            }
            characters[player.id].x = player.x;
            characters[player.id].y = player.y;
        } else {
            // console.log("server updated player = " + player);
        }
    });
    socket.on("newPlayer", function(data) {
        console.log("new player");
        addCharacter(data.color, data.x, data.y, data.id);
    });
    socket.on("allPlayers", function(data) {
        console.log("all players");
        if (reachedCreate) {
            addPlayers(data);
        } else {
            playersToCreate = data;
        }
    });
    socket.on("remove", function(id) {
        removeCharacter(id);
    });
}

function addPlayers(data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i]) {
            addCharacter(data[i].color, data[i].x, data[i].y, data[i].id);
        }
    }
}

var game = new Phaser.Game(1200, 675, Phaser.CANVAS, "game", { preload: preload, create: create, update: update, render: render });
var characterSprites = ["beige", "blue", "green", "pink", "yellow"];
var characters = [];
var reachedCreate = false;
var playersToCreate = [];

var Character = function(game, x, y, spriteName) {
    spriteName = spriteName[0].toUpperCase() + spriteName.substring(1);
    Phaser.Sprite.call(this, game, x, y, "characters", "alien" + spriteName + "_stand");
    this.width /= 2;
    this.height /= 2;

    this.gun = game.make.sprite(0, 0, "gun");
    this.gun.width *= 2;
    this.gun.height *= 2;
    this.addChild(this.gun);
    // this.animations.add("stand", ["alienGreen_stand"], 10, true, false);
    this.animations.add("walk", ["alien" + spriteName + "_walk1", "alien" + spriteName + "_walk2"], 7, true, false);
    // this.animations.play("walk");
}

Character.prototype = Object.create(Phaser.Sprite.prototype);
Character.prototype.constructor = Character;
Character.prototype.update = function() {
    if (this.gun) {
        this.gun.x = 58;
        this.gun.y = 140;
    }
};
Character.prototype.walk = function() {
    // console.log(this.animations.currentAnim.frame);
    this.animations.play("walk");
}
Character.prototype.destroy = function() {
    Phaser.Sprite.prototype.destroy.call(this);
    this.gun.destroy();
}

function preload() {
    game.stage.disableVisibilityChange = true;
    characterSprites.forEach(function(color) {
        game.load.image(color, "assets/sprites/" + color + "/alien" + color + "_stand.png");
    });
    game.load.image("gun", "assets/sprites/raygunPurple.png");
    game.load.atlasJSONArray("characters", "assets/sprites/characters.png", "assets/sprites/characters.json");
}
var green;

function create() {
    reachedCreate = true;
    addPlayers(playersToCreate);

    // green = game.add.sprite(0, 0, "characters", "alienGreen_stand");
    // green.animations.add("walk", ["alienGreen_walk1", "alienGreen_walk2"], 7, true, false);
    // green.animations.play("walk");       
}

function addCharacter(spriteName, x, y, id) {
    var c = new Character(game, x, y, spriteName);
    game.add.existing(c);
    characters[id] = c;
}

function removeCharacter(id) {
    characters[id].destroy();
    delete characters[id];
}

function update() {
    // console.log(characters);
    for (var id in characters) {
        socket.emit("updateRequest", id);
    }
}

function render() {

}