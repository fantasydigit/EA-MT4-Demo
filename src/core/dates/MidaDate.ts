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

import { MidaDateConvertible, } from "#dates/MidaDateConvertible";
import { utcTimestamp, } from "#dates/MidaDateUtilities";
import { internalLogger, } from "#loggers/MidaLogger";
import { IMidaCloneable, } from "#utilities/cloneable/IMidaCloneable";
import { IMidaEquatable, } from "#utilities/equatable/IMidaEquatable";
import { GenericObject, } from "#utilities/GenericObject";
import { inspect, } from "util";

/** Represents an immutable UTC date */
export class MidaDate implements IMidaCloneable, IMidaEquatable {
    readonly #date: Date;
    readonly #iso: string;

    public constructor (value?: MidaDateConvertible) {
        let date: Date;

        if (value instanceof MidaDate) {
            date = value.#date;
        }
        else if (value instanceof Date) {
            date = new Date(value.getTime());
        }
        else {
            switch (typeof value) {
                case "number": {
                    date = new Date(value);

                    break;
                }
                case "string": {
                    const possiblyIso: boolean = !Number.isFinite(Number(value));

                    date = new Date(possiblyIso ? value : Number(value));

                    break;
                }
                default: {
                    date = new Date(utcTimestamp());
                }
            }
        }

        if (!Number.isFinite(date.getTime())) {
            internalLogger.fatal("Invalid date");

            throw new Error();
        }

        this.#date = date;
        this.#iso = date.toISOString();
    }

    public get timestamp (): number {
        return this.#date.getTime();
    }

    public get milliseconds (): number {
        return this.#date.getUTCMilliseconds();
    }

    public get seconds (): number {
        return this.#date.getUTCSeconds();
    }

    public get minutes (): number {
        return this.#date.getUTCMinutes();
    }

    public get hours (): number {
        return this.#date.getUTCHours();
    }

    public get weekDay (): number {
        return this.#date.getUTCDay();
    }

    public get monthDay (): number {
        return this.#date.getUTCDate();
    }

    public get month (): number {
        return this.#date.getUTCMonth();
    }

    public get iso (): string {
        return this.#iso;
    }

    public add (milliseconds: number): MidaDate {
        return date(this.timestamp + milliseconds);
    }

    public addSeconds (seconds: number): MidaDate {
        return date(this.timestamp + seconds * 1000);
    }

    public addMinutes (minutes: number): MidaDate {
        return date(this.timestamp + minutes * 1000 * 60);
    }

    public addHours (hours: number): MidaDate {
        return date(this.timestamp + hours * 1000 * 60 * 60);
    }

    public subtract (milliseconds: number): MidaDate {
        return date(this.timestamp - milliseconds);
    }

    public subtractSeconds (seconds: number): MidaDate {
        return date(this.timestamp - seconds * 1000);
    }

    public subtractMinutes (minutes: number): MidaDate {
        return date(this.timestamp - minutes * 1000 * 60);
    }

    public subtractHours (hours: number): MidaDate {
        return date(this.timestamp - hours * 1000 * 60 * 60);
    }

    public differenceInMinutes (date: MidaDate): number {
        return Math.abs(this.timestamp - date.timestamp) / 60000;
    }

    public differenceInDays (date: MidaDate): number {
        return Math.abs(this.timestamp - date.timestamp) / 86400000;
    }

    public setMilliseconds (milliseconds: number): MidaDate {
        return date(new Date(this.timestamp).setUTCMilliseconds(milliseconds));
    }

    public setSeconds (seconds: number): MidaDate {
        return date(new Date(this.timestamp).setUTCSeconds(seconds));
    }

    public setMinutes (minutes: number): MidaDate {
        return date(new Date(this.timestamp).setUTCMinutes(minutes));
    }

    public setHours (hours: number): MidaDate {
        return date(new Date(this.timestamp).setUTCHours(hours));
    }

    public toString (): string {
        return this.#iso;
    }

    public valueOf (): number {
        return this.timestamp;
    }

    public clone (): MidaDate {
        return date(this);
    }

    public equals (object: GenericObject): boolean {
        return (
            object instanceof MidaDate && object.timestamp === this.timestamp
            || object instanceof Date && object.getTime() === this.timestamp
        );
    }

    public [inspect.custom] (): string {
        return this.iso;
    }
}

export const date = (value?: MidaDateConvertible): MidaDate => new MidaDate(value);
