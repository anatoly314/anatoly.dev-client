import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';
import Socket from "./socket";

export default class Xterm {

    socket;
    terminal;
    fitAddon;
    loading = false;    // while loading command from server user input is blocked
    currentLine = '';   // will store text till Enter pressed
    lineIntro = 'anatoly.dev % ';

    constructor(containerId) {
        this.socket = new Socket();

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
        window.terminal = this.terminal;

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
        this.terminal.write(this.lineIntro);
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
            this.switchBuffers(true);
        } else if (command === 'end') {
            this.switchBuffers(false);
        } else if (command === 'test') {
            console.log('test');
            this.test();
        } else {
            await this.asyncCommand();
        }
        this.currentLine = '';
    }

    test () {
        console.log(this.terminal);
        console.log(this.terminal.buffer.normal.getLine(0).translateToString());
    }

    switchBuffers(alternate) {
        if (alternate) {
            this.terminal.write("\x9B?47h");
        } else {
            this.terminal.write("\x9B?47l");
        }
    }

    backspace () {
        if (this.currentLine.length > 0) {
            this.terminal.write("\b \b");
            this.currentLine = this.currentLine.slice(0, -1);
        }
    }
}
