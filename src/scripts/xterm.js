import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';

export default class Xterm {

    terminal;
    fitAddon;

    constructor(containerId) {
        this.terminal = new Terminal();
        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.open(document.getElementById(containerId));
        this.fit();
        this.write();
    }

    write() {
        this.terminal.write('Hello from \x1B[1;3;31mxterm\n .js\x1B[0m $ ');
    }

    fit () {
        this.fitAddon.fit();
    }


}
