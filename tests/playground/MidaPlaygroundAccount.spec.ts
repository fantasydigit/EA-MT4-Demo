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
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderRejection, } from "#orders/MidaOrderRejection";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaTick, } from "#ticks/MidaTick";
import { readTicksFromFile, } from "#utilities/MidaFileSystem";

// eslint-disable-next-line max-lines-per-function
describe("MidaPlaygroundAccount", () => {
    const ticks: MidaTick[] = [];
    const symbolParameters = {
        symbol: "ETHUSD",
        baseAsset: "ETH",
        quoteAsset: "USD",
        description: "",
        leverage: decimal(0),
        minLots: decimal(0),
        maxLots: decimal(0),
        lotUnits: decimal(0),
        pipPosition: -1,
    };

    beforeAll(async () => {
        // First tick date is 2022-01-01T14:00:00.000Z
        // Last tick date is 2022-01-01T14:01:57.143Z
        for await (const tick of readTicksFromFile("./series/ETHUSD.csv", "ETHUSD")) {
            if (tick) {
                ticks.push(tick);
            }
        }
    });

    // eslint-disable-next-line max-lines-per-function
    describe(".placeOrder", () => {
        it("P/L is equal to spread when buying and selling at the same tick", async () => {
            const engine = new MidaPlaygroundEngine({ localDate: "2022-04-04T04:04:04.004Z", });

            engine.addSymbolTicks("ETHUSD", ticks);
            await engine.elapseTicks(1);

            const currentAsk: MidaDecimal = await engine.getSymbolAsk("ETHUSD");
            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": currentAsk,
                },
            });

            await account.addSymbol(symbolParameters);
            await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
            });

            expect((await account.getBalance()).equals(0)).toBe(true);

            await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.SELL,
                volume: 1,
            });

            const expectedBalance: MidaDecimal = currentAsk.subtract(currentAsk.subtract(await engine.getSymbolBid("ETHUSD")));

            // eslint-disable-next-line max-len
            expect((await account.getBalance()).equals(expectedBalance)).toBe(true);
        });

        it("P/L is equal to spread + commission when buying and selling at the same tick", async () => {
            const fixedCommission: MidaDecimal = decimal(10);
            const engine = new MidaPlaygroundEngine({ localDate: "2022-04-04T04:04:04.004Z", });

            engine.setCommissionCustomizer(async () => [ "USD", fixedCommission, ]);
            engine.addSymbolTicks("ETHUSD", ticks);
            await engine.elapseTicks(1);

            const currentAsk: MidaDecimal = await engine.getSymbolAsk("ETHUSD");
            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": currentAsk,
                },
            });

            await account.addSymbol(symbolParameters);
            await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
            });

            expect((await account.getBalance()).equals(fixedCommission.multiply(-1))).toBe(true);

            await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.SELL,
                volume: 1,
            });

            const expectedBalance: MidaDecimal = currentAsk.subtract(currentAsk.subtract(await engine.getSymbolBid("ETHUSD")));

            // eslint-disable-next-line max-len
            expect((await account.getBalance()).equals(expectedBalance.subtract(fixedCommission.multiply(2)))).toBe(true);
        });

        it("BUY LIMIT is executed at the expected price", async () => {
            const engine = new MidaPlaygroundEngine({ localDate: "2022-04-04T04:04:04.004Z", });

            engine.addSymbolTicks("ETHUSD", ticks);
            await engine.elapseTicks(1);

            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": 100000,
                },
            });

            await account.addSymbol(symbolParameters);

            const limitPrice = 3713.9;
            const limitOrder = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
                limit: limitPrice, // Tick #89
            });

            expect(limitOrder.status).toBe(MidaOrderStatus.PENDING);

            await engine.elapseTicks(20);
            await engine.elapseTicks(20);
            await engine.elapseTicks(20);
            await engine.elapseTicks(27);

            expect(limitOrder.status).toBe(MidaOrderStatus.PENDING);
            await engine.elapseTicks(1);

            expect(limitOrder.status).toBe(MidaOrderStatus.EXECUTED);
            expect(limitOrder.executionPrice?.equals(limitPrice)).toBe(true);
        });

        it("BUY STOP is executed at the expected price", async () => {
            const engine = new MidaPlaygroundEngine({ localDate: "2022-04-04T04:04:04.004Z", });

            engine.addSymbolTicks("ETHUSD", ticks);
            await engine.elapseTicks(1);

            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": 100000,
                },
            });

            await account.addSymbol(symbolParameters);

            const stopPrice = 3716.1;
            const limitOrder = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
                stop: stopPrice, // Tick #41
            });

            expect(limitOrder.status).toBe(MidaOrderStatus.PENDING);

            await engine.elapseTicks(10);
            await engine.elapseTicks(10);
            await engine.elapseTicks(19);

            expect(limitOrder.status).toBe(MidaOrderStatus.PENDING);
            await engine.elapseTicks(1);

            expect(limitOrder.status).toBe(MidaOrderStatus.EXECUTED);
            expect(limitOrder.executionPrice?.equals(stopPrice)).toBe(true);
        });

        it("BUY is rejected when owned quote currency volume is not enough", async () => {
            const engine = new MidaPlaygroundEngine({ localDate: "2022-04-04T04:04:04.004Z", });

            engine.addSymbolTicks("ETHUSD", ticks);
            await engine.elapseTicks(1);

            const account = await engine.createAccount();

            await account.addSymbol(symbolParameters);
            const order = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
            });

            expect(order.status).toBe(MidaOrderStatus.REJECTED);
            expect(order.rejection).toBe(MidaOrderRejection.NOT_ENOUGH_MONEY);
        });

        it("SELL is rejected when owned base currency volume is not enough", async () => {
            const engine = new MidaPlaygroundEngine({ localDate: "2022-04-04T04:04:04.004Z", });

            engine.addSymbolTicks("ETHUSD", ticks);
            await engine.elapseTicks(1);

            const account = await engine.createAccount();

            await account.addSymbol(symbolParameters);

            const order = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.SELL,
                volume: 1,
            });

            expect(order.status).toBe(MidaOrderStatus.REJECTED);
            expect(order.rejection).toBe(MidaOrderRejection.NOT_ENOUGH_MONEY);
        });
    });
});
