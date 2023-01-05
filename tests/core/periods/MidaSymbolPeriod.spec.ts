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
import { decimal, } from "#decimals/MidaDecimal";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaQuotationPrice, } from "#quotations/MidaQuotationPrice";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";

describe("MidaSymbolPeriod", () => {
    const bidPeriod: MidaPeriod = new MidaPeriod({
        symbol: "TEST",
        startDate: new MidaDate(),
        quotationPrice: MidaQuotationPrice.BID,
        open: decimal(10),
        high: decimal(50),
        low: decimal(3),
        close: decimal(25),
        volume: decimal(3232),
        timeframe: MidaTimeframe.H4,
    });

    describe(".ohlc", () => {
        it("is set correctly", () => {
            expect(bidPeriod.ohlc[0]).toBe(bidPeriod.open);
            expect(bidPeriod.ohlc[1]).toBe(bidPeriod.high);
            expect(bidPeriod.ohlc[2]).toBe(bidPeriod.low);
            expect(bidPeriod.ohlc[3]).toBe(bidPeriod.close);
        });
    });

    describe(".ohlcv", () => {
        it("is set correctly", () => {
            expect(bidPeriod.ohlcv[0]).toBe(bidPeriod.open);
            expect(bidPeriod.ohlcv[1]).toBe(bidPeriod.high);
            expect(bidPeriod.ohlcv[2]).toBe(bidPeriod.low);
            expect(bidPeriod.ohlcv[3]).toBe(bidPeriod.close);
            expect(bidPeriod.ohlcv[4]).toBe(bidPeriod.volume);
        });
    });

    describe(".timeframe", () => {
        it("is set correctly", () => {
            expect(bidPeriod.timeframe).toBe(14400);
        });
    });

    describe(".body", () => {
        it("is set correctly", () => {
            expect(bidPeriod.body.equals(15)).toBe(true);
        });
    });
});
