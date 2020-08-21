import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';

export default class Xterm {

    terminal;
    fitAddon;
    socket;
    loading = false;    // while loading command from server user input is blocked
    currentLine = '';   // will store text till Enter pressed

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


        this.terminal.attachCustomKeyEventHandler(keyEvent => {
           if (keyEvent.code.indexOf("Arrow") >= 0) {
               return false;
           }
        });

        this.terminal.onKey(async ({ key, domEvent }) => {
            if (this.loading) {
                return false;
            }

            const code = key.charCodeAt(0);
            if (domEvent.ctrlKey && domEvent.key === 'c') { // ctrl+c
                await this.prompt(false);
            } else if (code === 13) {   // enter
                await this.prompt(true);
            } else if (code === 127) { // backspace
                this.backspace();
            }else {
                this.currentLine += key;
                this.terminal.write(key);
            }
        });

        this.terminal.onLineFeed(() => {

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
        this.terminal.reset();
        this.terminal.write('Welcome to anatoly.dev, type cv to get my CV or help for more options...');
    }

    async prompt (process) {
        if (process) {
            await this.processCurrentLine();
        }
        this.terminal.write("\r\n");
        this.terminal.write("anatoly.dev % ");
        this.terminal.focus();
    }


    async asyncCommand () {
        const sleep = m => new Promise(r => setTimeout(r, m));
        this.loading = true;
        const self = this;
        let animationFrame;
        function spinner() {
            if (self.loading) {
                self.terminal.write('n');
                animationFrame = requestAnimationFrame(spinner);
            }
        }
        spinner();
        await sleep(500);
        this.loading = false;
    }

    async processCurrentLine () {
        const command = this.currentLine.trim();
        if (command === 'reset') {
            this.commandReset();
        } else if (command === 'start') {
            console.log('start');
            this.terminal.write("\x9B?47h");
        } else if (command === 'end') {
            console.log('end');
            this.terminal.write("\x9B?47l");
        } else if (command === 'test') {
            console.log('test');
            this.terminal.write("\x9B2J");
        } else {
            // await this.asyncCommand();
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
