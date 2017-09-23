"use strict";

var $ = function(id) {
    return document.getElementById(id);
};

var moveStick, shootStick;


var socket = io.connect("/mobile");
window.onload = function() {
    setupSocketListeners();
}

var kills = 0;
var inGame = false;
var timerId;

function setupSocketListeners() {
    $("join").onclick = function() {
        if (inGame) {
            socket.emit("gameSwitch");
            clearInterval(timerId);
            var canvases = document.querySelectorAll("canvas");
            canvases.forEach(function(canvas){
                $("joystick-container").removeChild(canvas);
            });
        }
        socket.emit("ready", $("id-input").value);
    };
    socket.on("errorNoSuchGame", function() {
        $("error-text").innerHTML = "No game with id " + $("id-input").value + " exists";
    });
    socket.on("playerData", function(player) {
        inGame = true;
        var color = "rgb(" + player.color + ")";
        $("error-text").innerHTML = "";
        setupJoysticks(color);
    });
    socket.on("killUpdate", function() {
        console.log("+kill");
        $("kills").innerHTML = ++kills + ((kills == 1) ? " kill" : " kills");
    });
}

function setupJoysticks(color) {
    if (!$("kills")) {
        var kills = document.createElement("div");
        kills.id = "kills";
        document.body.appendChild(kills);
    }
    $("kills").innerHTML = "0 kills";

    moveStick = new VirtualJoystick({
        container: $("joystick-container"),
        strokeStyle: color,
        mouseSupport: true,
        stationaryBase: true,
        baseX: window.innerWidth / 4,
        baseY: window.innerHeight / 2,
    });

    shootStick = new VirtualJoystick({
        container: $("joystick-container"),
        strokeStyle: color,
        mouseSupport: true,
        stationaryBase: true,
        baseX: window.innerWidth / 4 * 3,
        baseY: window.innerHeight / 2,
    });

    moveStick.addEventListener('touchStartValidation', function(event) {
        var touch = event.changedTouches[0];
        if (touch.pageX >= window.innerWidth / 2) return false;
        if (touch.pageY <= 100) return false;
        return true;
    });

    moveStick.addEventListener("touchStart", function() {
        moveStickUp = false;
    });

    moveStick.addEventListener("touchEnd", function() {
        moveStickUp = true;
    });

    shootStick.addEventListener('touchStartValidation', function(event) {
        var touch = event.changedTouches[0];
        if (touch.pageX < window.innerWidth / 2) return false;
        if (touch.pageY <= 100) return false;
        return true;
    });

    shootStick.addEventListener("touchStart", function() {
        shootStickUp = false;
    });
    shootStick.addEventListener("touchEnd", function() {
        shootStickUp = true;
    });

    var fireInterval = 1;
    var framesElapsed = fireInterval * 60;

    var moveStickUp = true,
        shootStickUp = true;
    timerId = setInterval(function() {
        var mdx = moveStick.deltaX(),
            mdy = moveStick.deltaY();
        var sdx = shootStick.deltaX(),
            sdy = shootStick.deltaY();

        if (moveStickUp) {
            mdx = 0;
            mdy = 0;
        }
        if (shootStickUp) {
            if (framesElapsed < fireInterval * 60) {
                framesElapsed++;
            }
            sdx = 0;
            sdy = 0;
        } else {
            if (framesElapsed == fireInterval * 60) {
                framesElapsed = 0;
                socket.emit("shoot");
            }
            framesElapsed++;
        }

        var limit = 100;
        var scale = 50;

        sendPhoneData(normalize(mdx, limit, scale),
            normalize(mdy, limit, scale),
            normalize(sdx, limit, scale),
            normalize(sdy, limit, scale));
    }, 1 / 60 * 1000);

}

function normalize(mag, limit, scale) {
    // console.log(Math.min(mag, limit) / limit);
    if (Math.abs(mag) > limit) {
        return (mag > 0 ? 1 : -1) * limit / scale;
    } else {
        return mag / scale;
    }

}


var lastTime;

function sendPhoneData(x, y, sx, sy) {
    var currTime = new Date().getTime();
    // console.log(currTime - lastTime);
    lastTime = currTime;
    var data = { horizontal: x, vertical: y, shootX: sx, shootY: sy };
    socket.emit("phoneData", data);
}