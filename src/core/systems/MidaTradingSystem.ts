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
import { MidaEvent, } from "#events/MidaEvent";
import { MidaEventListener, } from "#events/MidaEventListener";
import { internalLogger, } from "#loggers/MidaLogger";
import { filterExecutedOrders, MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirectives, } from "#orders/MidaOrderDirectives";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaTradingSystemParameters, } from "#systems/MidaTradingSystemParameters";
import { MidaTick, } from "#ticks/MidaTick";
import {
    filterExecutedTrades,
    getTradesFromOrders,
    MidaTrade,
} from "#trades/MidaTrade";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { GenericObject, } from "#utilities/GenericObject";
import { MidaMarketWatcher, } from "#watchers/MidaMarketWatcher";
import { MidaMarketWatcherConfiguration, } from "#watchers/MidaMarketWatcherConfiguration";
import { MidaMarketWatcherParameters, } from "#watchers/MidaMarketWatcherParameters";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaQueue, } from "#queues/MidaQueue";
import { MidaTradingSystemSymbolState, } from "#systems/MidaTradingSystemSymbolState";
import { getObjectPropertyNames, } from "#utilities/MidaUtilities";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaDecimal, } from "#decimals/MidaDecimal";

export abstract class MidaTradingSystem {
    readonly #name: string;
    readonly #description: string;
    readonly #version: string;
    readonly #tradingAccount: MidaTradingAccount;
    #isOperative: boolean;
    readonly #orders: MidaOrder[];
    readonly #capturedTicks: MidaTick[];
    readonly #capturedPeriods: MidaPeriod[];
    readonly #tickEventQueue: MidaQueue<MidaTick>;
    readonly #periodUpdateEventQueue: MidaQueue<MidaPeriod>;
    #isConfigured: boolean;
    #marketWatcher?: MidaMarketWatcher;
    readonly #symbolStates: Map<string, MidaTradingSystemSymbolState>;
    readonly #emitter: MidaEmitter;

