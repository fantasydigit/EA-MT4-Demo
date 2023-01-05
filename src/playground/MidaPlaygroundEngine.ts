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
import { MidaPlaygroundAccountConfiguration, } from "!/src/playground/accounts/MidaPlaygroundAccountConfiguration";
import { MidaPlaygroundCommissionCustomizer, } from "!/src/playground/customizers/MidaPlaygroundCommissionCustomizer";
import { MidaPlayground, playgroundPlatform, } from "!/src/playground/MidaPlayground";
import { MidaPlaygroundEngineElapsedData, } from "!/src/playground/MidaPlaygroundEngineElapsedData";
import { MidaPlaygroundEngineParameters, } from "!/src/playground/MidaPlaygroundEngineParameters";
import { tickFromPeriod, } from "!/src/playground/MidaPlaygroundUtilities";
import { MidaPlaygroundOrder, } from "!/src/playground/orders/MidaPlaygroundOrder";
import { MidaPlaygroundPosition, } from "!/src/playground/positions/MidaPlaygroundPosition";
import { MidaPlaygroundTrade, } from "!/src/playground/trades/MidaPlaygroundTrade";
import { MidaTradingAccount, } from "#accounts/MidaTradingAccount";
import { date, MidaDate, } from "#dates/MidaDate";
import { MidaDateConvertible, } from "#dates/MidaDateConvertible";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaDecimalConvertible, } from "#decimals/MidaDecimalConvertible";
import { MidaEvent, } from "#events/MidaEvent";
import { MidaEventListener, } from "#events/MidaEventListener";
import { internalLogger, } from "#loggers/MidaLogger";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderDirectives, } from "#orders/MidaOrderDirectives";
import { MidaOrderExecution, } from "#orders/MidaOrderExecution";
import { MidaOrderPurpose, } from "#orders/MidaOrderPurpose";
import { MidaOrderRejection, } from "#orders/MidaOrderRejection";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaOrderTimeInForce, } from "#orders/MidaOrderTimeInForce";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaPositionDirection, } from "#positions/MidaPositionDirection";
import { MidaPositionStatus, } from "#positions/MidaPositionStatus";
import { MidaProtection, } from "#protections/MidaProtection";
import { MidaProtectionDirectives, } from "#protections/MidaProtectionDirectives";
import { MidaSymbol, } from "#symbols/MidaSymbol";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaTrade, } from "#trades/MidaTrade";
import { MidaTradeDirection, } from "#trades/MidaTradeDirection";
import { MidaTradePurpose, } from "#trades/MidaTradePurpose";
import { MidaTradeStatus, } from "#trades/MidaTradeStatus";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { createOrderResolver, uuid, } from "#utilities/MidaUtilities";

/*
 * 5W (Who, What, Where, When, Why)
 * This is a trading simulator created by Vasile Pește, Reiryoku Technologies and its contributors.
*/

export class MidaPlaygroundEngine {
    #localDate: MidaDate;
    readonly #localTicks: Map<string, MidaTick[]>;
    readonly #lastTicks: Map<string, MidaTick>;
    readonly #lastTicksIndexes: Map<string, number>;
    readonly #localPeriods: Map<string, Map<MidaTimeframe, MidaPeriod[]>>;
    readonly #lastPeriodsIndexes: Map<string, Map<MidaTimeframe, number>>;
    readonly #orders: Map<string, MidaPlaygroundOrder>;
    readonly #trades: Map<string, MidaPlaygroundTrade>;
    readonly #positions: Map<string, MidaPlaygroundPosition>;
    readonly #tradingAccounts: Map<string, MidaPlaygroundAccount>;
    #commissionCustomizer?: MidaPlaygroundCommissionCustomizer;
    #waitFeedConfirmation: boolean;
    #feedResolver?: () => void;
    #feedResolverPromise: Promise<void> | undefined;
    readonly #emitter: MidaEmitter;
    readonly #protectedEmitter: MidaEmitter;

