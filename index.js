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

function createMapDebug() {
    var numTiles = 16;
    for (var i = 0; i < numTiles; i++) {
        var name = "planetMid";
        var y = 600;
        if (i == 0) { name = "planetLeft"; }
        if (i == numTiles - 1) {
            name = "planetRight";
            y = 600 - tileHeight;
        }
        tiles.push({ x: i * tileWidth, y: y, name: name });
    }
}

createMapDebug();

io.of("/mobile").on("connection", function(socket) {
    console.log("a phone connected");
    console.log("creating new player");

    socket.playerData = {
        id: lastPlayerId
    };
    var player = {
        id: lastPlayerId,
        x: randomInt(100, 400),
        y: 100,
        rotation: 0,
        vx: 0,
        socketId: socket.id,
        // color: colors[lastPlayerId % colors.length],
        airTime: 0
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
            x: player.x,
            y: player.y,
            vx: 1,
            vy: 1,
            rotation: 0
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
        var player = players[socket.playerData.id];
        player.x += phoneData.horizontal;
        player.y += phoneData.vertical;
        if (phoneData.shootX == 0 && phoneData.shootY == 0) {
            player.rotation = 180 + Math.atan2(phoneData.vertical, phoneData.horizontal) * 180 / Math.PI;
        } else {
            player.rotation = 180 + Math.atan2(phoneData.shootY, phoneData.shootX) * 180 / Math.PI;
        }
        // io.of("/desktop").to(desktopId).emit("move", socket.player);
    });
});


io.of("/desktop").on("connection", function(socket) {
    console.log("a desktop connected");
    desktopId = socket.id;

    socket.on("ready", function() {
        socket.emit("allPlayers", players);
        socket.emit("allBullets", projectiles);

        socket.emit("map", tiles);

        socket.on("disconnect", function() {
            // should remove from desktops
            console.log("a desktop disconnected");
        });

        socket.on("updateRequest", function() {
            socket.emit("update", players);
            socket.emit("bulletUpdate", projectiles);
            projectiles.forEach(function(element) {
                element.x += element.vx;
                element.y += element.vy;

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
                player.airTime += 1 / 60;
                var gravity = 0;
                for (var i = 0; i < tiles.length; i++) {
                    var tile = tiles[i];
                    // falling check

                    if (player.x + playerWidth / 2 >= tile.x && player.x <= tile.x + tileWidth) {
                        var hitboxY = player.y + playerHeight / 2;
                        var hitboxHeight = playerHeight / 2;

                        if (hitboxY + hitboxHeight > tile.y && hitboxY < tile.y + tileHeight) {
                            var vy = player.airTime * gravity;

                            if (vy > 0) {
                                player.y = tile.y - playerHeight;
                            } else if (vy < 0) {
                                player.y = tile.y - tileHeight;
                            }

                            gravity = 0;
                            player.airTime = 0;
                        }

                        if (hitboxY + hitboxHeight == tile.y && hitboxY == tile.y + tileHeight) {
                            var vx = player.vx;

                            if (vx > 0) {
                                player.x = tile.x - playerWidth / 2;
                            } else if (vx < 0) {
                                player.x = tile.x + tileWidth + playerWidth / 2;
                            }
                        }
                    }
                }
                player.y += gravity * player.airTime;
            });
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