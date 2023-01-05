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

import { MidaIndicatorIo, } from "#indicators/MidaIndicatorIo";
import { MidaIndicatorParameters, } from "#indicators/MidaIndicatorParameters";
import { internalLogger, } from "#loggers/MidaLogger";

export abstract class MidaIndicator {
    readonly #name: string;
    readonly #description: string;
    readonly #version: string;
    #inputs: MidaIndicatorIo[];
    #values: MidaIndicatorIo[];

    protected constructor ({
        name,
        description,
        version,
    }: MidaIndicatorParameters) {
        this.#name = name;
        this.#description = description ?? "";
        this.#version = version;
        this.#inputs = [];
        this.#values = [];
    }

    public get name (): string {
        return this.#name;
    }

    public get description (): string {
        return this.#description;
    }

    public get version (): string {
        return this.#version;
    }

    public get inputs (): MidaIndicatorIo[] {
        return [ ...this.#inputs, ];
    }

    public get values (): MidaIndicatorIo[] {
        return [ ...this.#values, ];
    }

    public get lastValue (): MidaIndicatorIo | undefined {
        const values: MidaIndicatorIo[] = this.values;

        return values[values.length - 1];
    }

    public abstract calculate (input: MidaIndicatorIo[]): Promise<MidaIndicatorIo[]>;

    public async next (input: MidaIndicatorIo[]): Promise<MidaIndicatorIo[]> {
        const inputs: MidaIndicatorIo[] = [ ...this.inputs, ...input, ];
        const value: MidaIndicatorIo[] = await this.calculate(inputs);

        this.#inputs = inputs;
        this.#values = value;

        return value;
    }

    public clear (): void {
        this.#inputs = [];
        this.#values = [];
    }

    /* *** *** *** Reiryoku Technologies *** *** *** */

    static readonly #installedIndicators: Map<string, (params?: Record<string, any>) => MidaIndicator> = new Map();

    public static get installedIndicators (): string[] {
        return [ ...MidaIndicator.#installedIndicators.keys(), ];
    }

    public static add (id: string, indicator: (params?: Record<string, any>) => MidaIndicator): void {
        if (MidaIndicator.#installedIndicators.has(id)) {
            internalLogger.fatal(`Indicator | An indicator with ID "${id}" already exists`);

            throw new Error();
        }

        MidaIndicator.#installedIndicators.set(id, indicator);
    }

    public static has (id: string): boolean {
        return MidaIndicator.#installedIndicators.has(id);
    }

    public static create (id: string, params?: Record<string, any>): MidaIndicator {
        const indicator: ((params?: Record<string, any>) => MidaIndicator) | undefined = MidaIndicator.#installedIndicators.get(id);

        if (!indicator) {
            internalLogger.fatal(`Indicator | Indicator with ID "${id}" not found, have you installed its plugin?`);

            throw new Error();
        }

        return indicator(params);
    }
}
