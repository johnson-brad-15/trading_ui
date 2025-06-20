import { EventEmitter } from 'events';

export class DataEvent extends EventEmitter {
    constructor(shouldHop = false) {
        super();
        this.shouldHop = shouldHop;
        this.q = [];
        this.lock = false;
    }

    set(data = null) {
        this.lock = true;
        if (this.shouldHop && this.q.length > 0) {
            this.q[0] = data;
        } else {
            this.q.push(data);
        }
        this.lock = false;
        this.emit('event');
    }

    waitRun(f) {
        this.once('event', () => {
            const q_ = [...this.q];
            this.q = [];
            for (const d of q_) {
                try {
                    f(d);
                } catch (ex) {
                    console.error(ex);
                    console.trace();
                }
            }
        });
    }
}

export class AsyncDataEvent extends EventEmitter {
    constructor(shouldHop = false, verbose = false) {
        super();
        this.shouldHop = shouldHop;
        this.verbose = verbose;
        this.q = [];
        this.lock = false;
    }

    set(data = null) {
        this.lock = true;
        try {
            if (this.shouldHop && this.q.length > 0) {
                this.q[0] = data;
            } else {
                this.q.push(data);
            }
            if (this.verbose) console.log("AsyncDataEvent set: ", this.q);
        } catch (ex) {
            console.error(ex);
            console.trace();
        }
        this.lock = false;
        this.emit('event');
    }

    async waitRun(f) {
        if (this.verbose) console.log("AsyncDataEvent waiting");
        await new Promise(resolve => this.once('event', resolve));
        if (this.verbose) console.log("AsyncDataEvent out of wait: ", this.q);
        this.lock = true;
        try {
            const q_ = [...this.q];
            this.q = [];
            this.run(q_, f);
        } catch (ex) {
            console.error(ex);
            console.trace();
        }
        this.lock = false;
    }

    async run(data, f) {
        if (this.verbose) console.log("AsyncDataEvent running: ", f, data);
        for (const d of data) {
            try {
                await f(d);
            } catch (ex) {
                console.error(ex);
                console.log(`   in: ${f}`);
                console.trace();
            }
        }
    }
}

