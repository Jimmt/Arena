"use strict";

var $ = function(id) {
    return document.getElementById(id);
};

var socket = io.connect("/mobile");

window.onload = function() {
    setupSocketListeners();
    setupJoysticks();
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

function setupJoysticks() {
    var moveStick = new VirtualJoystick({
        mouseSupport: true,
        stationaryBase: true,
        baseX: window.innerWidth / 4,
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

    var shootStick = new VirtualJoystick({
        mouseSupport: true,
        stationaryBase: true,
        baseX: window.innerWidth / 4 * 3,
        baseY: 100,
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
            sdx = 0;
            sdy = 0;
        } else {
            if (framesElapsed == fireInterval * 60) {
                framesElapsed = 0;
                socket.emit("shoot");
                console.log("shoot");
            }
            framesElapsed++;
        }
        

        sendPhoneData(normalize(mdx, 100),
            normalize(mdy, 100),
            normalize(sdx, 100),
            normalize(sdy, 100));
    }, 1 / 60 * 1000);

}

function normalize(mag, limit) {
    // console.log(Math.min(mag, limit) / limit);
    return Math.min(mag, limit) / limit;
}


var lastTime;

function sendPhoneData(x, y, sx, sy) {
    var currTime = new Date().getTime();
    // console.log(currTime - lastTime);
    lastTime = currTime;
    var data = { horizontal: x, vertical: y, shootX: sx, shootY: sy };
    socket.emit("phoneData", data);
}