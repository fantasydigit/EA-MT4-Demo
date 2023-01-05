/*
 * Copyright Reiryoku Technologies and its contributors, www.reiryoku.com, www.mida.org
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
*/

import { MidaLog, } from "#loggers/MidaLog";
import { MidaLogNamespace, } from "#loggers/MidaLogNamespace";

export class MidaLogger {
    readonly #logs: MidaLog[];
    #namespace: MidaLogNamespace;

    public constructor (namespace?: MidaLogNamespace) {
        this.#logs = [];
        this.#namespace = namespace ?? MidaLogNamespace.ALL;
    }

    public get logs (): MidaLog[] {
        return [ ...this.#logs, ];
    }

    public get namespace (): MidaLogNamespace {
        return this.#namespace;
    }

    public set namespace (namespace: MidaLogNamespace) {
        this.#namespace = namespace;
    }

    public log (message: string, namespace: MidaLogNamespace = MidaLogNamespace.INFO): void {
        if (namespace === MidaLogNamespace.ALL || namespace === MidaLogNamespace.OFF) {
            return;
        }

        const log: MidaLog = new MidaLog({
            message,
            namespace,
        });

        this.#logs.push(log);

        if (this.#namespace < log.namespace) {
            return;
        }

        console.log(log.toString());
    }

    public debug (message: string): void {
        this.log(message, MidaLogNamespace.DEBUG);
    }

    public info (message: string): void {
        this.log(message, MidaLogNamespace.INFO);
    }

    public warn (message: string): void {
        this.log(message, MidaLogNamespace.WARN);
    }

    public error (message: string): void {
        this.log(message, MidaLogNamespace.ERROR);
    }

    public fatal (message: string): void {
        this.log(message, MidaLogNamespace.FATAL);
    }
}

export const internalLogger: MidaLogger = new MidaLogger(MidaLogNamespace.INFO);
