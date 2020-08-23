import io from 'socket.io-client';

export default class Socket {
    connected = false;
    socket;

    constructor() {
        this.socket = io('localhost:3000',{
            transports: ['websocket'],
            timeout: 1000
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('disconnected');
        });

        this.socket.on('connect', () => {
            this.connected = true;
            console.log('connected');
        });
    }
}
