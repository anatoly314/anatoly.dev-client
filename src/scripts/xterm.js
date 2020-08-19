import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';

export default class Xterm {

    terminal;
    fitAddon;
    socket;
    currentLine = ''; // will store text till Enter pressed

    constructor(containerId) {
        this.terminal = new Terminal({
            cols: 40,
            rows: 20,
            cursorBlink: true,
            cursorStyle: 'block',
            fontSize: 20,
            rendererType: 'canvas',
            theme: {
                background: 'black'
            }
        });

        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);

        this.terminal.open(document.getElementById(containerId));
        this.fitAddon.fit();
        this.commandReset();
        this.prompt(false);

        this.terminal.onResize((size) => {
            console.log(size);
        });

        this.terminal.attachCustomKeyEventHandler(keyEvent => {
           if (keyEvent.code.indexOf("Arrow") >= 0) {
               return false;
           }
        });

        this.terminal.onKey(({ key, domEvent }) => {
            const code = key.charCodeAt(0);
            if (domEvent.ctrlKey && domEvent.key === 'c') { // ctrl+c
                this.prompt(false);
            } else if (code === 13) {   // enter
                this.prompt(true);
            } else if (code === 127) { // backspace
                this.backspace();
            }else {
                this.currentLine += key;
                this.terminal.write(key);
            }
        });

        this.terminal.onLineFeed(() => {
            console.log('onLineFeed');
        });

        // this.socket = io('localhost:3001',{
        //     transports: ['websocket'],
        //     timeout: 1000
        // });
        //
        // this.socket.on('connect_error', () => {
        //     console.log('connect_error');
        // });
    }

    commandReset () {
        console.log('reset');
        this.terminal.reset();
        this.terminal.write('Welcome to anatoly.dev, type cv to get my CV or help for more options...');
    }

    prompt (process) {
        if (process) {
            this.processCurrentLine();
        }
        this.terminal.write("\r\n");
        this.terminal.write("anatoly.dev % ");
        this.terminal.focus();
    }


    processCurrentLine () {
        if (this.currentLine.trim() === 'reset') {
            this.commandReset();
        } else {

        }
        this.currentLine = '';
    }

    backspace () {
        if (this.currentLine.length > 0) {
            this.terminal.write("\b \b");
            this.currentLine = this.currentLine.slice(0, -1);
        }
    }
}
