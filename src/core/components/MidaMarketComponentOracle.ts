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

import { MidaMarketComponentState, } from "#components/MidaMarketComponentState";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPeriodPriceKey, } from "#periods/MidaPeriodPriceKey";
import { MidaTradingSystem, } from "#systems/MidaTradingSystem";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaMarketWatcherDirectives, } from "#watchers/MidaMarketWatcherDirectives";

/**
 * The Oracle takes real-time data from the market and provides it to component states
 */
export class MidaMarketComponentOracle extends MidaTradingSystem {
    readonly #state: MidaMarketComponentState;

    public constructor (state: MidaMarketComponentState) {
        super({ tradingAccount: state.$tradingAccount, });

        this.#state = state;
    }

    get #symbol (): string {
        return this.#state.$symbol;
    }

    protected async configureWatcher (state: MidaMarketComponentState): Promise<void> {
        // <dependencies>
        await Promise.all(state.$dependencies.map((dependency: MidaMarketComponentState) => this.configureWatcher(dependency)));
        // </dependencies>

        const directives: MidaMarketWatcherDirectives = state.$watcher;

        if (directives.watchTicks) {
            await this.watchTicks(this.#symbol);
        }

        if (directives.watchPeriods) {
            const timeframes: MidaTimeframe[] = directives.timeframes ?? [];

            for (const timeframe of timeframes) {
                state.$periods[timeframe] = await this.getSymbolPeriods(this.#symbol, timeframe);
            }

            await this.watchPeriods(this.#symbol, timeframes);
        }
    }

    protected async configureIndicators (state: MidaMarketComponentState): Promise<void> {
        // <dependencies>
        await Promise.all(state.$dependencies.map((dependency: MidaMarketComponentState) => this.configureIndicators(dependency)));
        // </dependencies>

        for (const { input, } of Object.values(state.$indicators)) {
            await this.updateIndicators(state, state.$periods[input.timeframe]);
        }
    }

    protected async awake (state: MidaMarketComponentState): Promise<void> {
        // <dependencies>
        await Promise.all(state.$dependencies.map((dependency: MidaMarketComponentState) => this.awake(dependency)));
        // </dependencies>

        await state.$component.awake?.call(state);
    }

    protected override async onStart (): Promise<void> {
        await this.configureWatcher(this.#state);
        await this.configureIndicators(this.#state);

        await this.awake(this.#state);
    }

    protected async dispatchTick (state: MidaMarketComponentState, tick: MidaTick): Promise<void> {
        // <dependencies>
        await Promise.all(state.$dependencies.map((dependency: MidaMarketComponentState) => this.dispatchTick(dependency, tick)));
        // </dependencies>

        if (!state.$watcher.watchTicks) {
            return;
        }

        state.$ticks = this.capturedTicks;
        state.$bid = tick.bid;
        state.$ask = tick.ask;

        await state.$component.tick?.call(state, tick);
        await state.$component.update?.call(state);
        await state.$component.lateUpdate?.call(state);
    }

    protected override async onTick (tick: MidaTick): Promise<void> {
        await this.dispatchTick(this.#state, tick);
    }

    protected async dispatchPeriodUpdate (state: MidaMarketComponentState, period: MidaPeriod): Promise<void> {
        // <dependencies>
        await Promise.all(state.$dependencies.map((dependency: MidaMarketComponentState) => this.dispatchPeriodUpdate(dependency, period)));
        // </dependencies>

        const timeframe: MidaTimeframe = period.timeframe;

        if (!state.$watcher.watchPeriods || !state.$watcher.timeframes?.includes(timeframe)) {
            return;
        }

        const closedPeriods: MidaPeriod[] = state.$periods[timeframe] ?? [];

        state.$livePeriods[timeframe] = period;

        // <indicators>
        await this.updateIndicators(state, [ ...closedPeriods, period, ]);
        // </indicators>

        // <hooks>
        await state.$component.periodUpdate?.call(state, period);
        await state.$component[`${MidaTimeframe[timeframe].toLowerCase()}PeriodUpdate`]?.call(state, period);
        await state.$component.update?.call(state);
        await state.$component.lateUpdate?.call(state);
        // </hooks>
    }

    protected override async onPeriodUpdate (period: MidaPeriod): Promise<void> {
        await this.dispatchPeriodUpdate(this.#state, period);
    }

    protected async dispatchPeriodClose (state: MidaMarketComponentState, period: MidaPeriod): Promise<void> {
        // <dependencies>
        await Promise.all(state.$dependencies.map((dependency: MidaMarketComponentState) => this.dispatchPeriodClose(dependency, period)));
        // </dependencies>

        const timeframe: MidaTimeframe = period.timeframe;

        if (!state.$watcher.watchPeriods || !state.$watcher.timeframes?.includes(timeframe)) {
            return;
        }

        const closedPeriods: MidaPeriod[] = [ ...state.$periods[timeframe] ?? [], period, ];

        state.$periods[timeframe] = closedPeriods;

        // <indicators>
        await this.updateIndicators(state, closedPeriods);
        // </indicators>

        // <hooks>
        await state.$component.periodClose?.call(state, period);
        await state.$component[`${MidaTimeframe[timeframe].toLowerCase()}PeriodClose`]?.call(state, period);
        await state.$component.update?.call(state);
        await state.$component.lateUpdate?.call(state);
        // </hooks>
    }

    protected override async onPeriodClose (period: MidaPeriod): Promise<void> {
        await this.dispatchPeriodClose(this.#state, period);
    }

    /** This method updates only the indicators of the given state and not its dependencies */
    protected async updateIndicators (state: MidaMarketComponentState, periods: MidaPeriod[]): Promise<void> {
        const timeframe: MidaTimeframe = periods[0].timeframe;
        const lastPeriod: MidaPeriod = periods[periods.length - 1];

        // eslint-disable-next-line max-len
        await Promise.all(Object.values(state.$indicators).map(async ({ indicator, input, }) => {
            if (timeframe !== input.timeframe || !lastPeriod.isClosed && !input.live) {
                return;
            }

            const processor: ((periods: MidaPeriod[]) => any) | undefined = input.processor;
            const priceKeys: MidaPeriodPriceKey | MidaPeriodPriceKey[] = input.type;
            const cappedPeriods: MidaPeriod[] = periods.slice(Math.max(periods.length - input.limit, 0));
            let indicatorInput: any = [];

            if (typeof processor === "function") {
                indicatorInput = await processor(cappedPeriods);
            }
            else if (Array.isArray(priceKeys)) {
                for (const priceKey of priceKeys) {
                    indicatorInput = [ ...indicatorInput, [ ...cappedPeriods.map((period) => period[priceKey]), ], ];
                }
            }
            else {
                indicatorInput = [ ...cappedPeriods.map((period) => period[priceKeys]), ];
            }

            indicator.clear();
            await indicator.next(indicatorInput);
        }));
    }
}
