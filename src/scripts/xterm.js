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
    commandsBuffer = {
        commands: [], // will store all commands
        pointer: -1   // when we will browse history by using arrow keys up/down we will keep pointer to place in the buffer
    };

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


        this.terminal.onKey(async ({ key, domEvent }) => {
            if (this.typingBlocked) {
                return false;
            }

            const keyCode = domEvent.key;
            const code = key.charCodeAt(0);

            if (keyCode.startsWith("Arrow")) {
                if (keyCode === "ArrowUp") {
                    await this.browseHistory(true);
                } else if (keyCode === "ArrowDown") {
                    await this.browseHistory(false);
                }
            } else if (domEvent.ctrlKey && domEvent.key === 'c') { // ctrl+c
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

        this.socket.addEventListener('socket', connected => {
            console.log('connection changed', connected);
        });
    }

    async browseHistory (up = true) {
        if (this.commandsBuffer.commands.length === 0) {
            return;
        }

        if (this.commandsBuffer.pointer === -1) {
            this.commandsBuffer.pointer = this.commandsBuffer.commands.length - 1;  //begin browsing from last command
        } else if (up && this.commandsBuffer.pointer > 0) {
            this.commandsBuffer.pointer --;
        } else if (!up && this.commandsBuffer.pointer < this.commandsBuffer.commands.length - 1) {
            this.commandsBuffer.pointer ++;
        }
        const currentCommand = this.commandsBuffer.commands[this.commandsBuffer.pointer];
        console.log('currentCommand',currentCommand);

        while(this.currentLine.length > 0) {
            await this.backspace();
        }

        this.currentLine = currentCommand;
        await this.write(currentCommand);
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
        this.commandsBuffer.commands.push(command);
        this.commandsBuffer.pointer = -1;
        this.currentLine = '';
        if (command === "") {
            return;
        } else if (command === 'reset') {
            await this.commandReset();
        } else if (command === 'history') {
            await this.printHistory();
        } else {
            const response = await this.asyncCommand(command);
            await this.printText(response, response.split("\n").length > 0 ? true : false);
        }
    }

    async printHistory () {
        const history = this.commandsBuffer.commands.reduce((history, line, index, array) => {
            history += index;
            history += "\t";
            history += line.trim();
            if (index < array.length - 1) {
                history += "\r\n";
            }
            return history;
        }, '');
        await this.printText(history, history.split("\n").length === 1 ? true : false);
    }

    backspace () {
        if (this.currentLine.length > 0) {
            this.terminal.write("\b \b");
            this.currentLine = this.currentLine.slice(0, -1);
        }
    }
}
