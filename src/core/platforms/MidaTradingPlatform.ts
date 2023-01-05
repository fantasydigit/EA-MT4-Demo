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
import { internalLogger, } from "#loggers/MidaLogger";
import { MidaTradingPlatformParameters, } from "#platforms/MidaTradingPlatformParameters";
import { GenericObject, } from "#utilities/GenericObject";

/** Represents a trading platform */
export abstract class MidaTradingPlatform {
    readonly #name: string;
    readonly #siteUri: string;

    protected constructor ({
        name,
        siteUri,
    }: MidaTradingPlatformParameters) {
        this.#name = name;
        this.#siteUri = siteUri;
    }

    /** The platform name */
    public get name (): string {
        return this.#name;
    }

    /** The platform site address */
    public get siteUri (): string {
        return this.#siteUri;
    }

    /**
     * Used to login into a trading account
     * @param parameters The login parameters
     */
    public abstract login (parameters: GenericObject): Promise<MidaTradingAccount>;

    /* *** *** *** Reiryoku Technologies *** *** *** */

    static readonly #installedPlatforms: Map<string, MidaTradingPlatform> = new Map();

    public static get installedPlatforms (): MidaTradingPlatform[] {
        return [ ...MidaTradingPlatform.#installedPlatforms.values(), ];
    }

    public static add (id: string, platform: MidaTradingPlatform): void {
        if (MidaTradingPlatform.#installedPlatforms.has(id)) {
            internalLogger.fatal(`Trading platform "${id}" already exists`);

            throw new Error();
        }

        MidaTradingPlatform.#installedPlatforms.set(id, platform);
    }

    public static async login (id: string, parameters: GenericObject): Promise<MidaTradingAccount> {
        const platform: MidaTradingPlatform | undefined = MidaTradingPlatform.#installedPlatforms.get(id);

        if (!platform) {
            internalLogger.fatal(`Trading platform "${id}" not found, have you installed its plugin?`);

            throw new Error();
        }

        return platform.login(parameters);
    }
}
