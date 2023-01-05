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
import { MidaQuotationParameters, } from "#quotations/MidaQuotationParameters";
import { IMidaCloneable, } from "#utilities/cloneable/IMidaCloneable";
import { IMidaEquatable, } from "#utilities/equatable/IMidaEquatable";
import { GenericObject, } from "#utilities/GenericObject";

/** Represents a symbol quotation */
export class MidaQuotation implements IMidaCloneable, IMidaEquatable {
    readonly #symbol: string;
    readonly #date: MidaDate;
    readonly #bid: MidaDecimal;
    readonly #ask: MidaDecimal;

    public constructor ({
        symbol,
        date,
        bid,
        ask,
    }: MidaQuotationParameters) {
        this.#symbol = symbol;
        this.#date = date;
        this.#bid = bid;
        this.#ask = ask;
    }

    /** The quotation symbol */
    public get symbol (): string {
        return this.#symbol;
    }

    /** The quotation date */
    public get date (): MidaDate {
        return this.#date;
    }

    /** The quotation bid price */
    public get bid (): MidaDecimal {
        return this.#bid;
    }

    /** The quotation ask price */
    public get ask (): MidaDecimal {
        return this.#ask;
    }

    /** The quotation average price */
    public get averagePrice (): MidaDecimal {
        return this.#bid.add(this.#ask).divide(2);
    }

    /** The quotation spread */
    public get spread (): MidaDecimal {
        return this.#ask.subtract(this.#bid);
    }

    /** Used to get a clone of the quotation */
    public clone (): any {
        return new MidaQuotation({
            symbol: this.#symbol,
            date: this.#date.clone(),
            bid: this.#bid,
            ask: this.#ask,
        });
    }

    public equals (object: GenericObject): boolean {
        return (
            object instanceof MidaQuotation
            && this.symbol === object.symbol
            && this.bid.equals(object.bid)
            && this.ask.equals(object.ask)
        );
    }
}
