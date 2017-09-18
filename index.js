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
var bulletWidth = 54,
    bulletHeight = 9;
var gunHeight = 70;
var gunWidth = 35;
var bulletOffset = 136;
var tileWidth = 32,
    tileHeight = 32;

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
    var numTilesX = 1216 / tileWidth;
    var numTilesY = 704 / tileHeight;

    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < numTilesX; j++) {
            var name = (i == 0) ? "top" : "bottom";
            var y = (i == 0) ? 0 : 704 - tileHeight;
            if (j == 0) {
                name += "left";
            } else if (j == numTilesX - 1) {
                name += "right";
            } else {
                name = "horizontal";
            }
            tiles.push({ x: j * tileWidth, y: y, name: name, width: 32, height: 32 });
        }
    }
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < numTilesY; j++) {
            var name = (i == 0) ? "left" : "right";
            var x = (i == 0) ? 0 : 1216 - tileWidth;
            if (j == 0) {
                continue;
            } else if (j == numTilesY - 1) {
                break;
            } else {
                name = "vertical";
            }
            tiles.push({ x: x, y: j * tileHeight, name: name, width: 32, height: 32 });
        }
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
        radius: 27,
        width: 54,
        height: 43,
        rotation: 0,
        vx: 0,
        vy: 0,
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
        var vx = -Math.cos(player.rotation * Math.PI / 180);
        var vy = -Math.sin(player.rotation * Math.PI / 180);

        var bullet = {
            player: player,
            playerId: socket.playerData.id,
            bulletId: lastBulletId,
            x: player.x + vx * 100,
            y: player.y + vy * 100,
            radius: 3,
            vx: vx,
            vy: vy,
            rotation: player.rotation - 90
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
        if (players[socket.playerData.id]) {
            var player = players[socket.playerData.id];
            player.x += phoneData.horizontal;
            player.y += phoneData.vertical;
            player.vx = phoneData.horizontal;
            player.vy = phoneData.vertical;
            if (phoneData.shootX == 0 && phoneData.shootY == 0) {
                if (phoneData.vertical != 0 && phoneData.horizontal != 0) {
                    player.rotation = 180 + Math.atan2(phoneData.vertical, phoneData.horizontal) * 180 / Math.PI;
                }
            } else {
                player.rotation = 180 + Math.atan2(phoneData.shootY, phoneData.shootX) * 180 / Math.PI;
            }
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
            projectiles.forEach(function(bullet) {
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;

                players.forEach(function(player) {
                    if (ccIntersects(bullet, player)) { //this is circle on circle 
                        playerHit(socket, bullet, player);
                    }
                });
            });

            players.forEach(function(player) {
                player.airTime += 1 / 60;
                var gravity = 0;
                for (var i = 0; i < tiles.length; i++) {
                    var tile = tiles[i];

                    if (crIntersects(player, tile)) {
                        var deltaX = (player.x - player.width / 2) - tile.x;
                        var deltaY = (player.y - player.height / 2) - tile.y;

                        if (Math.abs(deltaX) > Math.abs(deltaY)) {
                            if (deltaX > 0) {
                                player.x = tile.x + tile.width + player.radius;
                            } else {
                                player.x = tile.x - player.radius;
                            }
                        } else {
                            if (deltaY > 0) {
                                player.y = tile.y + tile.height + player.radius + 1;
                            } else {
                                player.y = tile.y - player.radius;
                            }
                        }
                    }
                    // if (player.x + playerWidth / 2 >= tile.x && player.x <= tile.x + tileWidth) {
                    //     var hitboxY = player.y + playerHeight / 2;
                    //     var hitboxHeight = playerHeight / 2;

                    //     if (hitboxY + hitboxHeight > tile.y && hitboxY < tile.y + tileHeight) {
                    //         var vy = player.airTime * gravity;

                    //         if (vy > 0) {
                    //             player.y = tile.y - playerHeight;
                    //         } else if (vy < 0) {
                    //             player.y = tile.y - tileHeight;
                    //         }

                    //         gravity = 0;
                    //         player.airTime = 0;
                    //     }

                    //     if (hitboxY + hitboxHeight == tile.y && hitboxY == tile.y + tileHeight) {
                    //         var vx = player.vx;

                    //         if (vx > 0) {
                    //             player.x = tile.x - playerWidth / 2;
                    //         } else if (vx < 0) {
                    //             player.x = tile.x + tileWidth + playerWidth / 2;
                    //         }
                    //     }
                    // }
                }
                player.y += gravity * player.airTime;
            });
        });
    });
});

function ccIntersects(circle1, circle2){
    var distance = Math.sqrt(Math.pow(circle1.x - circle2.x, 2) + Math.pow(circle1.y - circle2.y, 2));
    return (distance <= circle1.radius + circle2.radius);
}

function crIntersects(circle, rect) {
    var centerX = rect.x + rect.width / 2;
    var centerY = rect.y + rect.height / 2;
    var circleDistanceX = Math.abs(circle.x - centerX);
    var circleDistanceY = Math.abs(circle.y - centerY);

    if (circleDistanceX > (rect.width / 2 + circle.radius)) { return false; }
    if (circleDistanceY > (rect.height / 2 + circle.radius)) { return false; }

    if (circleDistanceX <= (rect.width / 2)) { return true; }
    if (circleDistanceY <= (rect.height / 2)) { return true; }

    var cornerDistance_sq = Math.pow(circleDistanceX - rect.width / 2, 2) +
        Math.pow(circleDistanceY - rect.height / 2, 2);

    return (cornerDistance_sq <= (circle.r ^ 2));
}

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