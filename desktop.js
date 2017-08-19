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
    socket.on("update", function(players) {
        for (var i = 0; i < players.length; i++) {
            if (players[i]) {
                var id = players[i].id;
                var player = players[i];
                characters[id].walk(player.x);
                characters[id].x = player.x;
                characters[id].y = player.y;
            }
        }
    });
    socket.on("bulletUpdate", function(bullets) {
        for (var i = 0; i < bullets.length; i++) {
            if (bullets[i] && allBullets[id]) {
                var id = bullets[i].bulletId;
                var bullet = bullets[i];
                allBullets[id].x = bullet.x;
                allBullets[id].y = bullet.y;
            }
        }
    });
    socket.on("newBullet", function(bullet) {
        characters[bullet.playerId].shoot(bullet.x, bullet.y, bullet.bulletId);
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
var characterSprites = ["beige", "blue", "green", "pink"];
var characters = [];
var allBullets = [];
var reachedCreate = false;
var playersToCreate = [];

var Character = function(game, x, y, spriteName) {
    spriteName = spriteName[0].toUpperCase() + spriteName.substring(1);
    Phaser.Sprite.call(this, game, x, y, "characters", "alien" + spriteName + "_stand");
    this.anchor.setTo(0.5, 0);
    this.width /= 2;
    this.height /= 2;
    console.log(spriteName);
    this.gun = game.make.sprite(0, 0, "gun");
    this.gun.width *= 2;
    this.gun.height *= 2;
    this.addChild(this.gun);
    this.animations.add("stand", ["alien" + spriteName + "_stand"], 10, true, false);
    this.animations.add("walk", ["alien" + spriteName + "_walk1", "alien" + spriteName + "_walk2"], 7, true, false);
    this.animations.play("stand");
}

Character.prototype = Object.create(Phaser.Sprite.prototype);
Character.prototype.constructor = Character;
Character.prototype.bullets = [];
Character.prototype.update = function() {
    if (this.gun) {
        var xOffset = -5;
        var yOffset = 142;
        if (this.animations.currentAnim.name == "walk" && this.animations.currentAnim.isPlaying) {
            xOffset = 0;
            yOffset = 129;
        }
        this.gun.x = xOffset;
        this.gun.y = yOffset;
    }

};
Character.prototype.shoot = function(x, y, id) {
    var bullet = game.add.sprite(x, y, "characters", "laser");
    this.bullets.push(bullet);
    allBullets[id] = bullet;
}

var stillFrames = 0;
Character.prototype.walk = function(x) {
    // console.log(this.animations.currentAnim.frame);
    if (x != this.x) {
        stillFrames = 0;
        this.animations.play("walk");
        if ((this.width < 0 && x > this.x) || (this.width > 0 && x < this.x)) {
            this.width = -this.width;
        }
    } else {
        stillFrames++;
        if (stillFrames > 2) {
            this.animations.play("stand");
        }
    }
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
    socket.emit("updateRequest");

}

function render() {

}