    public constructor ({ localDate, commissionCustomizer, }: MidaPlaygroundEngineParameters = {}) {
        this.#localDate = date(localDate ?? 0);
        this.#localTicks = new Map();
        this.#lastTicks = new Map();
        this.#lastTicksIndexes = new Map();
        this.#localPeriods = new Map();
        this.#lastPeriodsIndexes = new Map();
        this.#orders = new Map();
        this.#trades = new Map();
        this.#positions = new Map();
        this.#tradingAccounts = new Map();
        this.#commissionCustomizer = commissionCustomizer;
        this.#waitFeedConfirmation = false;
        this.#feedResolver = undefined;
        this.#feedResolverPromise = undefined;
        this.#emitter = new MidaEmitter();
        this.#protectedEmitter = new MidaEmitter();
    }

    public get localDate (): MidaDate {
        return this.#localDate;
    }

    public get orders (): MidaOrder[] {
        return [ ...this.#orders.values(), ];
    }

    public get trades (): MidaTrade[] {
        return [ ...this.#trades.values(), ];
    }

    public get positions (): MidaPosition[] {
        return [ ...this.#positions.values(), ];
    }

    public get waitFeedConfirmation (): boolean {
        return this.#waitFeedConfirmation;
    }

    public set waitFeedConfirmation (waitFeedConfirmation: boolean) {
        this.#waitFeedConfirmation = waitFeedConfirmation;
    }

    public setLocalDate (date: MidaDateConvertible): void {
        this.#localDate = new MidaDate(date);

        this.#lastTicksIndexes.clear();
        this.#lastPeriodsIndexes.clear();
    }

    public setCommissionCustomizer (customizer?: MidaPlaygroundCommissionCustomizer): void {
        this.#commissionCustomizer = customizer;
    }

    public async getSymbolExchangeRate (symbol: string): Promise<MidaDecimal[]> {
        let lastTick: MidaTick | undefined = this.#lastTicks.get(symbol);

        if (!lastTick) {
            for (const tick of this.#localTicks.get(symbol) ?? []) {
                if (tick.date.timestamp <= this.#localDate.timestamp) {
                    lastTick = tick;

                    this.#lastTicks.set(symbol, tick);
                }
            }
        }

        if (!lastTick) {
            throw new Error("No quotes available");
        }

        return [ lastTick.bid, lastTick.ask, ];
    }

    public async getSymbolBid (symbol: string): Promise<MidaDecimal> {
        return (await this.getSymbolExchangeRate(symbol))[0];
    }

    public async getSymbolAsk (symbol: string): Promise<MidaDecimal> {
        return (await this.getSymbolExchangeRate(symbol))[1];
    }

    public async getSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<MidaPeriod[]> {
        const periods: MidaPeriod[] = this.#localPeriods.get(symbol)?.get(timeframe) ?? [];

        return periods.filter((period: MidaPeriod) => period.endDate.timestamp <= this.#localDate.timestamp);
    }

    // eslint-disable-next-line max-lines-per-function
    public async placeOrder (tradingAccount: MidaPlaygroundAccount, directives: MidaOrderDirectives): Promise<MidaPlaygroundOrder> {
        const positionId: string | undefined = directives.positionId;
        let symbol: string;
        let purpose: MidaOrderPurpose;

        if (positionId) {
            const position: MidaPosition | undefined = await this.getOpenPositionById(positionId);

            if (!position) {
                throw new Error("Position not found");
            }

            symbol = position.symbol;

            if (
                directives.direction === MidaOrderDirection.BUY && position.direction === MidaPositionDirection.LONG ||
                directives.direction === MidaOrderDirection.SELL && position.direction === MidaPositionDirection.SHORT
            ) {
                purpose = MidaOrderPurpose.OPEN;
            }
            else {
                purpose = MidaOrderPurpose.CLOSE;
            }
        }
        else {
            symbol = directives.symbol as string;
            purpose = MidaOrderPurpose.OPEN; // Hedged account, always open a position if no specific position is impacted
        }

        const creationDate: MidaDate = this.#localDate;
        const order: MidaPlaygroundOrder = new MidaPlaygroundOrder({
            id: uuid(),
            tradingAccount,
            symbol,
            requestedVolume: decimal(directives.volume),
            direction: directives.direction,
            purpose,
            limitPrice: directives.limit !== undefined ? decimal(directives.limit) : undefined,
            stopPrice: directives.stop !== undefined ? decimal(directives.stop) : undefined,
            status: MidaOrderStatus.REQUESTED,
            creationDate,
            lastUpdateDate: creationDate,
            positionId,
            trades: [],
            timeInForce: directives.timeInForce ?? MidaOrderTimeInForce.GOOD_TILL_CANCEL,
            isStopOut: false,
            engineEmitter: this.#protectedEmitter,
            requestedProtection: directives.protection,
        });

        this.#orders.set(order.id, order);

        const resolver: Promise<MidaPlaygroundOrder> = createOrderResolver(order, directives.resolverEvents) as Promise<MidaPlaygroundOrder>;
        const listeners: { [eventType: string]: MidaEventListener } = directives.listeners ?? {};

        for (const eventType of Object.keys(listeners)) {
            order.on(eventType, listeners[eventType]);
        }

        this.acceptOrder(order.id);

        if (order.execution === MidaOrderExecution.MARKET) {
            this.tryExecuteOrder(order); // Not necessary to await because of resolver
        }
        else {
            this.moveOrderToPending(order.id);

            // Used to check if the pending order can be executed at the current tick
            this.#updatePendingOrder(order, this.#lastTicks.get(symbol) as MidaTick); // Not necessary to await because of resolver
        }

        /*
        if (directives.protection?.stopLoss) {
            this.placeOrder(tradingAccount, {
                ...directives,
                protection: {},
                direction: MidaOrderDirection.oppositeOf(directives.direction),
                stop: directives.protection?.stopLoss,
            });
        }

        if (directives.protection?.takeProfit) {
            this.placeOrder(tradingAccount, {
                ...directives,
                protection: {},
                direction: MidaOrderDirection.oppositeOf(directives.direction),
                limit: directives.protection?.takeProfit,
            });
        }*/

        return resolver;
    }

    /**
     * Elapses a given amount of time (triggering the respective ticks)
     * @param seconds Amount of seconds to elapse
     */
    // eslint-disable-next-line max-lines-per-function
    public async elapseTime (seconds: number): Promise<MidaPlaygroundEngineElapsedData> {
        if (seconds <= 0) {
            return {
                elapsedTicks: [],
                elapsedPeriods: [],
            };
        }

        const previousDate: MidaDate = this.#localDate;
        const currentDate: MidaDate = previousDate.addSeconds(seconds);

        // <elapsed-ticks>
        const elapsedTicks: MidaTick[] = [];

        for (const symbol of [ ...this.#localTicks.keys(), ]) {
            const ticks: MidaTick[] = this.#localTicks.get(symbol) ?? [];
            const lastTickIndex: number = this.#lastTicksIndexes.get(symbol) ?? -1;

            for (let i: number = lastTickIndex + 1; i < ticks.length; ++i) {
                const tick: MidaTick = ticks[i];

                if (tick.date.timestamp > previousDate.timestamp && tick.date.timestamp <= currentDate.timestamp) {
                    elapsedTicks.push(tick);
                    this.#lastTicksIndexes.set(symbol, i);
                }
            }
        }

        await this.#processTicks(elapsedTicks);
        // </elapsed-ticks>

        // <elapsed-periods>
        const elapsedPeriods: MidaPeriod[] = [];

        for (const symbol of [ ...this.#localPeriods.keys(), ]) {
            for (const timeframe of [ ...this.#localPeriods.get(symbol)?.keys() ?? [], ]) {
                const periods: MidaPeriod[] = this.#localPeriods.get(symbol)?.get(timeframe) ?? [];
                const lastPeriodIndex: number = this.#lastPeriodsIndexes.get(symbol)?.get(timeframe) ?? -1;

                for (let i: number = lastPeriodIndex + 1; i < periods.length; ++i) {
                    const period: MidaPeriod = periods[i];

                    if (period.endDate.timestamp > previousDate.timestamp && period.endDate.timestamp <= currentDate.timestamp) {
                        elapsedPeriods.push(period);

                        this.#lastPeriodsIndexes.get(symbol)?.set(timeframe, i);
                    }
                }
            }
        }

        internalLogger.debug(`Playground | Preparing to elapse ${elapsedPeriods.length} periods`);

        await this.#processPeriods(elapsedPeriods);
        // </elapsed-periods>

        this.#localDate = currentDate;

        return {
            elapsedTicks,
            elapsedPeriods,
        };
    }

    public async elapseTicks (volume: number = 1): Promise<MidaPlaygroundEngineElapsedData> {
        if (volume <= 0) {
            return {
                elapsedTicks: [],
                elapsedPeriods: [],
            };
        }

        const elapsedTicks: MidaTick[] = [];
        const symbols: string[] = [ ...this.#localTicks.keys(), ];

        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i: number = 0; i < symbols.length; ++i) {
            const symbol: string = symbols[i];
            const ticks: MidaTick[] = this.#localTicks.get(symbol) ?? [];
            const lastTickIndex: number = this.#lastTicksIndexes.get(symbol) ?? 0;

            for (let j: number = 1; j <= volume; ++j) {
                const tick: MidaTick | undefined = ticks[lastTickIndex + j];

                if (!tick) {
                    break;
                }

                elapsedTicks.push(tick);
            }

            this.#lastTicksIndexes.set(symbol, lastTickIndex + volume);
        }

        await this.#processTicks(elapsedTicks);

        return {
            elapsedTicks,
            elapsedPeriods: [],
        };
    }

    // <feed-confirmation>
    public nextFeed (): void {
        if (this.#feedResolver) {
            this.#feedResolver();

            this.#feedResolver = undefined;
        }
    }
    // </feed-confirmation>

    public addSymbolTicks (symbol: string, ticks: MidaTick[]): void {
        const localTicks: MidaTick[] = this.getSymbolTicks(symbol);
        const updatedTicks: MidaTick[] = localTicks.concat(ticks);

        updatedTicks.sort((a: MidaTick, b: MidaTick): number => a.date.timestamp - b.date.timestamp);

        this.#localTicks.set(symbol, updatedTicks);
        this.#lastTicksIndexes.set(symbol, -1);
    }

    public addSymbolPeriods (symbol: string, periods: MidaPeriod[]): void {
        const timeframe: MidaTimeframe = periods[0].timeframe;
        const localPeriods: MidaPeriod[] = this.#localPeriods.get(symbol)?.get(timeframe) ?? [];
        const updatedPeriods: MidaPeriod[] = localPeriods.concat(periods);

        updatedPeriods.sort((a: MidaPeriod, b: MidaPeriod): number => a.startDate.timestamp - b.startDate.timestamp);

        if (!this.#localPeriods.has(symbol)) {
            this.#localPeriods.set(symbol, new Map());
        }

        this.#localPeriods.get(symbol)?.set(timeframe, updatedPeriods);

        if (!this.#lastPeriodsIndexes.has(symbol)) {
            this.#lastPeriodsIndexes.set(symbol, new Map());
        }

        this.#lastPeriodsIndexes.get(symbol)?.set(timeframe, -1);
    }

    public getSymbolTicks (symbol: string): MidaTick[] {
        return this.#localTicks.get(symbol) ?? [];
    }

    public getOrdersByAccount (tradingAccount: MidaPlaygroundAccount): MidaPlaygroundOrder[] {
        return [ ...this.#orders.values(), ].filter((order: MidaOrder) => tradingAccount === order.tradingAccount);
    }

    public getTradesByAccount (tradingAccount: MidaPlaygroundAccount): MidaPlaygroundTrade[] {
        return [ ...this.#trades.values(), ].filter((trade: MidaTrade) => tradingAccount === trade.tradingAccount);
    }

    public async getPendingOrders (): Promise<MidaPlaygroundOrder[]> {
        const pendingOrders: MidaPlaygroundOrder[] = [];

        for (const account of [ ...this.#tradingAccounts.values(), ]) {
            pendingOrders.push(...await account.getPendingOrders());
        }

        return pendingOrders;
    }

    public async getOpenPositions (): Promise<MidaPosition[]> {
        return [ ...this.#positions.values(), ]
            .filter((position: MidaPosition) => position.status === MidaPositionStatus.OPEN);
    }

    public async getOpenPositionById (id: string): Promise<MidaPosition | undefined> {
        const openPositions: MidaPosition[] = await this.getOpenPositions();

        for (const position of openPositions) {
            if (position.id === id) {
                return position;
            }
        }

        return undefined;
    }

    public async getOpenPositionsByAccount (tradingAccount: MidaPlaygroundAccount): Promise<MidaPlaygroundPosition[]> {
        return [ ...await this.getOpenPositions(), ]
            .filter((position: MidaPosition) => tradingAccount === position.tradingAccount) as MidaPlaygroundPosition[];
    }

    // eslint-disable-next-line max-lines-per-function, complexity
    protected async tryExecuteOrder (order: MidaPlaygroundOrder): Promise<MidaOrder> {
        const tradingAccount: MidaPlaygroundAccount = order.tradingAccount as MidaPlaygroundAccount;
        const executedVolume: MidaDecimal = order.requestedVolume;
        const symbol: MidaSymbol | undefined = await tradingAccount.getSymbol(order.symbol);

        if (!symbol) {
            this.rejectOrder(order.id, MidaOrderRejection.SYMBOL_NOT_FOUND);

            return order;
        }

        // <execution-price>
        const bid: MidaDecimal = await this.getSymbolBid(order.symbol);
        const ask: MidaDecimal = await this.getSymbolAsk(order.symbol);
        const executionPrice: MidaDecimal = order.direction === MidaOrderDirection.SELL ? bid : ask;
        const executionDate: MidaDate = this.#localDate;
        // <execution-price>

        // <protection-validation>
        const requestedProtection: MidaProtectionDirectives = order.requestedProtection ?? {};

        if (order.direction === MidaOrderDirection.BUY) {
            if ("stopLoss" in requestedProtection && decimal(requestedProtection.stopLoss).greaterThanOrEqual(bid)) {
                this.rejectOrder(order.id, MidaOrderRejection.INVALID_STOP_LOSS);

                return order;
            }

            if ("takeProfit" in requestedProtection && decimal(requestedProtection.takeProfit).lessThanOrEqual(bid)) {
                this.rejectOrder(order.id, MidaOrderRejection.INVALID_TAKE_PROFIT);

                return order;
            }
        }
        else {
            if ("stopLoss" in requestedProtection && decimal(requestedProtection.stopLoss).lessThanOrEqual(ask)) {
                this.rejectOrder(order.id, MidaOrderRejection.INVALID_STOP_LOSS);

                return order;
            }

            if ("takeProfit" in requestedProtection && decimal(requestedProtection.takeProfit).greaterThanOrEqual(ask)) {
                this.rejectOrder(order.id, MidaOrderRejection.INVALID_TAKE_PROFIT);

                return order;
            }
        }
        // </protection-validation>

        let grossProfit: MidaDecimal = executedVolume;
        let grossProfitAsset: string = symbol.baseAsset;

        if (order.direction === MidaOrderDirection.SELL) {
            grossProfit = grossProfit.multiply(executionPrice);
            grossProfitAsset = symbol.quoteAsset;
        }

        // <trade>
        let assetToWithdraw: string = symbol.quoteAsset;
        let volumeToWithdraw: MidaDecimal = grossProfit.multiply(executionPrice);
        let assetToDeposit: string = symbol.baseAsset;
        let volumeToDeposit: MidaDecimal = grossProfit;

        if (order.direction === MidaOrderDirection.SELL) {
            assetToWithdraw = symbol.baseAsset;
            volumeToWithdraw = executedVolume;
            assetToDeposit = symbol.quoteAsset;
            volumeToDeposit = grossProfit;
        }

        if (!await this.accountHasFunds(tradingAccount, assetToWithdraw, volumeToWithdraw)) {
            this.rejectOrder(order.id, MidaOrderRejection.NOT_ENOUGH_MONEY);

            return order;
        }

        await tradingAccount.withdraw(assetToWithdraw, volumeToWithdraw);
        await tradingAccount.deposit(assetToDeposit, volumeToDeposit);

        // <commission>
        const [ commissionAsset, commission, ] =
            await this.#commissionCustomizer?.(order, {
                volume: executedVolume,
                executionPrice,
                executionDate,
            }) ?? [ tradingAccount.primaryAsset, decimal(0), ];

        await tradingAccount.withdraw(commissionAsset, commission);
        // </commission>
        // <swap>
        const swap: MidaDecimal = decimal(0);
        const swapAsset: string = tradingAccount.primaryAsset;

        await tradingAccount.deposit(swapAsset, swap);
        // </swap>

        let position: MidaPlaygroundPosition;

        if (!order.positionId) {
            const protection: MidaProtection = {};
            const protectionDirectives: MidaProtectionDirectives = order.requestedProtection ?? {};

            if ("stopLoss" in protectionDirectives) {
                protection.stopLoss = decimal(protectionDirectives.stopLoss);
            }

            if ("takeProfit" in protectionDirectives) {
                protection.takeProfit = decimal(protectionDirectives.takeProfit);
            }

            position = new MidaPlaygroundPosition({
                id: uuid(),
                symbol: order.symbol,
                volume: decimal(0), // Automatically updated after execution
                direction: order.direction === MidaOrderDirection.BUY ? MidaPositionDirection.LONG : MidaPositionDirection.SHORT,
                protection,
                tradingAccount: order.tradingAccount,
                engineEmitter: this.#protectedEmitter,
            });

            this.#positions.set(position.id, position);
        }
        else {
            position = await this.getOpenPositionById(order.positionId) as MidaPlaygroundPosition;
        }

        const positionId = position.id;
        const trade: MidaPlaygroundTrade = new MidaPlaygroundTrade({
            id: uuid(),
            orderId: order.id,
            positionId,
            symbol: order.symbol,
            volume: executedVolume,
            direction: order.direction === MidaOrderDirection.BUY ? MidaTradeDirection.BUY : MidaTradeDirection.SELL,
            status: MidaTradeStatus.EXECUTED,
            purpose: order.purpose === MidaOrderPurpose.OPEN ? MidaTradePurpose.OPEN : MidaTradePurpose.CLOSE,
            executionDate,
            executionPrice,
            grossProfit,
            commission,
            swap,
            commissionAsset,
            grossProfitAsset,
            swapAsset,
            tradingAccount,
        });
        // </trade>

        this.#trades.set(trade.id, trade);
        this.#protectedEmitter.notifyListeners("trade", { trade, });
        this.#protectedEmitter.notifyListeners("order-execute", { trades: [ trade, ], });

        return order;
    }

    public async createAccount (configuration: MidaPlaygroundAccountConfiguration = {}): Promise<MidaPlaygroundAccount> {
        const id: string = configuration.id ?? uuid();
        const account: MidaPlaygroundAccount = new MidaPlaygroundAccount({
            id,
            ownerName: configuration.ownerName ?? "",
            platform: playgroundPlatform,
            primaryAsset: configuration.primaryAsset ?? "USD",
            engine: this,
        });

        // <balance-sheet>
        const balanceSheet: Record<string, MidaDecimalConvertible> = configuration.balanceSheet ?? {};

        for (const asset of Object.keys(balanceSheet)) {
            if (balanceSheet.hasOwnProperty(asset)) {
                await account.deposit(asset, balanceSheet[asset]);
            }
        }
        // </balance-sheet>

        MidaPlayground.addTradingAccount(id, account);
        this.#tradingAccounts.set(id, account);

        return account;
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

    protected notifyListeners (type: string, descriptor?: Record<string, any>): void {
        this.#emitter.notifyListeners(type, descriptor);
    }

    async #processTicks (ticks: MidaTick[]): Promise<void> {
        ticks.sort((a: MidaTick, b: MidaTick): number => a.date.timestamp - b.date.timestamp);

        for (const tick of ticks) {
            await this.#onTick(tick);
        }
    }

    async #onTick (tick: MidaTick): Promise<void> {
        // <feed-confirmation>
        this.#feedResolverPromise = new Promise<void>((resolve) => {
            this.#feedResolver = (): void => resolve();
        });
        // </feed-confirmation>

        this.#localDate = tick.date;

        this.#lastTicks.set(tick.symbol, tick);

        await this.#updatePendingOrders(tick);
        await this.#updateOpenPositions(tick);

        this.#emitter.notifyListeners("tick", { tick, });

        /*
        for (const account of this.#tradingAccounts) {
            // <margin-call>
            const marginLevel: MidaDecimal | undefined = await account.getMarginLevel();

            if (marginLevel?.lessThanOrEqual(account.marginCallLevel)) {
                this.notifyListeners("margin-call", { marginLevel, });
            }
            // </margin-call>
        }
        */

        // <feed-confirmation>
        if (this.#waitFeedConfirmation) {
            await this.#feedResolverPromise;
        }
        // </feed-confirmation>
    }

    async #processPeriods (periods: MidaPeriod[]): Promise<MidaTick[]> {
        const elapsedTicks: MidaTick[] = [];

        periods.sort((a: MidaPeriod, b: MidaPeriod): number => a.startDate.timestamp - b.startDate.timestamp);

        for (const period of periods) {
            const ticks: MidaTick[] = [ tickFromPeriod(period, "close"), ];

            await this.#processTicks(ticks);
            await this.#onPeriodUpdate(period);

            if (period.isClosed) {
                await this.#onPeriodClose(period);
            }

            elapsedTicks.push(...ticks);
        }

        return elapsedTicks;
    }

    async #onPeriodUpdate (period: MidaPeriod): Promise<void> {
        // <feed-confirmation>
        this.#feedResolverPromise = new Promise<void>((resolve) => {
            this.#feedResolver = (): void => resolve();
        });
        // </feed-confirmation>

        this.#emitter.notifyListeners("period-update", { period, });

        // <feed-confirmation>
        if (this.#waitFeedConfirmation) {
            await this.#feedResolverPromise;
        }
        // </feed-confirmation>
    }

    async #onPeriodClose (period: MidaPeriod): Promise<void> {
        // <feed-confirmation>
        this.#feedResolverPromise = new Promise<void>((resolve) => {
            this.#feedResolver = (): void => resolve();
        });
        // </feed-confirmation>

