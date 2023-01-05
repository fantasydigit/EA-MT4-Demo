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
import { MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPeriodPriceKey, } from "#periods/MidaPeriodPriceKey";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTickMovement, } from "#ticks/MidaTickMovement";

export const tickFromPeriod = (period: MidaPeriod, priceKey: MidaPeriodPriceKey, pricePriority: "low" | "high" = "low"): MidaTick => {
    const quarter: number = (period.endDate.timestamp - period.startDate.timestamp) / 4;
    const price: MidaDecimal = period[priceKey];
    let date: MidaDate;

    switch (priceKey) {
        case "open": {
            date = period.startDate;

            break;
        }
        case "close": {
            date = period.endDate;

            break;
        }
        case "low": {
            if (pricePriority === "high") {
                date = period.endDate.subtract(quarter);
            }
            else {
                date = period.startDate.add(quarter);
            }

            break;
        }
        case "high": {
            if (pricePriority === "low") {
                date = period.endDate.subtract(quarter);
            }
            else {
                date = period.startDate.add(quarter);
            }

            break;
        }
    }

    return new MidaTick({
        symbol: period.symbol,
        bid: price,
        ask: price,
        date,
        movement: MidaTickMovement.UNKNOWN,
    });
};