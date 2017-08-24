"use strict";

const express = require("express");
const app = express();
const http = require("http");

var server = http.createServer(app);
const io = require("socket.io")(server);

app.use(express.static(__dirname + "/"));

app.get("/", function(req, res) {
    // redirect to phone or desktop
});

app.get("/desktop", function(req, res) {
    res.sendFile(__dirname + "/desktop.html");
});

app.get("/mobile", function(req, res) {
    res.sendFile(__dirname + "/mobile.html");
});

var players = [];
var projectiles = [];
var tiles = [];
var lastPlayerId = 0;
var lastBulletId = 0;
var desktopId; // switch to array later
var colors = ["beige", "blue", "green", "pink"];
var playerWidth = 128 / 2;
var playerHeight = 128;
var bulletWidth = 54,
    bulletHeight = 9;
var gunHeight = 70;
var gunWidth = 35;
var bulletOffset = 136;
var tileWidth = 64,
    tileHeight = 64;

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function numberOfPlayers() {
    var count = 0;
    for (var i = 0; i < players.length; i++) {
        if (players[i] != undefined) {
            count++;
        }
    }
    return count;
}

io.of("/mobile").on("connection", function(socket) {
    console.log("a phone connected");
    console.log("creating new player");

    socket.playerData = {
        id: lastPlayerId
    };
    var player = {
        id: lastPlayerId,
        right: true,
        x: randomInt(100, 400),
        y: 100,
        socketId: socket.id,
        color: colors[lastPlayerId % colors.length]
    };
    players[lastPlayerId] = player;

    lastPlayerId++;

    // io.of("/desktop").to(desktops[0]).emit("allPlayers", getAllPlayers());

    socket.emit("playerData", player);
    io.of("/desktop").to(desktopId).emit("newPlayer", player);

    socket.on("shoot", function() {
        var player = players[socket.playerData.id];
        var bullet = {
            player: player,
            playerId: socket.playerData.id,
            bulletId: lastBulletId,
            right: player.right,
            x: player.right ? player.x + playerWidth / 2 + gunWidth - 20 : player.x - gunWidth - playerWidth / 2 - bulletWidth + 20,
            y: player.y + bulletOffset - gunHeight / 2
        };
        projectiles[lastBulletId] = bullet;
        lastBulletId++;
        io.of("/desktop").to(desktopId).emit("newBullet", bullet);
    });

    socket.on("disconnect", function() {
        console.log("a phone disconnected");
        delete players[socket.playerData.id];
        io.of("/desktop").to(desktopId).emit("remove", socket.playerData.id);
    });
    // to send out something
    socket.on("phoneData", function(phoneData) {
        players[socket.playerData.id].x += phoneData.horizontal;
        players[socket.playerData.id].right = (phoneData.horizontal > 0);
        // io.of("/desktop").to(desktopId).emit("move", socket.player);
    });
});


io.of("/desktop").on("connection", function(socket) {
    console.log("a desktop connected");
    desktopId = socket.id;

    socket.emit("allPlayers", players);
    socket.emit("allBullets", projectiles);

    var numTiles = 18;
    for (var i = 0; i < numTiles; i++) {
        var name = "planetMid";
        if (i == 0) name = "planetLeft";
        if (i == numTiles - 1) name = "planetRight";
        tiles.push({ x: i * 64, y: 600, name: name });
    }
    socket.emit("map", tiles);

    socket.on("disconnect", function() {
        // should remove from desktops
        console.log("a desktop disconnected");
    });

    socket.on("updateRequest", function() {
        socket.emit("update", players);
        socket.emit("bulletUpdate", projectiles);
        projectiles.forEach(function(element) {
            element.x += 5 * (element.right ? 1 : -1);

            players.forEach(function(player) {
                if (element.x + bulletWidth > player.x - playerWidth / 2 && element.x < player.x + playerWidth / 2) {
                    var hitboxY = player.y + playerHeight / 2;
                    var hitboxHeight = playerHeight / 2;
                    if (element.y + bulletHeight > hitboxY && element.y < hitboxY + hitboxHeight) {
                        playerHit(socket, element, player);
                    }
                }
            });
        });

        players.forEach(function(player) {
            var gravity = 1;
            for (var i = 0; i < tiles.length; i++) {
                var tile = tiles[i];
                // falling check
                if (player.x + playerWidth / 2 >= tile.x && player.x <= tile.x + tileWidth) {
                    var hitboxY = player.y + playerHeight / 2;
                    var hitboxHeight = playerHeight / 2;

                    if (hitboxY + hitboxHeight >= tile.y && hitboxY <= tile.y + tileHeight) {
                        gravity = 0;
                    }
                }
            }
            player.y += gravity;
        });
    });
});

function playerHit(socket, bullet, player) {
    delete players[player.id];
    delete projectiles[bullet.bulletId];
    socket.emit("death", player.id);
    socket.emit("deleteBullet", bullet.bulletId);
    io.of("/mobile").to(bullet.player.socketId).emit("killUpdate");
}

server.listen(5000, function() {
    console.log("listening on 5000");
});