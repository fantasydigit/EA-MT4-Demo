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
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaUnsupportedOperationError, } from "#errors/MidaUnsupportedOperationError";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaProtectionChange, } from "#protections/MidaProtectionChange";
import { MidaProtectionDirectives, } from "#protections/MidaProtectionDirectives";
import { GenericObject, } from "#utilities/GenericObject";
import { randomUUID as uuid4, } from "crypto";

/** Used to create a Promise resolved after a given number of milliseconds */
export const wait = async (milliseconds: number): Promise<void> => {
    await new Promise((resolve: any): any => setTimeout(resolve, milliseconds));
};

/** Used to shuffle an array */
export const shuffleArray = (array: any[]): any[] => {
    let length: number = array.length;

    while (length > 0) {
        const randomIndex: number = generateInRandomInteger(0, length - 1);
        const element: any = array[--length];

        array[length] = array[randomIndex];
        array[randomIndex] = element;
    }

    return array;
};

/** Used to generate a random integer (inclusive range) */
export const generateInRandomInteger = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

/** Used to merge two options objects */
export const mergeOptions = (initial: GenericObject, primary: GenericObject): GenericObject => {
    const options: GenericObject = {
        ...initial,
        ...primary,
    };

    for (const key in initial) {
        if (!initial.hasOwnProperty(key) || !primary.hasOwnProperty(key)) {
            continue;
        }

        const initialValue: any = initial[key];
        const userValue: any = primary[key];

        if (!initialValue || !userValue) {
            continue;
        }

        if (initialValue.constructor === Object && userValue.constructor === Object) {
            options[key] = mergeOptions(initialValue, userValue);
        }
    }

    return options;
};

/** Used to generate a random UUID */
export const uuid = (): string => uuid4();

/** Used to create a closed position */
// eslint-disable-next-line arrow-body-style
export const createClosedPosition = (id: string, tradingAccount: MidaTradingAccount, symbol: string): MidaPosition => {
    return new class extends MidaPosition {
        public constructor () {
            super({
                id,
                tradingAccount,
                symbol,
                volume: decimal(0),
            });
        }

        public override async addVolume (volume: MidaDecimal): Promise<MidaOrder> {
            throw new MidaUnsupportedOperationError();
        }

        public override async subtractVolume (volume: MidaDecimal): Promise<MidaOrder> {
            throw new MidaUnsupportedOperationError();
        }

        public override async changeProtection (protection: MidaProtectionDirectives): Promise<MidaProtectionChange> {
            throw new MidaUnsupportedOperationError();
        }

        public override async getUnrealizedCommission (): Promise<MidaDecimal> {
            return decimal(0);
        }

        public override async getUnrealizedGrossProfit (): Promise<MidaDecimal> {
            return decimal(0);
        }

        public override async getUnrealizedSwap (): Promise<MidaDecimal> {
            return decimal(0);
        }

        public override async getUsedMargin (): Promise<MidaDecimal> {
            return decimal(0);
        }
    }();
};

/** Used to get all the property names of an object */
export const getObjectPropertyNames = (object: GenericObject): string[] => {
    const names: string[] = [];
    let prototype: any = object;

    do {
        names.push(...Object.getOwnPropertyNames(prototype));

        prototype = Object.getPrototypeOf(prototype);
    }
    while (prototype !== Object.prototype);

    return names;
};

/** Used to create a Promise resolved when a given order enters in a given state */
export const createOrderResolver = (order: MidaOrder, resolvers?: string[]): Promise<MidaOrder> => {
    const resolverEvents: string[] = resolvers ?? [
        "reject",
        "pending",
        "cancel",
        "expire",
        "execute",
    ];

    return new Promise((resolve: (order: MidaOrder) => void) => {
        if (resolverEvents.length === 0) {
            resolve(order);
        }
        else {
            const resolverEventsUuids: Map<string, string> = new Map();

            for (const eventType of resolverEvents) {
                resolverEventsUuids.set(eventType, order.on(eventType, (): void => {
                    for (const uuid of [ ...resolverEventsUuids.values(), ]) {
                        order.removeEventListener(uuid);
                    }

                    resolve(order);
                }));
            }
        }
    });
};
