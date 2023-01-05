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

import { MidaPlaygroundEngine, } from "!/src/playground/MidaPlaygroundEngine";
import { MidaTick, } from "#ticks/MidaTick";
import { readTicksFromFile, } from "#utilities/MidaFileSystem";

// eslint-disable-next-line max-lines-per-function
describe("MidaPlaygroundEngine", () => {
    const ticks: MidaTick[] = [];

    beforeAll(async () => {
        // First tick date is 2022-01-01T14:00:00.000Z
        // Last tick date is 2022-01-01T14:01:57.143Z
        for await (const tick of readTicksFromFile("./series/ETHUSD.csv", "ETHUSD")) {
            if (tick) {
                ticks.push(tick);
            }
        }
    });

    describe(".elapseTime", () => {
        it("updates the local date", async () => {
            const engine = new MidaPlaygroundEngine({ localDate: "2022-01-01T00:00:00.000Z", });

            await engine.elapseTime(60 * 60 * 24 * 10);

            expect(engine.localDate.iso).toBe("2022-01-11T00:00:00.000Z");
        });

        it("returns the ticks between the current local date and the new local date", async () => {
            const engine = new MidaPlaygroundEngine();

            engine.addSymbolTicks("ETHUSD", ticks);
            engine.setLocalDate(ticks[0].date.subtractSeconds(1));

            const elapsedTicks = (await engine.elapseTime(60 * 2)).elapsedTicks;

            expect(elapsedTicks.length).toBe(ticks.length);
        });

        it("updates the internal quotations", async () => {
            const engine = new MidaPlaygroundEngine();

            engine.addSymbolTicks("ETHUSD", ticks);
            engine.setLocalDate(ticks[0].date.subtractSeconds(1));
            await engine.elapseTime(60 * 2);

            const lastTick: MidaTick = ticks.at(-1) as MidaTick;

            expect((await engine.getSymbolBid("ETHUSD")).equals(lastTick.bid)).toBe(true);
            expect((await engine.getSymbolAsk("ETHUSD")).equals(lastTick.ask)).toBe(true);
        });

        it("emits onTick in the order of elapsed ticks", async () => {
            const engine = new MidaPlaygroundEngine();
            const emittedTicks: MidaTick[] = [];

            engine.addSymbolTicks("ETHUSD", ticks);
            engine.setLocalDate(ticks[0].date.subtractSeconds(1));
            engine.on("tick", (event) => emittedTicks.push(event.descriptor.tick));

            const elapsedTicks = (await engine.elapseTime(30)).elapsedTicks;

            for (let i: number = 0; i < elapsedTicks.length; ++i) {
                expect(elapsedTicks[i] === emittedTicks[i]).toBe(true);
            }
        });
    });

    describe(".elapseTicks", () => {
        it("doesn't affect the local date when ticks are not available", async () => {
            const engine = new MidaPlaygroundEngine({ localDate: "2022-04-04T04:04:04.004Z", });

            await engine.elapseTicks(100);

            expect(engine.localDate.iso).toBe("2022-04-04T04:04:04.004Z");
        });

        it("updates the internal quotations", async () => {
            const engine = new MidaPlaygroundEngine();

            engine.addSymbolTicks("ETHUSD", ticks);
            await engine.elapseTicks(ticks.length);

            const lastTick: MidaTick = ticks.at(-1) as MidaTick;

            expect((await engine.getSymbolBid("ETHUSD")).equals(lastTick.bid)).toBe(true);
            expect((await engine.getSymbolAsk("ETHUSD")).equals(lastTick.ask)).toBe(true);
        });
    });
});
