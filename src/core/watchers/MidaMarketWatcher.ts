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
import { utcTimestamp, } from "#dates/MidaDateUtilities";
import { MidaEvent, } from "#events/MidaEvent";
import { MidaEventListener, } from "#events/MidaEventListener";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { GenericObject, } from "#utilities/GenericObject";
import { mergeOptions, } from "#utilities/MidaUtilities";
import { MidaMarketWatcherDirectives, } from "#watchers/MidaMarketWatcherDirectives";
import { MidaMarketWatcherParameters, } from "#watchers/MidaMarketWatcherParameters";
import { MidaMarketWatcherConfiguration, } from "#watchers/MidaMarketWatcherConfiguration";

export class MidaMarketWatcher {
    readonly #tradingAccount: MidaTradingAccount;
    readonly #useBuiltinPeriodCloseDetector: boolean;
    #isActive: boolean;
    readonly #watchedSymbols: Map<string, MidaMarketWatcherDirectives>;
    readonly #lastClosedPeriods: Map<string, Map<number, MidaPeriod>>;
    readonly #emitter: MidaEmitter;
    #tickListenerId?: string;
    #periodUpdateListenerId?: string;
    #closedPeriodDetectorTimeoutId?: NodeJS.Timer;
    #closedPeriodDetectorIntervalId?: NodeJS.Timer;

    public constructor ({
        tradingAccount,
        isActive,
        useBuiltinPeriodCloseDetector,
    }: MidaMarketWatcherParameters) {
        this.#tradingAccount = tradingAccount;
        this.#useBuiltinPeriodCloseDetector = useBuiltinPeriodCloseDetector ?? false;
        this.#isActive = isActive ?? true;
        this.#watchedSymbols = new Map();
        this.#lastClosedPeriods = new Map();
        this.#emitter = new MidaEmitter();
        this.#tickListenerId = undefined;
        this.#periodUpdateListenerId = undefined;
        this.#closedPeriodDetectorTimeoutId = undefined;
        this.#closedPeriodDetectorIntervalId = undefined;

        this.#configureListeners();
    }

    public get tradingAccount (): MidaTradingAccount {
        return this.#tradingAccount;
    }

    public get isActive (): boolean {
        return this.#isActive;
    }

    public set isActive (isActive: boolean) {
        this.#isActive = isActive;
    }

    public get watchedSymbols (): string[] {
        return [ ...this.#watchedSymbols.keys(), ];
    }

    public get configuration (): MidaMarketWatcherConfiguration {
        const configuration: MidaMarketWatcherConfiguration = {};

        for (const symbol of this.watchedSymbols) {
            configuration[symbol] = this.getSymbolDirectives(symbol) as MidaMarketWatcherDirectives;
        }

        return configuration;
    }

    public getSymbolDirectives (symbol: string): MidaMarketWatcherDirectives | undefined {
        return this.#watchedSymbols.get(symbol);
    }

    public async watch (symbol: string, directives: MidaMarketWatcherDirectives): Promise<void> {
        const timeframes: number[] | undefined = directives.timeframes;

        if (Array.isArray(timeframes) && timeframes.length > 0) {
            directives.timeframes = [ ...new Set(timeframes), ];
        }

        await this.#configureSymbolDirectives(symbol, directives);
        this.#watchedSymbols.set(symbol, mergeOptions(this.#watchedSymbols.get(symbol) ?? {}, directives));
    }

    public async unwatch (symbol: string): Promise<void> {
        this.#watchedSymbols.delete(symbol);
    }

    async #configureSymbolDirectives (symbol: string, directives: MidaMarketWatcherDirectives): Promise<void> {
        const previousDirectives: MidaMarketWatcherDirectives | undefined = this.#watchedSymbols.get(symbol);

        if (directives.watchTicks && !previousDirectives?.watchTicks) {
            await this.#tradingAccount.watchSymbolTicks(symbol);
        }

        if (directives.watchPeriods && Array.isArray(directives.timeframes)) {
            for (const timeframe of directives.timeframes) {
                await this.#configureSymbolTimeframe(symbol, timeframe);
            }
        }
    }

    async #configureSymbolTimeframe (symbol: string, timeframe: number): Promise<void> {
        if (this.#useBuiltinPeriodCloseDetector) {
            const periods: MidaPeriod[] = await this.#tradingAccount.getSymbolPeriods(symbol, timeframe);
            const lastPeriod: MidaPeriod = periods[periods.length - 1];

            if (!this.#lastClosedPeriods.get(symbol)) {
                this.#lastClosedPeriods.set(symbol, new Map());
            }

            this.#lastClosedPeriods.get(symbol)?.set(timeframe, lastPeriod);
        }

