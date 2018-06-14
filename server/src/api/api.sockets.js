const socketio = require('socket.io');

const model = require('../model');
const logger = require('../services/logger');
const config = require('../config');
const { getIpid } = require('../services/ipid');

function safecall(callback) {
    if (typeof callback !== 'function') return (function noop() {});
    return function call(...args) {
        try {
            callback.apply(callback, args);
        } catch (ex) {
            // nothing
        }
    };
}

function onConnection(socket) {
    const ip =
        (config.get('trustProxy') && socket.handshake.headers['x-forwarded-for'])
        || socket.request.connection.remoteAddress;

    const ipid = getIpid(ip);

    const { rpCode } = socket.handshake.query;

    let rpid;
    const rpInit = model.getRp(rpCode).then((data) => {
        rpid = data.id;
        socket.join(rpid);
        logger.info(`JOIN (${ip}): ${rpCode} - connection id ${socket.id}`);
        socket.emit('load rp', data.rp);
    }).catch((err) => {
        logger.info(`JERR (${ip}): ${rpCode} ${(err && err.code) || err}`);
        socket.emit('rp error', err);
        socket.disconnect();
    });

    socket.use((packet, next) => {
        // stall action packets until the rp has been loaded and sent
        rpInit
            .then(() => next())
            .catch(err => next(err));
    });

    socket.use((packet, next) => {
        // logging
        const packetType = packet[0];
        const packetContent = JSON.stringify(packet[1]);
        logger.info(`RECV (${ip}): ${rpCode}/"${packetType}" ${packetContent}`);
        next();
    });

    socket.use((packet, next) => {
        // sanitize callback function
        const cb = safecall(packet[2]);

        // give promise resolve/reject functions to the socket.on calls
        packet[2] = promise => promise // eslint-disable-line no-param-reassign
            .then(data => cb(null, data))
            .catch((err) => {
                logger.error(`ERR! (${ip}): ${rpCode}/"${packet[0]}" ${err}`);
                cb(err);
            });

        next();
    });

    socket.on('add message', (msg, doPromise) => {
        doPromise(model.addMessage(rpid, socket.id, msg, ipid));
    });

    socket.on('edit message', (editInfo, doPromise) => {
        doPromise(model.editMessage(rpid, socket.id, editInfo, ipid));
    });

    socket.on('add image', (url, doPromise) => {
        doPromise(model.addImage(rpid, socket.id, url, ipid));
    });

    socket.on('add character', (chara, doPromise) => {
        doPromise(model.addChara(rpid, socket.id, chara, ipid));
    });

    socket.on('disconnect', () => {
        logger.info(`EXIT (${ip}): ${rpCode} - connection id ${socket.id}`);
    });
}

function listenToModelEvents(io) {
    model.events.on('add message', (rpid, connectionId, msg) => {
        io.sockets.connected[connectionId].to(rpid).emit('add message', msg);
    });

    model.events.on('edit message', (rpid, connectionId, msg, id) => {
        io.sockets.connected[connectionId].to(rpid).emit('edit message', { id, msg });
    });

    model.events.on('add character', (rpid, connectionId, chara) => {
        io.sockets.connected[connectionId].to(rpid).emit('add character', chara);
    });
}

module.exports = function createSocketApi(httpServer) {
    const io = socketio(httpServer, { serveClient: false });

    io.on('connection', socket => onConnection(socket));

    listenToModelEvents(io);

    process.on('SIGINT', () => {
        // force close
        io.close();
    });
};
