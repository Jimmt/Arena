"use strict";

var $ = function(id) {
    return document.getElementById(id);
};

var socket = io.connect("/mobile");
var moveStick, shootStick;

    setupSocketListeners();

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
        var color = "rgb(" + player.color + ")";
        setupJoysticks(color);
    });
    socket.on("killUpdate", function() {
        console.log("+kill");
        $("kills").innerHTML = ++kills + ((kills == 1) ? " kill" : " kills");
    });
}

function setupJoysticks(color) {
    moveStick = new VirtualJoystick({
        strokeStyle: color,
        mouseSupport: true,
        stationaryBase: true,
        baseX: window.innerWidth / 4,
        baseY: 100,
    });

    shootStick = new VirtualJoystick({
        strokeStyle: color,
        mouseSupport: true,
        stationaryBase: true,
        baseX: window.innerWidth / 4 * 3,
        baseY: 100,
    });

    moveStick.addEventListener('touchStartValidation', function(event) {
        var touch = event.changedTouches[0];
        if (touch.pageX >= window.innerWidth / 2) return false;
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
    setInterval(function() {
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