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
import { MidaEvent, } from "#events/MidaEvent";
import { MidaEventListener, } from "#events/MidaEventListener";
import { GenericObject, } from "#utilities/GenericObject";
import { uuid, } from "#utilities/MidaUtilities";

export class MidaEmitter {
    static readonly #ANY_TYPE_KEY: string = "*";
    readonly #listeners: Map<string, Map<string, MidaEventListener>>;

    public constructor () {
        this.#listeners = new Map();
    }

    public addEventListener (type: string, listener: MidaEventListener): string {
        let id: string;

        do {
            id = uuid();
        }
        while (this.#uuidExists(id)); // This software deals with money, better to avoid even the most improbable events

        const listenersOfType: Map<string, MidaEventListener> = this.#listeners.get(type) ?? new Map();

        listenersOfType.set(id, listener);
        this.#listeners.set(type, listenersOfType);

        return id;
    }

    public removeEventListener (uuid: string): void {
        for (const type of this.#listeners.keys()) {
            const listenersOfType: Map<string, MidaEventListener> | undefined = this.#listeners.get(type);

            if (listenersOfType?.has(uuid)) {
                listenersOfType.delete(uuid);

                break;
            }
        }
    }

    public on (type: string): Promise<MidaEvent>;
    public on (type: string, listener: MidaEventListener): string;
    public on (type: string, listener?: MidaEventListener): Promise<MidaEvent> | string {
        if (!listener) {
            return new Promise((resolve: any): void => {
                const uuid: string = this.addEventListener(type, (event: MidaEvent): void => {
                    this.removeEventListener(uuid);
                    resolve(event);
                });
            });
        }

        return this.addEventListener(type, listener);
    }

    public once (type: string, listener: MidaEventListener): void {
        const uuid: string = this.addEventListener(type, (event: MidaEvent): void => {
            this.removeEventListener(uuid);
            listener(event);
        });
    }

    public notifyListeners (type: string, descriptor?: GenericObject): void {
        const date: Date = new Date();
        const event: MidaEvent = new MidaEvent({
            type,
            date: new MidaDate(date.getTime()),
            descriptor,
        });

        if (type !== MidaEmitter.#ANY_TYPE_KEY) {
            const listenersOfAny: Map<string, MidaEventListener> = this.#listeners.get(MidaEmitter.#ANY_TYPE_KEY) ?? new Map();

            for (const listener of listenersOfAny.values()) {
                listener(event);
            }
        }

        const listenersOfType: Map<string, MidaEventListener> = this.#listeners.get(type) ?? new Map();

        for (const listener of listenersOfType.values()) {
            listener(event);
        }
    }

    public removeAllListeners (): void {
        this.#listeners.clear();
    }

    #uuidExists (uuid: string): boolean {
        for (const key of this.#listeners.keys()) {
            const listeners: Map<string, MidaEventListener> | undefined = this.#listeners.get(key);

            if (listeners?.has(uuid)) {
                return true;
            }
        }

        return false;
    }
}
