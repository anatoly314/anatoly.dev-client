import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Unicode11Addon } from 'xterm-addon-unicode11';
import { saveAs } from 'file-saver';

import { getMobileOperatingSystem, isMobile } from "./utils";
import { getFilteredFingerPrintComponents, getPrintableFingerPrint } from "./fingerprint";


const LINE_INTRO = "anatoly.dev % ";
const TERMINAL_INTRO = "Welcome to anatoly.dev, type \u001b[1mcv\u001b[22m to get my CV or \u001b[1mhelp\u001b[22m for more options...";
const MOBILE_WARNING = "\u001b[1mFor better experience use on desktop/pc computer\u001b[22m";
const SERVER_DISCONNECTED = "Server not connected, try later...";

export default class Xterm {

    ip = "Not connected yet, try later";
    isMobile;
    osType;
    socket;
    terminal;
    fitAddon;
    typingBlocked = false;    // while loading command from server user input is blocked
    currentLine = '';   // will store text till Enter pressed
    commandsBuffer = {
        commands: [], // will store all commands
        pointer: -1   // when we will browse history by using arrow keys up/down we will keep pointer to place in the buffer
    };

    async _initTerminal () {
        await this.commandReset();
        await this.printLineIntro();
    }

    _initAndroidKeyListeners() {
        this.terminal.onData(async data => {
            if (data.trim().length > 0) {
                await this.write(data);
                this.currentLine = data;
                await this.write("\r\n");
                await this.processCurrentLine();
                await this.printLineIntro();
            }
        });
    }

    _initKeyListeners () {
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
    }

    _initSocketOnChangeListener() {
        this.socket.addEventListener('socket', async connected => {
            console.log('connection changed', connected);
            const components = await getFilteredFingerPrintComponents();
            const response = await this.asyncCommand('fingerprint', components);
            console.log(response);
        });

        this.socket.addEventListener('client_ip', ip => {
            this.ip = ip;
        });
    }

    constructor(containerId, socket) {
        this.socket = socket;

        this.terminal = new Terminal({
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
        this.terminal.loadAddon(new WebLinksAddon());
        this.terminal.loadAddon(new Unicode11Addon());
        this.terminal.unicode.activeVersion = '11';

        this.terminal.open(document.getElementById(containerId));
        this.fitAddon.fit();
        window.onresize = () => this.fitAddon.fit();

        this._initTerminal();
        this._initSocketOnChangeListener();

        this.osType = getMobileOperatingSystem();
        this.isMobile = isMobile();

        if (this.osType === 'Android') {
            this._initAndroidKeyListeners();
        } else {
            this._initKeyListeners();
        }
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

        while(this.currentLine.length > 0) {
            await this.backspace();
        }

        this.currentLine = currentCommand;
        await this.write(currentCommand);
    }

    async commandReset () {
        this.terminal.reset();
        this.terminal.focus();
        if (isMobile()) {
            await this.printFancyText(MOBILE_WARNING, true);
        }
        await this.printFancyText(TERMINAL_INTRO, false);
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
        await this.printFancyText(LINE_INTRO, false);
    }

    async printFancyText (text, finishWithNewLine) {
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

                    return resolve();
                }
            }
            await printNextChar();
        });
    }

    async printText (text) {
        this.typingBlocked = true;
        const lines = text.split('\n');
        for (const line of lines) {
            await this.write(line);
            await this.write('\n\r');
        }
        this.typingBlocked = false;
    }

    async asyncCommand (command, data) {
        if (!this.socket.connected) {
            return {
                error: SERVER_DISCONNECTED
            };
        } else {
            const response = await this.socket.sendCommand(command, data, this.isMobile, this.terminal.cols, this.osType);
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
        } else if (command === 'fingerprint') {
            await this.printFingerprint();
        } else if (command === 'ip') {
            await this.printIP();
        } else {
            const response = await this.asyncCommand(command);
            let textMessage = response.text;

            if (response.filedata) {
                saveAs(new Blob(response.filedata), response.filename);
                textMessage += ` as ${response.filename}`;
            }

            if (response.error) {
                textMessage = response.error;
            }

            if (response.fancyTyping) {
                await this.printFancyText(textMessage, textMessage.split("\n").length > 0 ? true : false);
            } else {
                await this.printText(textMessage);
            }
        }
    }

    async printIP () {
        await this.printText(this.ip);
    }

    async printFingerprint () {
        const printableFingerprint = await getPrintableFingerPrint(this.ip);
        await this.printText(printableFingerprint);
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
        await this.printFancyText(history, history.split("\n").length === 1 ? true : false);
    }

    backspace () {
        if (this.currentLine.length > 0) {
            this.terminal.write("\b \b");
            this.currentLine = this.currentLine.slice(0, -1);
        }
    }
}