    protected constructor ({
        name,
        description,
        version,
        tradingAccount,
    }: MidaTradingSystemParameters) {
        this.#name = name ?? "";
        this.#description = description ?? "";
        this.#version = version ?? "";
        this.#tradingAccount = tradingAccount;
        this.#isOperative = false;
        this.#orders = [];
        this.#capturedTicks = [];
        this.#capturedPeriods = [];
        this.#tickEventQueue = new MidaQueue({ worker: (tick: MidaTick): Promise<void> => this.#onTickWorker(tick), });
        this.#periodUpdateEventQueue = new MidaQueue({ worker: (period: MidaPeriod): Promise<void> => this.#onPeriodUpdateWorker(period), });
        this.#isConfigured = false;
        this.#marketWatcher = undefined;
        this.#symbolStates = new Map();
        this.#emitter = new MidaEmitter();
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

    public get tradingAccount (): MidaTradingAccount {
        return this.#tradingAccount;
    }

    public get isOperative (): boolean {
        return this.#isOperative;
    }

    public get orders (): MidaOrder[] {
        return [ ...this.#orders, ];
    }

    public get executedOrders (): MidaOrder[] {
        return filterExecutedOrders(this.#orders);
    }

    public get trades (): MidaTrade[] {
        return getTradesFromOrders(this.#orders);
    }

    public get executedTrades (): MidaTrade[] {
        return filterExecutedTrades(this.trades);
    }

    protected get capturedTicks (): MidaTick[] {
        return [ ...this.#capturedTicks, ];
    }

    protected get capturedPeriods (): MidaPeriod[] {
        return [ ...this.#capturedPeriods, ];
    }

    protected get marketWatcher (): MidaMarketWatcher | undefined {
        return this.#marketWatcher;
    }

    protected get shared (): GenericObject {
        const sharedSymbolStates: GenericObject = {};

        for (const [ symbol, state, ] of this.#symbolStates.entries()) {
            sharedSymbolStates[`$${symbol}`] = state.shared ?? {};
        }

        return sharedSymbolStates;
    }

    public async start (): Promise<void> {
        if (this.#isOperative) {
            internalLogger.warn(`Trading system "${this.name}" | Already started`);

            return;
        }

        internalLogger.debug(`Trading system "${this.name}" | Starting...`);

        if (!this.#isConfigured) {
            const isSuccessfullyConfigured: boolean = await this.#configure();

            if (!isSuccessfullyConfigured) {
                return;
            }

            this.#isConfigured = true;
        }

        // <start-hooks>
        try {
            await this.onStart();
        }
        catch (error: unknown) {
            console.log(error);

            return;
        }

        for (const symbolState of [ ...this.#symbolStates.values(), ]) {
            try {
                await symbolState.onStart?.();
            }
            catch (error: unknown) {
                console.log(error);

                return;
            }
        }
        // </start-hooks>

        this.#isOperative = true;

        if (this.#marketWatcher) {
            this.#marketWatcher.isActive = true;
        }

        this.notifyListeners("start");
        internalLogger.info("Trading System | Started");
    }

    public async stop (): Promise<void> {
        if (!this.#isOperative) {
            internalLogger.warn("Trading System | Already stopped");

            return;
        }

        internalLogger.debug("Trading System | Stopping...");

        this.#isOperative = false;

        if (this.#marketWatcher) {
            this.#marketWatcher.isActive = false;
        }

        // <stop-hooks>
        try {
            await this.onStop();
        }
        catch (error: unknown) {
            console.log(error);
        }

        for (const symbolState of [ ...this.#symbolStates.values(), ]) {
            try {
                await symbolState.onStop?.();
            }
            catch (error: unknown) {
                console.log(error);
            }
        }
        // </stop-hooks>

        this.notifyListeners("stop");
        internalLogger.info("Trading System | Stopped");
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

    protected watched (): [
        Omit<MidaMarketWatcherParameters, "tradingAccount" | "isActive">,
        MidaMarketWatcherConfiguration,
    ] | MidaMarketWatcherConfiguration {
        return {};
    }

    protected async configure (): Promise<void> {
        // Silence is golden
    }

    protected async onStart (): Promise<void> {
        // Silence is golden
    }

    protected async onPreTick (tick: MidaTick): Promise<void> {
        // Silence is golden
    }

    protected async onTick (tick: MidaTick): Promise<void> {
        // Silence is golden
    }

    protected async onLateTick (tick: MidaTick): Promise<void> {
        // Silence is golden
    }

    protected async onPrePeriodUpdate (period: MidaPeriod): Promise<void> {
        // Silence is golden
    }

    protected async onPeriodUpdate (period: MidaPeriod): Promise<void> {
        // Silence is golden
    }

    protected async onLatePeriodUpdate (period: MidaPeriod): Promise<void> {
        // Silence is golden
    }

    protected async onPrePeriodClose (period: MidaPeriod): Promise<void> {
        // Silence is golden
    }

    protected async onPeriodClose (period: MidaPeriod): Promise<void> {
        // Silence is golden
    }

    protected async onLatePeriodClose (period: MidaPeriod): Promise<void> {
        // Silence is golden
    }

    protected async onStop (): Promise<void> {
        // Silence is golden
    }

    protected async onMarketOpen (symbol: string): Promise<void> {
        // Silence is golden
    }

    protected async onMarketClose (symbol: string): Promise<void> {
        // Silence is golden
    }

    protected async onBeforePlaceOrder (directives: MidaOrderDirectives): Promise<MidaOrderDirectives | undefined> {
        return directives;
    }

    /** @deprecated */
    protected async onImpactPosition (position: MidaPosition): Promise<void> {
        // Silence is golden
    }

    protected async onPositionImpact (position: MidaPosition): Promise<void> {
        // Silence is golden
    }

    protected async watchTicks (symbol: string): Promise<void> {
        await this.marketWatcher?.watch(symbol, { watchTicks: true, });
    }

    protected async watchPeriods (symbol: string, timeframes: number[] | number): Promise<void> {
        const actualTimeframes: number[] = this.marketWatcher?.getSymbolDirectives(symbol)?.timeframes ?? [];

        await this.marketWatcher?.watch(symbol, {
            watchPeriods: true,
            timeframes: [ ...actualTimeframes, ...Array.isArray(timeframes) ? timeframes : [ timeframes, ], ],
        });
    }

    protected async unwatch (symbol: string): Promise<void> {
        await this.marketWatcher?.unwatch(symbol);
    }

    protected async placeOrder (directives: MidaOrderDirectives): Promise<MidaOrder | undefined> {
        internalLogger.info(`Trading System | Placing ${directives.direction} order`);

        let finalDirectives: MidaOrderDirectives | undefined = undefined;

        // <before-place-order-hook>
        try {
            finalDirectives = await this.onBeforePlaceOrder(directives);
        }
        catch (error) {
            console.log(error);
        }
        // </before-place-order-hook>

        if (!finalDirectives) {
            return undefined;
        }

        const order: MidaOrder = await this.#tradingAccount.placeOrder(finalDirectives);

        // <position-impact-hooks>
        // Used to wait for the position impact hooks to resolve if the order has been resolved as executed
        if (order.status === MidaOrderStatus.EXECUTED) {
            const position: MidaPosition | undefined = await order.getPosition();
            if (position) {
                try {
                    await this.onImpactPosition(position);
                }
                catch (error) {
                    console.log(error);
                }

                try {
                    await this.onPositionImpact(position);
                }
                catch (error) {
                    console.log(error);
                }
            }
        }
        // </position-impact-hooks>

        this.#orders.push(order);

        return order;
    }

    protected async getSymbolBid (symbol: string): Promise<MidaDecimal> {
        return this.tradingAccount.getSymbolBid(symbol);
    }

    protected async getSymbolAsk (symbol: string): Promise<MidaDecimal> {
        return this.tradingAccount.getSymbolAsk(symbol);
    }

    protected async getSymbolPeriods (symbol: string, timeframe: number): Promise<MidaPeriod[]> {
        return this.tradingAccount.getSymbolPeriods(symbol, timeframe);
    }

    protected notifyListeners (type: string, descriptor: GenericObject = {}): void {
        this.#emitter.notifyListeners(type, {
            ...descriptor,
            tradingSystem: this,
        });
    }

    #onTick (tick: MidaTick): void {
        if (this.#capturedTicks.length === 2 ** 10) {
            this.#capturedTicks.shift();
        }

        this.#capturedTicks.push(tick);
        // Add the tick to the worker queue
        this.#tickEventQueue.add(tick);
    }

    async #onTickWorker (tick: MidaTick): Promise<void> {
        const symbolState: MidaTradingSystemSymbolState | undefined = this.#symbolStates.get(tick.symbol);

        // <pre-tick-hooks>
        await this.onPreTick(tick);
        await symbolState?.onPreTick?.(tick);
        // </pre-tick-hooks>

        // <tick-hooks>
        await this.onTick(tick);
        await symbolState?.onTick?.(tick);
        // </tick-hooks>

        // <late-tick-hooks>
        await this.onLateTick(tick);
        await symbolState?.onLateTick?.(tick);
        // </late-tick-hooks>
    }

    #onPeriodUpdate (period: MidaPeriod): void {
        // Add the period to the worker queue
        this.#periodUpdateEventQueue.add(period);
    }

    async #onPeriodUpdateWorker (period: MidaPeriod): Promise<void> {
        const symbolState: MidaTradingSystemSymbolState | undefined = this.#symbolStates.get(period.symbol);

        // <pre-period-update-hooks>
        await this.onPrePeriodUpdate(period);
        await symbolState?.onPrePeriodUpdate?.(period);
        // </pre-period-update-hooks>

        // <period-update-hooks>
        await this.onPeriodUpdate(period);
        await symbolState?.onPeriodUpdate?.(period);
        // </period-update-hooks>

        // <late-period-update-hooks>
        await this.onLatePeriodUpdate(period);
        await symbolState?.onLatePeriodUpdate?.(period);
        // </late-period-update-hooks>

        if (period.isClosed) {
            // <pre-period-close-hooks>
            await this.onPrePeriodClose(period);
            await symbolState?.onPrePeriodClose?.(period);
            // </pre-period-close-hooks>

            // <period-close-hooks>
            await this.onPeriodClose(period);
            await symbolState?.onPeriodClose?.(period);
            // </period-close-hooks>

            // <late-period-close-hooks>
            await this.onLatePeriodClose(period);
            await symbolState?.onLatePeriodClose?.(period);
            // </late-period-close-hooks>
        }
    }

    // eslint-disable-next-line max-lines-per-function
    async #configure (): Promise<boolean> {
        this.#configureSymbolStates();

        // <market-watcher-configuration>
        const watched: [
            Omit<MidaMarketWatcherParameters, "tradingAccount" | "isActive">,
            MidaMarketWatcherConfiguration,
        ] | MidaMarketWatcherConfiguration = this.watched();
        let marketWatcherParameters: MidaMarketWatcherParameters = {
            tradingAccount: this.#tradingAccount,
            isActive: false,
        };
        let marketWatcherConfiguration: MidaMarketWatcherConfiguration;

        if (Array.isArray(watched)) {
            marketWatcherParameters = {
                ...watched[0],
                ...marketWatcherParameters,
            };
            marketWatcherConfiguration = watched[1];
        }
        else {
            marketWatcherConfiguration = watched;
        }

        this.#marketWatcher = new MidaMarketWatcher(marketWatcherParameters);

        for (const symbol in marketWatcherConfiguration) {
            if (marketWatcherConfiguration.hasOwnProperty(symbol)) {
                try {
                    await this.#marketWatcher.watch(symbol, marketWatcherConfiguration[symbol]);
                }
                catch (error: unknown) {
                    console.log(error);

                    return false;
                }
            }
        }
        // </market-watcher-configuration>

        // <configure-hooks>
        try {
            await this.configure();
        }
        catch (error: unknown) {
            console.log(error);

            return false;
        }

        for (const symbolState of [ ...this.#symbolStates.values(), ]) {
            try {
                await symbolState.configure?.();
            }
            catch (error: unknown) {
                console.log(error);

                return false;
            }
        }
        // </configure-hooks>

        this.#configureListeners();

        return true;
    }

    #configureSymbolStates (): void {
        const symbolStateGenerators: string[] = getObjectPropertyNames(this).filter((name: string) => name[0] === "$" && name.length > 1);

        for (const symbolStateGenerator of symbolStateGenerators) {
            const symbol: string = symbolStateGenerator.substring(1);
            const state: MidaTradingSystemSymbolState = this[symbolStateGenerator as `$${string}`](symbol);

            if (!state || Object.getPrototypeOf(state) !== Object.prototype) {
                internalLogger
                    .warn(`Trading System | Symbol state generator ${symbolStateGenerator} must return a plain object`);

                continue;
            }

            this.#symbolStates.set(symbol, state);
        }
    }

    #configureListeners (): void {
        this.#marketWatcher?.on("tick", (event: MidaEvent): void => this.#onTick(event.descriptor.tick));
        this.#marketWatcher?.on("period-update", (event: MidaEvent): void => this.#onPeriodUpdate(event.descriptor.period));
    }
}

/* Definition for symbol state generators */
export interface MidaTradingSystem {
    [symbolStateGenerator: `$${string}`]: (symbol: string) => MidaTradingSystemSymbolState;
}
