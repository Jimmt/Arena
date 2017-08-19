"use strict";

var $ = function(id) {
    return document.getElementById(id);
};

var socket = io.connect("/mobile");

window.onload = function() {
    setupSocketListeners();
    setupListeners();
};

var leftId, rightId;

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

var kills = 0;

function setupSocketListeners() {
    socket.on("playerData", function(player) {
        $("n").innerHTML = player.color;
        // document.cookie = "austin_id=" + player.clientId;
    });
    socket.on("killUpdate", function() {
        console.log("+kill");
        $("kills").innerHTML = "kills" + ++kills;
    });
}

function setupListeners() {

    var downEvent = "mousedown";
    var upEvent = "mouseup";

    if ("ontouchstart" in window) {
        downEvent = "touchstart";
        upEvent = "touchend";
    }

    $("left").addEventListener(downEvent, left);
    $("left").addEventListener(upEvent, clearLeft);
    $("right").addEventListener(downEvent, right);
    $("right").addEventListener(upEvent, clearRight);
    $("shoot").onclick = function() {
        socket.emit("shoot");
    }

    $("left").addEventListener("touchcancel", clearLeft);
    $("right").addEventListener("touchcancel", clearRight);
}

function clearLeft() {
    clearInterval(leftId);
}

function clearRight() {
    clearInterval(rightId);
}

function left() {
    leftId = setInterval((function() {
        sendPhoneData(-1, false);
    }), 17);
}

function right() {
    rightId = setInterval((function() {
        sendPhoneData(1, false);
    }), 17);
}

var lastTime;

function sendPhoneData(x, jump) {
    var currTime = new Date().getTime();
    // console.log(currTime - lastTime);
    lastTime = currTime;
    var data = { horizontal: x, jump: jump };
    socket.emit("phoneData", data);
}