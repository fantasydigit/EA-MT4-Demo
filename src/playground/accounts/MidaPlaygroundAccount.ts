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

import { MidaPlaygroundAccountParameters, } from "!/src/playground/accounts/MidaPlaygroundAccountParameters";
import { MidaPlaygroundLatencyCustomizer, } from "!/src/playground/customizers/MidaPlaygroundLatencyCustomizer";
import { MidaPlaygroundEngine, } from "!/src/playground/MidaPlaygroundEngine";
import { MidaPlaygroundOrder, } from "!/src/playground/orders/MidaPlaygroundOrder";
import { MidaTradingAccount, } from "#accounts/MidaTradingAccount";
import { MidaTradingAccountOperativity, } from "#accounts/MidaTradingAccountOperativity";
import { MidaTradingAccountPositionAccounting, } from "#accounts/MidaTradingAccountPositionAccounting";
import { MidaAsset, } from "#assets/MidaAsset";
import { MidaAssetStatement, } from "#assets/MidaAssetStatement";
import { date, MidaDate, } from "#dates/MidaDate";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaDecimalConvertible, } from "#decimals/MidaDecimalConvertible";
import { MidaEvent, } from "#events/MidaEvent";
import { internalLogger, } from "#loggers/MidaLogger";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirectives, } from "#orders/MidaOrderDirectives";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaSymbol, } from "#symbols/MidaSymbol";
import { MidaSymbolParameters, } from "#symbols/MidaSymbolParameters";
import { MidaSymbolTradeStatus, } from "#symbols/MidaSymbolTradeStatus";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTrade, } from "#trades/MidaTrade";

export class MidaPlaygroundAccount extends MidaTradingAccount {
    readonly #engine: MidaPlaygroundEngine;
    readonly #balanceSheet: Map<string, MidaAssetStatement>;
    readonly #symbols: Map<string, MidaSymbol>;
    readonly #assets: Map<string, MidaAsset>;
    readonly #watchedSymbols: Set<string>;
    #latencyCustomizer?: MidaPlaygroundLatencyCustomizer;

    public constructor ({
        id,
        ownerName,
        platform,
        primaryAsset,
        engine,
        latencyCustomizer,
    }: MidaPlaygroundAccountParameters) {
        super({
            id,
            platform,
            creationDate: new MidaDate(),
            ownerName,
            primaryAsset,
            operativity: MidaTradingAccountOperativity.DEMO,
            positionAccounting: MidaTradingAccountPositionAccounting.HEDGED,
            indicativeLeverage: decimal(0),
        });

        this.#engine = engine;
        this.#balanceSheet = new Map();
        this.#symbols = new Map();
        this.#assets = new Map();
        this.#watchedSymbols = new Set();
        this.#latencyCustomizer = latencyCustomizer;

        this.#configureListeners();
    }

    public get engine (): MidaPlaygroundEngine {
        return this.#engine;
    }

    public setLatencyCustomizer (customizer?: MidaPlaygroundLatencyCustomizer): void {
        this.#latencyCustomizer = customizer;
    }

