// ecosystem.config.js : This file is used to manage multiple applications that can be managed via pm2
const os = require('os');
require('dotenv').config();
module.exports = {
    apps: [{
        port        : process.env.PORT || 3000,
        name        : "colyseus-rts-gameserver",
        script      : "gameserver_dist/gameserver/index.js", // your entrypoint file
        time        : true,
        watch       : process.env.NODE_ENV !== 'production',           // optional
        instances   : Math.max(os.cpus().length-1, 1),
        wait_ready  : process.env.NODE_ENV === 'production',
        exec_mode   : 'fork',         // IMPORTANT: do not use cluster mode.
        env: {
            DEBUG: "colyseus:errors",
            NODE_ENV: process.env.NODE_ENV || "production",
        }
    }]
}