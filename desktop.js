"use strict";

var $ = function(id) {
    return document.getElementById(id);
};

var socket = io.connect("/desktop");

window.onload = function() {
    setupSocketListeners();
}

function getGameId() {
    return document.cookie.split("=")[1];
}

function setupSocketListeners() {
    socket.on("gameId", function(gameId) {
        document.cookie = "gameId=" + gameId;
    });
    socket.on("update", function(players) {
        for (var i = 0; i < players.length; i++) {
            if (players[i] && characters[players[i].id]) {
                var id = players[i].id;
                var player = players[i];

                if (player.right && characters[id].width < 0 || !player.right && characters[id].width > 0) {
                    characters[id].width *= -1;
                }
                characters[id].x = player.x;
                characters[id].y = player.y;
                characters[id].angle = player.rotation;
            }
        }
    });
    socket.on("map", function(map) {
        addTiles(map);
    });
    socket.on("bulletUpdate", function(bullets) {
        for (var i = 0; i < bullets.length; i++) {
            if (bullets[i] && allBullets[bullets[i].bulletId]) {
                var id = bullets[i].bulletId;
                var bullet = bullets[i];
                allBullets[id].x = bullet.x;
                allBullets[id].y = bullet.y;
            }
        }
    });
    socket.on("newBullet", function(bullet) {
        characters[bullet.playerId].shoot(bullet.x, bullet.y, bullet.rotation, bullet.bulletId);
    });
    socket.on("newPlayer", function(data) {
        console.log("new player");
        addCharacter("hitman", data.x, data.y, data.color, data.id);
    });
    socket.on("allBullets", function(data) {
        console.log("all bullets");
        addBullets(data);
    });
    socket.on("allPlayers", function(data) {
        console.log("all players");
        addPlayers(data);
    });
    socket.on("remove", function(id) {
        removeCharacter(id);
    });
    socket.on("deleteBullet", function(bulletId) {
        removeBullet(bulletId);
    });
    socket.on("death", function(id) {
        removeCharacter(id);
    });
}

var game = new Phaser.Game(1216, 704, Phaser.CANVAS, "phaser-container", { preload: preload, create: create, update: update, render: render });
var characters = [];
var allBullets = [];
var tiles = [];

function RGBtoHEX(r, g, b) { return r << 16 | g << 8 | b; }

var Character = function(game, x, y, color, spriteName) {
    Phaser.Sprite.call(this, game, x, y, spriteName);
    this.anchor.setTo(14 / 54, 21 / 43);

    var hitmanColor = game.make.sprite(0, 0, "hitman_color");
    hitmanColor.anchor.set(14 / 54, 21 / 43);
    hitmanColor.tint = RGBtoHEX(color[0], color[1], color[2]);
    this.addChild(hitmanColor);
}

Character.prototype = Object.create(Phaser.Sprite.prototype);
Character.prototype.constructor = Character;
Character.prototype.bullets = [];
Character.prototype.update = function() {


};
Character.prototype.shoot = function(x, y, rotation, id) {
    var bullet = game.add.sprite(x, y, "bullet");
    bullet.anchor.setTo(0.5, 0.5);
    bullet.angle = rotation;
    this.bullets.push(bullet);
    allBullets[id] = bullet;
}

Character.prototype.destroy = function() {
    Phaser.Sprite.prototype.destroy.call(this);
}

function preload() {
    game.stage.disableVisibilityChange = true;

    game.load.atlasJSONArray("tiles", "assets/sprites/tilesheet.png", "assets/sprites/tiles.json")

    game.load.image("hitman", "assets/sprites/hitman1_silencer.png");
    game.load.image("hitman_color", "assets/sprites/hitman_color.png");
    game.load.image("bullet", "assets/sprites/bullet.png");
}

var gfx;

function create() {
    gfx = game.add.graphics(0, 0);
    socket.emit("ready", { gameId: getGameId() });
    game.stage.scale.pageAlignHorizontally = true;
}


function addTiles(data) {
    for (var i = 0; i < data.length; i++) {
        addTile(data[i].x, data[i].y, data[i].name);
    }
}

function addTile(x, y, name) {
    var element = game.add.sprite(x, y, "tiles", name);
    element.scale.setTo(0.5, 0.5);
    tiles.push(element);
}

function addBullets(data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i]) {
            addBullet(data[i].x, data[i].y, data[i].rotation, data[i].bulletId, data[i].playerId);
        }
    }
}

function addBullet(x, y, rotation, id, playerId) {
    var bullet = game.add.sprite(x, y, "bullet");
    bullet.anchor.setTo(0.5, 0.5);
    bullet.angle = rotation;
    allBullets[id] = bullet;
    characters[playerId].bullets.push(bullet);
}

function addPlayers(data) {
    for (var i = 0; i < data.length; i++) {
        if (data[i]) {
            addCharacter("hitman", data[i].x, data[i].y, data[i].color, data[i].id);
        }
    }
}

function addCharacter(spriteName, x, y, color, id) {
    var c = new Character(game, x, y, color, spriteName);
    game.add.existing(c);
    characters[id] = c;
}

function removeCharacter(id) {
    if (characters[id]) {
        characters[id].destroy();
        delete characters[id];
    }
}

function removeBullet(id) {
    allBullets[id].destroy();
    delete allBullets[id];
}

function update() {
    $("game-id").innerHTML = "Game ID: " + getGameId();
    socket.emit("updateRequest");
}

function render() {}