    public async deposit (asset: string, volume: MidaDecimalConvertible): Promise<void> {
        const balance: MidaAssetStatement = await this.getAssetBalance(asset);

        this.#balanceSheet.set(asset, {
            asset,
            date: date(),
            tradingAccount: this,
            freeVolume: balance.freeVolume.add(volume),
            borrowedVolume: balance.borrowedVolume,
            lockedVolume: balance.lockedVolume,
        });
    }

    public async withdraw (asset: string, volume: MidaDecimalConvertible): Promise<void> {
        const balance: MidaAssetStatement = await this.getAssetBalance(asset);

        this.#balanceSheet.set(asset, {
            asset,
            date: date(),
            tradingAccount: this,
            freeVolume: balance.freeVolume.subtract(volume),
            borrowedVolume: balance.borrowedVolume,
            lockedVolume: balance.lockedVolume,
        });
    }

    public override async getBalance (): Promise<MidaDecimal> {
        return this.#balanceSheet.get(this.primaryAsset)?.freeVolume ?? decimal(0);
    }

    public override async getBalanceSheet (): Promise<MidaAssetStatement[]> {
        return [ ...this.#balanceSheet.values(), ];
    }

    public override async getAsset (asset: string): Promise<MidaAsset | undefined> {
        return this.#assets.get(asset);
    }

    public async cancelPendingOrderById (id: string): Promise<void> {
        await this.#engine.cancelOrder(id);
    }

    public override async getAssetBalance (asset: string): Promise<MidaAssetStatement> {
        return this.#balanceSheet.get(asset) ?? {
            asset,
            date: date(),
            tradingAccount: this,
            freeVolume: decimal(0),
            borrowedVolume: decimal(0),
            lockedVolume: decimal(0),
        };
    }

    public override async getAssets (): Promise<string[]> {
        return [ ...this.#assets.keys(), ];
    }

    public override async getEquity (): Promise<MidaDecimal> {
        let equity: MidaDecimal = decimal(0);

        for (const assetStatement of await this.getBalanceSheet()) {
            if (assetStatement.asset === this.primaryAsset) {
                equity = equity.add(assetStatement.freeVolume);

                continue;
            }

            const symbol: string = `${assetStatement.asset}${this.primaryAsset}`;

            try {
                const bid: MidaDecimal = await this.getSymbolBid(symbol);
                const profit: MidaDecimal = bid.multiply(assetStatement.freeVolume);

                equity = equity.add(profit);
            }
            catch {
                internalLogger.warn(`Playground | No quotes available for ${symbol}, not considered in equity calculation`);
            }
        }

        return equity;
    }

    public override async getUsedMargin (): Promise<MidaDecimal> {
        return decimal(0);
    }

    public override async getOrders (symbol: string): Promise<MidaPlaygroundOrder[]> {
        return this.#engine.getOrdersByAccount(this).filter((order: MidaPlaygroundOrder) => order.symbol === symbol);
    }

    public override async getSymbolTradeStatus (symbol: string): Promise<MidaSymbolTradeStatus> {
        this.#assertSymbolExists(symbol);

        return MidaSymbolTradeStatus.ENABLED;
    }

    public override async watchSymbolPeriods (symbol: string, timeframe: number): Promise<void> {
        // throw new Error("Method not implemented.");
    }

    public override async getDate (): Promise<MidaDate> {
        return this.#engine.localDate;
    }

    public override async getPendingOrders (): Promise<MidaPlaygroundOrder[]> {
        const pendingOrders: MidaPlaygroundOrder[] = [];

        for (const order of this.#engine.getOrdersByAccount(this)) {
            if (order.status === MidaOrderStatus.PENDING) {
                pendingOrders.push(order);
            }
        }

        return pendingOrders;
    }

    public override async getTrades (symbol: string): Promise<MidaTrade[]> {
        return this.#engine.getTradesByAccount(this).filter((trade: MidaTrade) => trade.symbol === symbol);
    }

    public override async getOpenPositions (): Promise<MidaPosition[]> {
        return this.#engine.getOpenPositionsByAccount(this);
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

    public override async placeOrder (directives: MidaOrderDirectives): Promise<MidaOrder> {
        // <latency-and-slippage>
        const latency: number = await this.#latencyCustomizer?.(this) ?? 0;

        if (latency > 0) {
            await this.#engine.elapseTime(latency);
        }
        // </latency-and-slippage>

        return this.#engine.placeOrder(this, directives);
    }

    public override async getCryptoAssetDepositAddress (asset: string, net: string): Promise<string> {
        return "";
    }

    public override async getSymbols (): Promise<string[]> {
        return [ ...this.#symbols.keys(), ];
    }

    public override async getSymbol (symbol: string): Promise<MidaSymbol | undefined> {
        return this.#symbols.get(symbol);
    }

    public async isSymbolMarketOpen (symbol: string): Promise<boolean> {
        this.#assertSymbolExists(symbol);

        throw new Error("Unsupported operation");
    }

    public override async getSymbolPeriods (symbol: string, timeframe: number): Promise<MidaPeriod[]> {
        this.#assertSymbolExists(symbol);

        return this.#engine.getSymbolPeriods(symbol, timeframe);
    }

    public override async getSymbolBid (symbol: string): Promise<MidaDecimal> {
        return this.#engine.getSymbolBid(symbol);
    }

    public override async getSymbolAsk (symbol: string): Promise<MidaDecimal> {
        return this.#engine.getSymbolAsk(symbol);
    }

    public override async getSymbolAverage (symbol: string): Promise<MidaDecimal> {
        const bid: MidaDecimal = await this.getSymbolBid(symbol);
        const ask: MidaDecimal = await this.getSymbolAsk(symbol);

        return bid.add(ask).divide(2);
    }

    public async watchSymbolTicks (symbol: string): Promise<void> {
        this.#assertSymbolExists(symbol);

        this.#watchedSymbols.add(symbol);
    }

    public async addSymbol (symbol: MidaSymbol | Omit<MidaSymbolParameters, "tradingAccount">): Promise<void> {
        let finalSymbol: MidaSymbol;

        if (symbol instanceof MidaSymbol) {
            finalSymbol = symbol;
        }
        else {
            finalSymbol = new MidaSymbol({
                ...symbol,
                tradingAccount: this,
            });
        }

        this.#symbols.set(finalSymbol.toString(), finalSymbol);
    }

    #assertSymbolExists (symbol: string): void {
        if (!this.#symbols.has(symbol)) {
            throw new Error("Symbol not found");
        }
    }

    #onTick (tick: MidaTick): void {
        if (this.#watchedSymbols.has(tick.symbol)) {
            this.notifyListeners("tick", { tick, });
        }
    }

    #onPeriodUpdate (period: MidaPeriod): void {
        this.notifyListeners("period-update", { period, });
    }

    #onPeriodClose (period: MidaPeriod): void {
        this.notifyListeners("period-close", { period, });
    }

    #configureListeners (): void {
        this.#engine.on("tick", (event: MidaEvent): void => this.#onTick(event.descriptor.tick));
        this.#engine.on("period-update", (event: MidaEvent): void => this.#onPeriodUpdate(event.descriptor.period));
        this.#engine.on("period-close", (event: MidaEvent): void => this.#onPeriodClose(event.descriptor.period));
    }
}
