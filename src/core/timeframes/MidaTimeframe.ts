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

export enum MidaTimeframe {
    /** 1 second */
    S1 = 1,
    /** 1 minute */
    M1 = 60,
    /** 5 minutes */
    M5 = 300,
    /** 15 minutes */
    M15 = 900,
    /** 30 minutes */
    M30 = 1800,
    /** 1 hour */
    H1 = 3600,
    /** 4 hours */
    H4 = 14400,
    /** 1 day */
    D1 = 86400,
    /** 1 week */
    W1 = 604800,
    /** 1 month */
    MO1 = 2592000,
    /** 1 year */
    Y1 = 31536000,
}

export namespace MidaTimeframe {
    const commonTimeframes: Map<string, number> = new Map([
        [ "S", 1, ],
        [ "M", 60, ],
        [ "H", 3600, ],
        [ "D", 86400, ],
        [ "W", 604800, ],
        [ "MO", 2592000, ],
        [ "Y", 31536000, ],
    ]);

    export const parseTimeframe = (timeframe: string): number | undefined => {
        const orderedTimeframes: string[] = [ ...commonTimeframes.keys(), ].sort((a: string, b: string) => a.length - b.length);
        let quantity: number = NaN;

        for (const commonTimeframe of orderedTimeframes) {
            if (timeframe.startsWith(commonTimeframe)) {
                quantity = Number.parseInt(timeframe.substring(commonTimeframe.length), 10) * (commonTimeframes.get(commonTimeframe) ?? -1);

                break;
            }
        }

        if (!Number.isFinite(quantity) || quantity < 0) {
            return undefined;
        }

        return quantity;
    };
}
