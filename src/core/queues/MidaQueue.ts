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

import { MidaQueueParameters, } from "#queues/MidaQueueParameters";
import { MidaQueueWorker, } from "#queues/MidaQueueWorker";

export class MidaQueue<T> {
    readonly #items: T[];
    readonly #worker: MidaQueueWorker<T>;
    readonly #lastEntryOnly: boolean;
    #isLocked: boolean;

    public constructor ({ worker, lastEntryOnly, }: MidaQueueParameters<T>) {
        this.#items = [];
        this.#worker = worker;
        this.#lastEntryOnly = lastEntryOnly ?? false;
        this.#isLocked = false;
    }

    public get length (): number {
        return this.#items.length;
    }

    public add (item: T): void {
        this.#processItem(item);
    }

    async #processItem (item: T, bypassLock: boolean = false): Promise<void> {
        if (this.#isLocked && !bypassLock) {
            if (this.#lastEntryOnly) {
                this.#items[0] = item;
            }
            else {
                this.#items.push(item);
            }

            return;
        }

        this.#isLocked = true;

        try {
            await this.#worker(item);
        }
        catch (error: unknown) {
            console.error(error);
        }

        const nextItem: T | undefined = this.#items.shift();

        if (nextItem) {
            this.#processItem(nextItem, true);
        }
        else {
            this.#isLocked = false;
        }
    }
}
