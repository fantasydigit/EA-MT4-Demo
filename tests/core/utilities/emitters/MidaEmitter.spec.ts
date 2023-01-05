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
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";

// eslint-disable-next-line max-lines-per-function
describe("MidaEmitter", () => {
    describe(".addEventListener", () => {
        it("returns a string when a listener is added", () => {
            const emitter: MidaEmitter = new MidaEmitter();

            expect(typeof emitter.addEventListener("event", () => {}) === "string").toBe(true);
        });
    });

    describe(".removeEventListener", () => {
        it("listener is no longer invoked after being removed", () => {
            const emitter: MidaEmitter = new MidaEmitter();
            let invocationsCount: number = 0;
            const uuid: string = emitter.addEventListener("event", () => ++invocationsCount);

            emitter.notifyListeners("event");
            emitter.removeEventListener(uuid);
            emitter.notifyListeners("event");

            expect(invocationsCount).toBe(1);
        });
    });

    describe(".on", () => {
        it("returns a string when listener is passed", () => {
            const emitter: MidaEmitter = new MidaEmitter();

            expect(typeof emitter.on("event", () => {}) === "string").toBe(true);
        });

        it("returns a Promise when no listener is passed", () => {
            const emitter: MidaEmitter = new MidaEmitter();

            expect(emitter.on("event")).toBeInstanceOf(Promise);
        });

        it("when returns a Promise, it's resolved when event occurs", () => {
            const emitter: MidaEmitter = new MidaEmitter();
            const eventPromise: Promise<MidaEvent> = emitter.on("event");

            emitter.notifyListeners("event");

            expect(eventPromise).resolves.toBeInstanceOf(MidaEvent);
        });
    });

    describe(".notifyListeners", () => {
        it("invokes listener", () => {
            const emitter: MidaEmitter = new MidaEmitter();
            let invocationsCount: number = 0;

            emitter.addEventListener("event", () => ++invocationsCount);
            emitter.notifyListeners("event");
            emitter.notifyListeners("event");
            emitter.notifyListeners("event");

            expect(invocationsCount).toBe(3);
        });

        it("invokes listeners", () => {
            const emitter: MidaEmitter = new MidaEmitter();
            let firstListenerInvocationsCount: number = 0;
            let secondListenerInvocationsCount: number = 0;

            emitter.addEventListener("event", () => ++firstListenerInvocationsCount);
            emitter.addEventListener("event", () => ++secondListenerInvocationsCount);
            emitter.notifyListeners("event");
            emitter.notifyListeners("event");
            emitter.notifyListeners("event");

            expect(firstListenerInvocationsCount).toBe(3);
            expect(secondListenerInvocationsCount).toBe(3);
        });

        it("invokes listener with correct event object", () => {
            const emitter: MidaEmitter = new MidaEmitter();
            const eventType: string = "response";
            let lastEvent: any = undefined;

            emitter.addEventListener(eventType, (event: MidaEvent) => {
                lastEvent = event;
            });
            emitter.notifyListeners(eventType, {
                code: 200,
                status: "success",
            });

            expect(lastEvent).not.toBe(undefined);
            expect(lastEvent.type).toBe(eventType);
            expect(lastEvent.date).toBeInstanceOf(MidaDate);
            expect(lastEvent.descriptor.code).toBe(200);
            expect(lastEvent.descriptor.status).toBe("success");
        });
    });
});
