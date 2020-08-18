import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';

export default class Xterm {

    terminal;
    fitAddon;
    attachAddon;

    constructor(containerId) {
        this.terminal = new Terminal({
            cols: 40,
            rows: 20,
            cursorBlink: true,
            cursorStyle: 'block',
            fontSize: 20,
            rendererType: 'canvas'
        });

        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);

        const socket = new WebSocket('wss://docker.example.com/containers/mycontainerid/attach/ws');
        this.attachAddon = new AttachAddon(socket);
        this.terminal.loadAddon(this.attachAddon);

        this.terminal.open(document.getElementById(containerId));
        this.fit();
        this.write();
    }

    write() {
        this.terminal.write('Welcome to anatoly.dev, type help to continue...');
    }

    fit () {
        this.fitAddon.fit();
    }


}
