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
            characters[player.id].x = player.x;
            characters[player.id].y = player.y;
        } else {
            console.log("server updated player = " + player);
        }
    });
    socket.on("newPlayer", function(data) {
        console.log("new player");
        addCharacter(data.color, data.x, data.y, data.id);
    });
    socket.on("allPlayers", function(data) {
        console.log("all players");
        console.log(data);
        for (var i = 0; i < data.length; i++) {
            if (data[i]) {
                addCharacter(data[i].color, data[i].x, data[i].y, data[i].id);
            }
        }
    });
    socket.on("remove", function(id) {
        removeCharacter(id);
    });
}

var game = new Phaser.Game(1200, 675, Phaser.CANVAS, "game", { preload: preload, create: create, update: update, render: render });
var characterSprites = ["beige", "blue", "green", "pink", "yellow"];
var characters = [];

var Character = function(game, x, y, spriteName) {
    Phaser.Sprite.call(this, game, x, y, spriteName);
    this.width /= 2;
    this.height /= 2;
}

Character.prototype = Object.create(Phaser.Sprite.prototype);
Character.prototype.constructor = Character;

function preload() {
    game.stage.disableVisibilityChange = true;
    characterSprites.forEach(function(color) {
        game.load.image(color, "assets/sprites/" + color + "/alien" + color + "_stand.png");
    });

}

function create() {

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
    console.log(characters);
    for (var id in characters) {
        socket.emit("updateRequest", id);
    }
}

function render() {

}