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

import { MidaPositionDirection, } from "#positions/MidaPositionDirection";

export enum MidaOrderDirection {
    BUY = "buy",
    SELL = "sell",
}

export namespace MidaOrderDirection {
    export const oppositeOf = (direction: MidaOrderDirection): MidaOrderDirection => {
        switch (direction) {
            case MidaOrderDirection.BUY: {
                return MidaOrderDirection.SELL;
            }
            case MidaOrderDirection.SELL: {
                return MidaOrderDirection.BUY;
            }
        }
    };

    export const toPositionDirection = (direction: MidaOrderDirection): MidaPositionDirection => {
        switch (direction) {
            case MidaOrderDirection.BUY: {
                return MidaPositionDirection.LONG;
            }
            case MidaOrderDirection.SELL: {
                return MidaPositionDirection.SHORT;
            }
        }
    };
}