        this.#emitter.notifyListeners("period-close", { period, });

        // <feed-confirmation>
        if (this.#waitFeedConfirmation) {
            await this.#feedResolverPromise;
        }
        // </feed-confirmation>
    }

    async #updatePendingOrders (tick: MidaTick): Promise<void> {
        const orders: MidaPlaygroundOrder[] = await this.getPendingOrders();

        for (const order of orders) {
            await this.#updatePendingOrder(order, tick);
        }
    }

    async #updatePendingOrder (order: MidaPlaygroundOrder, tick: MidaTick): Promise<void> {
        const bid: MidaDecimal = tick.bid;
        const ask: MidaDecimal = tick.ask;
        const limitPrice: MidaDecimal | undefined = order.limitPrice;
        const stopPrice: MidaDecimal | undefined = order.stopPrice;

        // <limit>
        if (limitPrice) {
            if (
                order.direction === MidaOrderDirection.SELL && bid.greaterThanOrEqual(limitPrice)
                || order.direction === MidaOrderDirection.BUY && ask.lessThanOrEqual(limitPrice)
            ) {
                internalLogger.info(`Playground | Pending Order ${order.id} hit limit`);

                await this.tryExecuteOrder(order);
            }
        }
        // </limit>

        // <stop>
        if (stopPrice) {
            if (
                order.direction === MidaOrderDirection.SELL && bid.lessThanOrEqual(stopPrice)
                || order.direction === MidaOrderDirection.BUY && ask.greaterThanOrEqual(stopPrice)
            ) {
                internalLogger.info(`Playground | Pending Order ${order.id} hit stop`);

                await this.tryExecuteOrder(order);
            }
        }
        // </stop>
    }

    async #updateOpenPositions (tick: MidaTick): Promise<void> {
        const openPositions: MidaPosition[] = await this.getOpenPositions();

        for (const position of openPositions) {
            await this.#updateOpenPosition(position, tick);
        }
    }

    async #updateOpenPosition (position: MidaPosition, tick: MidaTick): Promise<void> {
        const tradingAccount: MidaTradingAccount = position.tradingAccount;
        const bid: MidaDecimal = tick.bid;
        const ask: MidaDecimal = tick.ask;
        const stopLoss: MidaDecimal | undefined = position.stopLoss;
        const takeProfit: MidaDecimal | undefined = position.takeProfit;

        // <stop-loss>
        if (stopLoss) {
            if (
                position.direction === MidaPositionDirection.SHORT && ask.greaterThanOrEqual(stopLoss)
                || position.direction === MidaPositionDirection.LONG && bid.lessThanOrEqual(stopLoss)
            ) {
                internalLogger.info(`Playground | Position ${position.id} hit stop loss`);

                await position.close();
            }
        }
        // </stop-loss>

        // <take-profit>
        if (takeProfit) {
            if (
                position.direction === MidaPositionDirection.SHORT && ask.lessThanOrEqual(takeProfit)
                || position.direction === MidaPositionDirection.LONG && bid.greaterThanOrEqual(takeProfit)
            ) {
                internalLogger.info(`Playground | Position ${position.id} hit take profit`);

                await position.close();
            }
        }
        // </take-profit>

        /*
        // <stop-out>
        const marginLevel: MidaDecimal | undefined = await tradingAccount.getMarginLevel();

        if (marginLevel?.lessThanOrEqual(account.stopOutLevel)) {
            await position.close();

            this.notifyListeners("stop-out", {
                positionId: position.id,
                marginLevel,
            });
        }
        // </stop-out>
        */

        // <negative-balance-protection>
        const equity: MidaDecimal = await tradingAccount.getEquity();

        if (equity.lessThanOrEqual(0)) {
            await position.close();
        }
        // </negative-balance-protection>
    }

    public cancelOrder (orderId: string): void {
        this.#protectedEmitter.notifyListeners("order-cancel", {
            orderId,
            cancelDate: this.#localDate,
        });

        internalLogger.warn(`Playground | Order ${orderId} canceled`);
    }

    protected rejectOrder (orderId: string, rejection: MidaOrderRejection): void {
        this.#protectedEmitter.notifyListeners("order-reject", {
            orderId,
            rejectionDate: this.#localDate,
            rejection,
        });

        internalLogger.warn(`Playground | Order ${orderId} rejected: ${rejection}`);
    }

    protected acceptOrder (orderId: string): void {
        this.#protectedEmitter.notifyListeners("order-accept", {
            orderId,
            acceptDate: this.#localDate,
        });
    }

    protected moveOrderToPending (orderId: string): void {
        this.#protectedEmitter.notifyListeners("order-pending", {
            orderId,
            pendingDate: this.#localDate,
        });
    }

    protected async accountHasFunds (tradingAccount: MidaPlaygroundAccount, asset: string, volume: MidaDecimalConvertible): Promise<boolean> {
        const { freeVolume, } = await tradingAccount.getAssetBalance(asset);

        return freeVolume.greaterThanOrEqual(volume);
    }
}
