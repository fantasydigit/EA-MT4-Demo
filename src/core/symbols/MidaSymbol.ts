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

import { MidaTradingAccount, } from "#accounts/MidaTradingAccount";
import { MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaSymbolParameters, } from "#symbols/MidaSymbolParameters";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";

/** Represents a symbol */
export class MidaSymbol {
    readonly #symbol: string;
    readonly #tradingAccount: MidaTradingAccount;
    readonly #description: string;
    readonly #baseAsset: string;
    readonly #quoteAsset: string;
    readonly #leverage: MidaDecimal;
    readonly #minLots: MidaDecimal;
    readonly #maxLots: MidaDecimal;
    readonly #lotUnits: MidaDecimal;
    readonly #pipPosition: number;
    readonly #decimalDigits: number;
    readonly #emitter: MidaEmitter;

    public constructor ({
        symbol,
        tradingAccount,
        description,
        baseAsset,
        quoteAsset,
        leverage,
        minLots,
        maxLots,
        lotUnits,
        pipPosition,
        decimalDigits,
    }: MidaSymbolParameters) {
        this.#symbol = symbol;
        this.#tradingAccount = tradingAccount;
        this.#description = description;
        this.#baseAsset = baseAsset;
        this.#quoteAsset = quoteAsset;
        this.#leverage = leverage;
        this.#minLots = minLots;
        this.#maxLots = maxLots;
        this.#lotUnits = lotUnits;
        this.#pipPosition = pipPosition;
        this.#decimalDigits = decimalDigits ?? -1;
        this.#emitter = new MidaEmitter();
    }

    /** The symbol trading account */
    public get tradingAccount (): MidaTradingAccount {
        return this.#tradingAccount;
    }

    /** The symbol description */
    public get description (): string {
        return this.#description;
    }

    /** The symbol base asset */
    public get baseAsset (): string {
        return this.#baseAsset;
    }

    /** The symbol quote asset */
    public get quoteAsset (): string {
        return this.#quoteAsset;
    }

    /** The symbol leverage */
    public get leverage (): MidaDecimal {
        return this.#leverage;
    }

    /** The symbol minimum order lots */
    public get minLots (): MidaDecimal {
        return this.#minLots;
    }

    /** The symbol maximum order lots */
    public get maxLots (): MidaDecimal {
        return this.#maxLots;
    }

    /** The symbol units for one lot */
    public get lotUnits (): MidaDecimal {
        return this.#lotUnits;
    }

    /** The symbol pip position */
    public get pipPosition (): number {
        return this.#pipPosition;
    }

    /** The symbol decimal digits */
    public get decimalDigits (): number {
        return this.#decimalDigits;
    }

    /** Used to get the symbol current best bid price */
    public async getBid (): Promise<MidaDecimal> {
        return this.#tradingAccount.getSymbolBid(this.#symbol);
    }

    /** Used to get the symbol current best ask price */
    public async getAsk (): Promise<MidaDecimal> {
        return this.#tradingAccount.getSymbolAsk(this.#symbol);
    }

    /** Used to get the symbol current average price */
    public async getAverage (): Promise<MidaDecimal> {
        return this.#tradingAccount.getSymbolAverage(this.#symbol);
    }

    /** Indicates if the symbol market is open */
    public async isMarketOpen (): Promise<boolean> {
        return this.#tradingAccount.isSymbolMarketOpen(this.#symbol);
    }

    /** Used to get the string representation of the symbol */
    public toString (): string {
        return this.#symbol;
    }
}
