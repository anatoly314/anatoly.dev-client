import io from 'socket.io-client';
import SocketStream from 'socket.io-stream';
import EventEmitter from "./event-emitter";

const FILE_DOWNLOADED_MESSAGE = "CV has been successfully downloaded";

export default class Socket extends EventEmitter{
    connected = false;
    socket;

    constructor(url) {
        super();
        this.socket = io(url,{
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

    sendCommand (command, isMobile, cols, osType) {

        const serverCommand = {
            command: command,
            isMobile: isMobile,
            cols: cols,
            osType: osType
        };

        if (command.indexOf("download") >= 0) {
            return new Promise((resolve, reject) => {
                const stream = SocketStream.createStream();
                const fileBuffer = [];
                let fileLength = 0;
                SocketStream(this.socket).emit('download', stream, serverCommand, response => {

                    if (response.error) {

                        return resolve({
                            text: response.error,
                            fancyTyping: false
                        });
                    } else {

                        stream.on('data', chunk => {
                            fileBuffer.push(chunk);
                            fileLength += chunk.length;
                        });

                        stream.on('end', () => {
                            const filedata = new Uint8Array(fileLength);
                            let i = 0;

                            fileBuffer.forEach(function (buff) {
                                for (let j = 0; j < buff.length; j++) {
                                    filedata[i] = buff[j];
                                    i++;
                                }
                            });

                            return resolve({
                                text: FILE_DOWNLOADED_MESSAGE,
                                filedata: [filedata],
                                filename: response.filename,
                                fancyTyping: false
                            });
                        });
                    }

                });
            });
        } else {
            return new Promise((resolve, reject) => {
                this.socket.emit('command', serverCommand, response => {
                    return resolve(response);
                });
            });
        }
    }

    dispatchConnectionEvent () {
        this.dispatchEvent('socket', [this.connected]);
    }
}
