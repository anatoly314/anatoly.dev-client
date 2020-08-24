import io from 'socket.io-client';
import EventEmitter from "./event-emitter";

export default class Socket extends EventEmitter{
    connected = false;
    socket;

    constructor() {
        super();
        this.socket = io('192.168.1.6:3000',{
            transports: ['websocket'],
            timeout: 1000
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            this.dispatchConnectionEvent();
        });

        this.socket.on('connect', () => {
            this.connected = true;
            this.dispatchConnectionEvent();
        });
    }

    sendCommand (message) {
        const self = this;
        return new Promise((resolve, reject) => {
            this.socket.emit('command', message, response => {
                return resolve(response);
            });
        });

    }

    dispatchConnectionEvent () {
        this.dispatchEvent('socket', [this.connected]);
    }
}
