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
    terminalIntro = 'Welcome to anatoly.dev, type cv to get my CV or help for more options...';

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
            //CtrlC
            if (domEvent.ctrlKey && domEvent.key === 'c') { // ctrl+c
                await this.prompt(false);
            } else if (code === 13) {   // enter
                await this.prompt(true);
            } else if (code === 127) { // backspace
                this.backspace();
            }else {
                this.currentLine += key;
                await this.write(key);
            }
        });

        this.terminal.onLineFeed(() => {

        });
        this.socket.addEventListener('socket', connected => {
            console.log('connection changed', connected);
        });
    }

    async commandReset () {
        console.log('commandReset');
        this.terminal.reset();
        await this.printLongText(this.terminalIntro, true);
        await this.printLineIntro();
        this.terminal.focus();
    }

    async write(text) {
        return new Promise((resolve, reject) => {
            this.terminal.write(text, () => {
                return resolve();
            });
        });
    }

    async prompt (process) {
        await this.write('\r\n');
        if (process) {
            await this.processCurrentLine();
        }
        await this.printLineIntro();
        this.terminal.focus();
    }

    async printLineIntro () {
        await this.printLongText(this.lineIntro, false);
    }

    async printLongText (text, finishWithNewLine) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            let animationFrame;
            const lines = text.split('\n');
            let lineIndex = 0;
            let charIndex = 0;
            async function printNextChar () {
                const currentLine = lines[lineIndex];
                if (currentLine.length > 0 && charIndex < currentLine.length) {
                    const char = currentLine[charIndex];
                    await self.write(char);
                    charIndex++;
                }

                if (charIndex === currentLine.length && lines.length === 1 && finishWithNewLine){
                    await self.write('\n\r');
                    lineIndex++;
                } else if (charIndex === currentLine.length && lines.length > 1 && lineIndex < lines.length) {
                    charIndex = 0;
                    lineIndex++;
                    await self.write('\n\r');
                }

                if (lineIndex < lines.length) {
                    animationFrame = requestAnimationFrame(printNextChar);
                } else {
                    return resolve();
                }
            }
            await printNextChar();
        });
    }

    async asyncCommand (command) {
        const response = await this.socket.sendCommand(command);
        return response;
    }

    async processCurrentLine () {
        const command = this.currentLine.trim();
        this.currentLine = '';
        if (command === 'reset') {
            await this.commandReset();
        } else if (command === 'start') {
            this.switchBuffers(true);
        } else if (command === 'end') {
            this.switchBuffers(false);
        } else if (command === 'test') {
            console.log('test');
            this.test();
        } else if (command === 'async') {
            await this.printLongText(
                `name: Anatoly Tarnavsky
                phone: +(972)547410407
                email: anatolyt@gmail.com`);
        } else {
            const response = await this.asyncCommand(command);
            if (response) {
                await this.printLongText(response);
            } else {
                await this.printLongText("Unknown command", true);
            }
        }
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
