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
import { MidaBacktestDirectives, } from "!/src/playground/backtests/MidaBacktestDirectives";
import { MidaBacktestTargetDirectives, } from "!/src/playground/backtests/MidaBacktestTargetDirectives";
import { MidaPlaygroundEngine, } from "!/src/playground/MidaPlaygroundEngine";
import { marketComponent, } from "#components/MidaMarketComponent";
import { date, } from "#dates/MidaDate";
import { internalLogger, } from "#loggers/MidaLogger";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaMarketWatcherDirectives, } from "#watchers/MidaMarketWatcherDirectives";

// It's not about how much you can make in one day or one month, it's all about how long you can last in this market
// eslint-disable-next-line max-lines-per-function
export const backtest = async (directives: MidaBacktestDirectives): Promise<MidaPlaygroundAccount> => {
    const engine: MidaPlaygroundEngine = new MidaPlaygroundEngine({ localDate: 0, });
    const account: MidaPlaygroundAccount = await engine.createAccount({ balanceSheet: directives.balanceSheet, });
    const timeframes: MidaTimeframe[] = [];

    for (const [ symbol, symbolDirectives, ] of Object.entries(directives.symbols)) {
        await account.addSymbol({
            symbol,
            ...symbolDirectives.params,
        });

        // <ticks>
        const ticks: MidaTick[] | undefined = symbolDirectives.ticks;

        if (ticks) {
            await engine.addSymbolTicks(symbol, ticks);
        }
        // </ticks>

        // <periods>
        const periodsByTimeframe: Record<MidaTimeframe, MidaPeriod[]> | undefined = symbolDirectives.periods;

        if (periodsByTimeframe) {
            for (const [ timeframe, periods, ] of Object.entries(periodsByTimeframe)) {
                await engine.addSymbolPeriods(symbol, periods);
                timeframes.push(Number(timeframe));
            }
        }
        // </periods>
    }

    await engine.elapseTime((date(directives.from).timestamp - engine.localDate.timestamp) / 1000);

    const target: MidaBacktestTargetDirectives = directives.target;
    engine.waitFeedConfirmation = true;

    const equityByDay: Record<string, number> = {};

    await marketComponent({
        dependencies: {
            target: {
                type: target.type,
                params: target.params,
            },
        },

        watcher (): MidaMarketWatcherDirectives {
            return {
                watchTicks: true,
                watchPeriods: true,
                timeframes,
            };
        },

        async d1PeriodClose (period: MidaPeriod): Promise<void> {
            const { endDate, } = period;

            internalLogger.info(`Playground | Backtested ${endDate.iso.split("T")[0]}`);

            equityByDay[endDate.iso] = (await this.$tradingAccount.getEquity()).toNumber();
        },

        async lateUpdate (): Promise<void> {
            engine.nextFeed();
        },
    })(account, target.symbol);

    await engine.elapseTime((date(directives.to).timestamp - engine.localDate.timestamp) / 1000);

    return account;
};
