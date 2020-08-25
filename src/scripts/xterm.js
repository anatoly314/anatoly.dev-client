import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';
import Socket from "./socket";

const LINE_INTRO = "anatoly.dev % ";
const TERMINAL_INTRO = "Welcome to anatoly.dev, type cv to get my CV or help for more options...";
const SERVER_DISCONNECTED = "Server not connected, try later...";

export default class Xterm {

    socket;
    terminal;
    fitAddon;
    typingBlocked = false;    // while loading command from server user input is blocked
    currentLine = '';   // will store text till Enter pressed

    async initTerminal () {
        await this.commandReset();
        await this.printLineIntro();
    }

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
        this.initTerminal();


        this.terminal.attachCustomKeyEventHandler(keyEvent => {
           if (keyEvent.code.indexOf("Arrow") >= 0) {
               return false;
           }
        });

        this.terminal.onKey(async ({ key, domEvent }) => {
            if (this.typingBlocked) {
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
        this.terminal.reset();
        this.terminal.focus();
        await this.printText(TERMINAL_INTRO, false);
        await this.write("\r\n");
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
        await this.printText(LINE_INTRO, false);
    }

    async printText (text, finishWithNewLine) {
        console.log('beginning');
        this.typingBlocked = true;
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

                if (charIndex === currentLine.length && lines.length === 1){
                    if (finishWithNewLine) {
                        await self.write('\n\r');
                    }
                    lineIndex++;
                } else if (charIndex === currentLine.length && lines.length > 1 && lineIndex < lines.length) {
                    charIndex = 0;
                    lineIndex++;
                    await self.write('\n\r');
                }

                if (lineIndex < lines.length) {
                    animationFrame = requestAnimationFrame(printNextChar);
                } else {
                    self.typingBlocked = false;
                    console.log('end');

                    return resolve();
                }
            }
            await printNextChar();
        });
    }

    async asyncCommand (command) {
        if (!this.socket.connected) {
            return SERVER_DISCONNECTED;
        } else {
            const response = await this.socket.sendCommand(command);
            return response;
        }

    }

    async processCurrentLine () {
        const command = this.currentLine.trim();
        this.currentLine = '';
        if (command === "") {
            return;
        } else if (command === 'reset') {
            await this.commandReset();
        } else if (command === 'start') {
            this.switchBuffers(true);
        } else if (command === 'end') {
            this.switchBuffers(false);
        } else if (command === 'test') {
            console.log('test');
            this.test();
        } else if (command === 'async') {
            await this.printText(
                `name: Anatoly Tarnavsky
                phone: +(972)547410407
                email: anatolyt@gmail.com`);
        } else {
            const response = await this.asyncCommand(command);
            await this.printText(response, response.split("\n").length > 0 ? true : false);
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
