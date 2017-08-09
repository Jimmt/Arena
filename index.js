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
var lastPlayerId = 0;
var desktopId; // switch to array later
var colors = ["beige", "blue", "green", "pink", "yellow"];

function randomInt(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

io.of("/mobile").on("connection", function(socket) {
    console.log("a phone connected");
    console.log("creating new player");

    socket.playerData = {
        id: lastPlayerId
    };
    var player = {
        id: lastPlayerId,
        x: randomInt(100, 400),
        y: randomInt(100, 400),
        color: colors[lastPlayerId % colors.length]
    };
    players[lastPlayerId] = player;

    lastPlayerId++;

    // io.of("/desktop").to(desktops[0]).emit("allPlayers", getAllPlayers());
    socket.emit("playerData", player);
    io.of("/desktop").to(desktopId).emit("newPlayer", player);

    socket.on("disconnect", function() {
        console.log("a phone disconnected");
        delete players[socket.playerData.id];
        io.of("/desktop").to(desktopId).emit("remove", socket.playerData.id);
    });
    // to send out something
    socket.on("phoneData", function(phoneData) {
        players[socket.playerData.id].x += phoneData.horizontal;
        // io.of("/desktop").to(desktopId).emit("move", socket.player);
    });
});

io.of("/desktop").on("connection", function(socket) {
    console.log("a desktop connected");
    desktopId = socket.id;

    socket.emit("allPlayers", players);

    socket.on("disconnect", function() {
        // should remove from desktops
        console.log("a desktop disconnected");
    });

    socket.on("updateRequest", function(id) {
        // console.log(players);
        // console.log("searching for id=" + id);
        var desiredPlayer = players[id];
        socket.emit("update", desiredPlayer);
    });
});

server.listen(5000, function() {
    console.log("listening on 5000");
});