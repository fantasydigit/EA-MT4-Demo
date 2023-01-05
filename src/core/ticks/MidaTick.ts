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
import { MidaQuotation, } from "#quotations/MidaQuotation";
import { MidaTickMovement, } from "#ticks/MidaTickMovement";
import { MidaTickParameters, } from "#ticks/MidaTickParameters";
import { IMidaCloneable, } from "#utilities/cloneable/IMidaCloneable";
import { IMidaEquatable, } from "#utilities/equatable/IMidaEquatable";
import { GenericObject, } from "#utilities/GenericObject";

/** Represents a symbol tick */
export class MidaTick implements IMidaCloneable, IMidaEquatable {
    readonly #quotation: MidaQuotation;
    readonly #date: MidaDate;
    readonly #movement: MidaTickMovement;
    readonly #previousTick?: MidaTick;
    readonly #nextTick?: MidaTick;

    public constructor ({
        symbol,
        bid,
        ask,
        date,
        movement,
        quotation,
        previousTick,
        nextTick,
    }: MidaTickParameters) {
        if (quotation) {
            this.#quotation = quotation;
        }
        else {
            this.#quotation = new MidaQuotation({
                symbol: symbol as string,
                bid: bid as MidaDecimal,
                ask: ask as MidaDecimal,
                date: date as MidaDate,
            });
        }

        this.#date = this.#quotation.date;
        this.#movement = movement ?? MidaTickMovement.UNKNOWN;
        this.#previousTick = previousTick;
        this.#nextTick = nextTick;
    }

    /** The tick quotation */
    public get quotation (): MidaQuotation {
        return this.#quotation;
    }

    /** The tick date */
    public get date (): MidaDate {
        return this.#date;
    }

    /** The tick movement */
    public get movement (): MidaTickMovement {
        return this.#movement;
    }

    /** The tick previous to this */
    public get previousTick (): MidaTick | undefined {
        return this.#previousTick;
    }

    /** The tick next to this */
    public get nextTick (): MidaTick | undefined {
        return this.#nextTick;
    }

    /** The tick symbol */
    public get symbol (): string {
        return this.#quotation.symbol;
    }

    /** The tick bid price */
    public get bid (): MidaDecimal {
        return this.#quotation.bid;
    }

    /** The tick ask price */
    public get ask (): MidaDecimal {
        return this.#quotation.ask;
    }

    /** The tick average price */
    public get averagePrice (): MidaDecimal {
        return this.#quotation.averagePrice;
    }

    /** The tick spread */
    public get spread (): MidaDecimal {
        return this.#quotation.spread;
    }

    public clone (): MidaTick {
        return new MidaTick({
            quotation: this.#quotation.clone(),
            date: this.#date.clone(),
            movement: this.#movement,
            previousTick: this.#previousTick?.clone(),
            nextTick: this.#nextTick?.clone(),
        });
    }

    public equals (object: GenericObject): boolean {
        return (
            object instanceof MidaTick
            && this.quotation.equals(object.quotation)
            && this.date.valueOf() === object.date.valueOf()
        );
    }
}
