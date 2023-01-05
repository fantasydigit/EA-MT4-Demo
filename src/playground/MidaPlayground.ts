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

import { MidaPlaygroundAccount, } from "!/src/playground/accounts/MidaPlaygroundAccount";
import { internalLogger, } from "#loggers/MidaLogger";
import { MidaTradingPlatform, } from "#platforms/MidaTradingPlatform";

class MidaPlayground extends MidaTradingPlatform {
    public constructor () {
        super({
            name: "Mida Playground",
            siteUri: "https://github.com/Reiryoku-Technologies/Mida",
        });
    }

    public override async login (parameters: Record<string, any> = {}): Promise<MidaPlaygroundAccount> {
        const id: string = parameters.id;
        const account: MidaPlaygroundAccount | undefined = MidaPlayground.#tradingAccounts.get(id);

        if (!account) {
            internalLogger.fatal(`Playground | Account with ID ${id} not found`);

            throw new Error();
        }

        return account;
    }

    /* *** *** *** Reiryoku Technologies *** *** *** */

    static readonly #tradingAccounts: Map<string, MidaPlaygroundAccount> = new Map();

    public static addTradingAccount (id: string, tradingAccount: MidaPlaygroundAccount): void {
        if (MidaPlayground.#tradingAccounts.has(id)) {
            internalLogger.fatal(`Playground | Account with ID ${id} already exists`);

            throw new Error();
        }

        MidaPlayground.#tradingAccounts.set(id, tradingAccount);
    }
}

const PLAYGROUND_PLATFORM_KEY: string = "Mida/Playground";
const playgroundPlatform: MidaTradingPlatform = new MidaPlayground();

MidaTradingPlatform.add(PLAYGROUND_PLATFORM_KEY, new MidaPlayground());

// <public-api>
export { MidaPlayground, };
export { playgroundPlatform, };

export { MidaPlaygroundEngine, } from "!/src/playground/MidaPlaygroundEngine";
export { MidaPlaygroundEngineElapsedData, } from "!/src/playground/MidaPlaygroundEngineElapsedData";
export { MidaPlaygroundEngineParameters, } from "!/src/playground/MidaPlaygroundEngineParameters";

export { tickFromPeriod, } from "!/src/playground/MidaPlaygroundUtilities";

export { MidaPlaygroundAccount, } from "!/src/playground/accounts/MidaPlaygroundAccount";
export { MidaPlaygroundAccountConfiguration, } from "!/src/playground/accounts/MidaPlaygroundAccountConfiguration";
export { MidaPlaygroundAccountParameters, } from "!/src/playground/accounts/MidaPlaygroundAccountParameters";

export { backtest, } from "!/src/playground/backtests/MidaBacktest";
export { MidaBacktestDirectives, } from "!/src/playground/backtests/MidaBacktestDirectives";
export { MidaBacktestSymbolDirectives, } from "!/src/playground/backtests/MidaBacktestSymbolDirectives";
export { MidaBacktestTargetDirectives, } from "!/src/playground/backtests/MidaBacktestTargetDirectives";

export { MidaPlaygroundCommissionCustomizer, } from "!/src/playground/customizers/MidaPlaygroundCommissionCustomizer";
export { MidaPlaygroundLatencyCustomizer, } from "!/src/playground/customizers/MidaPlaygroundLatencyCustomizer";

export { MidaPlaygroundOrder, } from "!/src/playground/orders/MidaPlaygroundOrder";
export { MidaPlaygroundOrderParameters, } from "!/src/playground/orders/MidaPlaygroundOrderParameters";

export { MidaPlaygroundPosition, } from "!/src/playground/positions/MidaPlaygroundPosition";
export { MidaPlaygroundPositionParameters, } from "!/src/playground/positions/MidaPlaygroundPositionParameters";

export { MidaPlaygroundTrade, } from "!/src/playground/trades/MidaPlaygroundTrade";
export { MidaPlaygroundTradeParameters, } from "!/src/playground/trades/MidaPlaygroundTradeParameters";
// </public-api>
