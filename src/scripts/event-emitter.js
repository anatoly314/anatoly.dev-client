//https://stackoverflow.com/questions/10978311/implementing-events-in-my-own-object
export default class EventEmitter {

    events = {};

    constructor() {

    }

    addEventListener = function(name, handler) {
        if (this.events.hasOwnProperty(name)){
            this.events[name].push(handler);
        } else {
            this.events[name] = [handler];
        }
    };

    removeEventListener = function(name, handler) {
        /* This is a bit tricky, because how would you identify functions?
           This simple solution should work if you pass THE SAME handler. */
        if (!this.events.hasOwnProperty(name)){
            return;
        }

        const index = this.events[name].indexOf(handler);
        if (index != -1) {
            this.events[name].splice(index, 1);
        }
    };

    dispatchEvent = function(name, args) {
        if (!this.events.hasOwnProperty(name)) {
            return;
        }

        if (!args || !args.length){
            args = [];
        }

        const evs = this.events[name], l = evs.length;
        for (let i = 0; i < l; i++) {
            evs[i].apply(null, args);
        }
    };
}
