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

export enum MidaOrderRejection {
    MARKET_CLOSED = "market-closed",
    SYMBOL_NOT_FOUND = "symbol-not-found",
    SYMBOL_TRADING_DISABLED = "symbol-trading-disabled",
    POSITION_NOT_FOUND = "position-not-found",
    NOT_ENOUGH_MONEY = "not-enough-money",
    NO_LIQUIDITY = "no-liquidity",
    INVALID_VOLUME = "invalid-volume",
    INVALID_TAKE_PROFIT = "invalid-take-profit",
    INVALID_STOP_LOSS = "invalid-stop-loss",
    INVALID_EXPIRATION = "invalid-expiration",
    UNKNOWN = "unknown",
}