        await this.#tradingAccount.watchSymbolPeriods(symbol, timeframe);
    }

    public on (type: string): Promise<MidaEvent>;
    public on (type: string, listener: MidaEventListener): string;
    public on (type: string, listener?: MidaEventListener): Promise<MidaEvent> | string {
        if (!listener) {
            return this.#emitter.on(type);
        }

        return this.#emitter.on(type, listener);
    }

    public removeEventListener (uuid: string): void {
        this.#emitter.removeEventListener(uuid);
    }

    public async destroy (): Promise<void> {
        for (const symbol of this.watchedSymbols) {
            await this.unwatch(symbol);
        }

        if (this.#tickListenerId) {
            this.#tradingAccount.removeEventListener(this.#tickListenerId);
        }

        if (this.#periodUpdateListenerId) {
            this.#tradingAccount.removeEventListener(this.#periodUpdateListenerId);
        }

        if (this.#closedPeriodDetectorTimeoutId) {
            clearTimeout(this.#closedPeriodDetectorTimeoutId);
        }

        if (this.#closedPeriodDetectorIntervalId) {
            clearInterval(this.#closedPeriodDetectorIntervalId);
        }
    }

    protected notifyListeners (type: string, descriptor?: GenericObject): void {
        if (this.isActive) {
            this.#emitter.notifyListeners(type, descriptor);
        }
    }

    async #checkNewClosedPeriods (): Promise<void> {
        if (!this.isActive || !this.#useBuiltinPeriodCloseDetector) {
            return;
        }

        for (const symbol of this.watchedSymbols) {
            const directives: MidaMarketWatcherDirectives = this.#watchedSymbols.get(symbol) as MidaMarketWatcherDirectives;
            const timeframes: number[] | undefined = directives.timeframes;

            if (!directives.watchPeriods || !Array.isArray(timeframes) || timeframes.length < 1) {
                continue;
            }

            for (const timeframe of timeframes) {
                try {
                    await this.#checkClosedPeriod(symbol, timeframe);
                }
                catch {
                    // Silence is golden
                }
            }
        }
    }

    // Used to check if the last known symbol candlestick has been closed
    // Must be called approximately with a 1 minute interval
    async #checkClosedPeriod (symbol: string, timeframe: number): Promise<void> {
        if (!this.isActive || !this.#useBuiltinPeriodCloseDetector) {
            return;
        }

        const lastLocalPeriod: MidaPeriod = this.#lastClosedPeriods.get(symbol)?.get(timeframe) as MidaPeriod;
        const lastLocalPeriodCloseTimestamp: number = lastLocalPeriod.endDate.timestamp;

        // Don't request the last period if the last known period has not ended yet
        if (utcTimestamp() < lastLocalPeriodCloseTimestamp + timeframe) {
            return;
        }

        const periods: MidaPeriod[] = await this.#tradingAccount.getSymbolPeriods(symbol, timeframe);
        const lastPeriod: MidaPeriod = periods[periods.length - 1];

        if (lastPeriod.endDate.timestamp > lastLocalPeriodCloseTimestamp) {
            this.#lastClosedPeriods.get(symbol)?.set(timeframe, lastPeriod);
            this.#onPeriodUpdate(lastPeriod);
        }
    }

    #onTick (tick: MidaTick): void {
        const directives: MidaMarketWatcherDirectives | undefined = this.#watchedSymbols.get(tick.symbol);

        if (directives?.watchTicks) {
            this.notifyListeners("tick", { tick, });
        }
    }

    #onPeriodUpdate (period: MidaPeriod): void {
        const directives: MidaMarketWatcherDirectives | undefined = this.#watchedSymbols.get(period.symbol);

        if (directives?.watchPeriods && directives?.timeframes?.includes(period.timeframe)) {
            this.notifyListeners("period-update", { period, });

            if (period.isClosed) {
                this.notifyListeners("period-close", { period, });
            }
        }
    }

    #configureListeners (): void {
        // <ticks>
        this.#tickListenerId = this.#tradingAccount.on("tick", (event: MidaEvent): void => this.#onTick(event.descriptor.tick));
        // </ticks>

        // <periods>
        if (this.#useBuiltinPeriodCloseDetector) {
            const actualDate: Date = new Date();
            const roundMinute: Date = new Date(actualDate);

            roundMinute.setSeconds(0);

            this.#closedPeriodDetectorTimeoutId = setTimeout((): void => {
                this.#checkNewClosedPeriods().then();

                this.#closedPeriodDetectorIntervalId = setInterval(() => this.#checkNewClosedPeriods(), 60000);
            }, roundMinute.valueOf() + 60000 - actualDate.valueOf() + 3000); // Invoke the function the next round minute plus 3s of margin
        }
        else {
            // eslint-disable-next-line max-len
            this.#periodUpdateListenerId = this.#tradingAccount.on("period-update", (event: MidaEvent): void => this.#onPeriodUpdate(event.descriptor.period));
        }
        // </periods>
    }
}

// eslint-disable-next-line max-len
export const createMarketWatcher = async (parameters: MidaMarketWatcherParameters, configuration: MidaMarketWatcherConfiguration = {}): Promise<MidaMarketWatcher> => {
    const marketWatcher: MidaMarketWatcher = new MidaMarketWatcher(parameters);

    for (const symbol of Object.keys(configuration)) {
        if (configuration.hasOwnProperty(symbol)) {
            await marketWatcher.watch(symbol, configuration[symbol]);
        }
    }

    return marketWatcher;
};
