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

import { MidaDate, } from "#dates/MidaDate";
import { MidaLogNamespace, } from "#loggers/MidaLogNamespace";
import { MidaLogParameters, } from "#loggers/MidaLogParameters";

const dim = (text: string): string => `\x1b[2m${text}\x1b[0m`;
const blue = (text: string): string => `\x1b[34m${text}\x1b[0m`;
const red = (text: string): string => `\x1b[31m${text}\x1b[0m`;
const green = (text: string): string => `\x1b[32m${text}\x1b[0m`;
const magenta = (text: string): string => `\x1b[35m${text}\x1b[0m`;
const yellow = (text: string): string => `\x1b[33m${text}\x1b[0m`;

export class MidaLog {
    readonly #message: string;
    readonly #namespace: MidaLogNamespace;
    readonly #date: MidaDate;

    public constructor ({
        message,
        namespace,
    }: MidaLogParameters) {
        this.#message = message;
        this.#namespace = namespace;
        this.#date = new MidaDate();
    }

    public get message (): string {
        return this.#message;
    }

    public get namespace (): MidaLogNamespace {
        return this.#namespace;
    }

    public get date (): MidaDate {
        return this.#date;
    }

    public toString (): string {
        let namespace: string = MidaLogNamespace[this.#namespace].toUpperCase();

        switch (this.namespace) {
            case MidaLogNamespace.WARN: {
                namespace = yellow(namespace);

                break;
            }
            case MidaLogNamespace.ERROR:
            case MidaLogNamespace.FATAL: {
                namespace = red(namespace);

                break;
            }
            default: {
                namespace = blue(namespace);
            }
        }

        const localDate: Date = new Date(this.#date.timestamp);
        const time: string =
                dim(`${localDate.getHours()}:${localDate.getMinutes()}:${localDate.getSeconds()}.${localDate.getMilliseconds()}`);

        return `${time} | ${namespace} | ${this.#message}`;
    }
}
