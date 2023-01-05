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
import { MidaDate, } from "#dates/MidaDate";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaEvent, } from "#events/MidaEvent";
import { MidaEventListener, } from "#events/MidaEventListener";
import { internalLogger, } from "#loggers/MidaLogger";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderExecution, } from "#orders/MidaOrderExecution";
import { MidaOrderFill, } from "#orders/MidaOrderFill";
import { MidaOrderParameters, } from "#orders/MidaOrderParameters";
import { MidaOrderPurpose, } from "#orders/MidaOrderPurpose";
import { MidaOrderRejection, } from "#orders/MidaOrderRejection";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaOrderTimeInForce, } from "#orders/MidaOrderTimeInForce";
import { MidaPosition, } from "#positions/MidaPosition";
import { filterExecutedTrades, MidaTrade, } from "#trades/MidaTrade";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { GenericObject, } from "#utilities/GenericObject";
import { createClosedPosition, } from "#utilities/MidaUtilities";

/** Represents an order */
export abstract class MidaOrder {
    #id: string;
    readonly #tradingAccount: MidaTradingAccount;
    readonly #symbol: string;
    #requestedVolume: MidaDecimal;
    readonly #direction: MidaOrderDirection;
    readonly #purpose: MidaOrderPurpose;
    #limitPrice?: MidaDecimal;
    #stopPrice?: MidaDecimal;
    #status: MidaOrderStatus;
    #creationDate?: MidaDate;
    #lastUpdateDate?: MidaDate;
    readonly #timeInForce: MidaOrderTimeInForce;
    #expirationDate?: MidaDate;
    readonly #trades: MidaTrade[];
    #positionId: string;
    #rejection?: MidaOrderRejection;
    readonly #isStopOut: boolean;
    readonly #label?: string;
    readonly #emitter: MidaEmitter;

    protected constructor ({
        id,
        tradingAccount,
        symbol,
        requestedVolume,
        direction,
        purpose,
        limitPrice,
        stopPrice,
        status,
        creationDate,
        lastUpdateDate,
        timeInForce,
        expirationDate,
        trades,
        positionId,
        rejection,
        isStopOut,
        label,
    }: MidaOrderParameters) {
        this.#id = id;
        this.#tradingAccount = tradingAccount;
        this.#symbol = symbol;
        this.#requestedVolume = requestedVolume;
        this.#direction = direction;
        this.#purpose = purpose;
        this.#limitPrice = limitPrice;
        this.#stopPrice = stopPrice;
        this.#status = status;
        this.#creationDate = creationDate;
        this.#lastUpdateDate = lastUpdateDate;
        this.#timeInForce = timeInForce;
        this.#expirationDate = expirationDate;
        this.#trades = trades;
        this.#positionId = positionId ?? "";
        this.#rejection = rejection;
        this.#isStopOut = isStopOut ?? false;
        this.#label = label;
        this.#emitter = new MidaEmitter();
    }

    public get id (): string {
        return this.#id;
    }

    protected set id (id: string) {
        this.#id = id;
    }

    public get tradingAccount (): MidaTradingAccount {
        return this.#tradingAccount;
    }

    public get symbol (): string {
        return this.#symbol;
    }

    public get requestedVolume (): MidaDecimal {
        return this.#requestedVolume;
    }

    public get direction (): MidaOrderDirection {
        return this.#direction;
    }

    public get purpose (): MidaOrderPurpose {
        return this.#purpose;
    }

    public get limitPrice (): MidaDecimal | undefined {
        return this.#limitPrice;
    }

    public get stopPrice (): MidaDecimal | undefined {
        return this.#stopPrice;
    }

    public get status (): MidaOrderStatus {
        return this.#status;
    }

    public get creationDate (): MidaDate | undefined {
        return this.#creationDate;
    }

    protected set creationDate (creationDate: MidaDate | undefined) {
        this.#creationDate = creationDate;
    }

    public get lastUpdateDate (): MidaDate | undefined {
        return this.#lastUpdateDate;
    }

    protected set lastUpdateDate (lastUpdateDate: MidaDate | undefined) {
        this.#lastUpdateDate = lastUpdateDate;
    }

    public get timeInForce (): MidaOrderTimeInForce {
        return this.#timeInForce;
    }

    public get expirationDate (): MidaDate | undefined {
        return this.#expirationDate;
    }

    public get trades (): MidaTrade[] {
        return this.#trades;
    }

    public get positionId (): string {
        return this.#positionId;
    }

    protected set positionId (positionId: string) {
        this.#positionId = positionId;
    }

    public get rejection (): MidaOrderRejection | undefined {
        return this.#rejection;
    }

    protected set rejection (rejection: MidaOrderRejection | undefined) {
        this.#rejection = rejection;
    }

    public get isStopOut (): boolean {
        return this.#isStopOut;
    }

    public get label (): string | undefined {
        return this.#label;
    }

    public get isExecuted (): boolean {
        return this.#status === MidaOrderStatus.EXECUTED;
    }

    public get executedTrades (): MidaTrade[] {
        return filterExecutedTrades(this.#trades);
    }

    public get filledVolume (): MidaDecimal {
        let filledVolume: MidaDecimal = decimal(0);

        for (const trade of this.executedTrades) {
            filledVolume = filledVolume.add(trade.volume);
        }

        return filledVolume;
    }

    public get fill (): MidaOrderFill | undefined {
        if (this.executedTrades.length === 0) {
            return undefined;
        }

        if (this.filledVolume.equals(this.#requestedVolume)) {
            return MidaOrderFill.FULL;
        }

        return MidaOrderFill.PARTIAL;
    }

    public get executionPrice (): MidaDecimal | undefined {
        if (this.executedTrades.length === 0) {
            return undefined;
        }

        let priceVolumeProduct: MidaDecimal = decimal(0);

        for (const trade of this.executedTrades) {
            const executionPrice: MidaDecimal = trade.executionPrice as MidaDecimal;

            priceVolumeProduct = priceVolumeProduct.add(executionPrice.multiply(trade.volume));
        }

        return priceVolumeProduct.divide(this.filledVolume);
    }

    public get executedVolume (): MidaDecimal | undefined {
        if (this.executedTrades.length === 0) {
            return undefined;
        }

        let executedVolume: MidaDecimal = decimal(0);

        for (const trade of this.executedTrades) {
            executedVolume = executedVolume.add(trade.volume);
        }

        return executedVolume;
    }

    public get isOpening (): boolean {
        return this.#purpose === MidaOrderPurpose.OPEN;
    }

    public get isClosing (): boolean {
        return this.#purpose === MidaOrderPurpose.CLOSE;
    }

    public get execution (): MidaOrderExecution {
        if (this.#limitPrice) {
            return MidaOrderExecution.LIMIT;
        }

        if (this.#stopPrice) {
            return MidaOrderExecution.STOP;
        }

        return MidaOrderExecution.MARKET;
    }

    public get isRejected (): boolean {
        return this.#status === MidaOrderStatus.REJECTED;
    }

    public abstract cancel (): Promise<void>;

    public async getPosition (): Promise<MidaPosition | undefined> {
        const impactedPositionId: string = this.#positionId;

        if (!impactedPositionId) {
            return undefined;
        }

        const openPositions: MidaPosition[] = await this.#tradingAccount.getOpenPositions();

        for (const openPosition of openPositions) {
            if (impactedPositionId === openPosition.id) {
                return openPosition;
            }
        }

        return createClosedPosition(impactedPositionId, this.#tradingAccount, this.#symbol);
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

    protected notifyListeners (type: string, descriptor: GenericObject = {}): void {
        this.#emitter.notifyListeners(type, {
            ...descriptor,
            order: this,
        });
    }

    /* *** *** *** Reiryoku Technologies *** *** *** */

    protected onStatusChange (status: MidaOrderStatus): void {
        const previousStatus: MidaOrderStatus = this.#status;

        if (previousStatus === status) {
            return;
        }

        this.#status = status;

        internalLogger.info(`Order ${this.id} | Status changed from ${previousStatus} to ${status}`);

        this.notifyListeners("status-change", { status, previousStatus, });

        switch (status) {
            case MidaOrderStatus.REJECTED: {
                this.notifyListeners("reject");

                break;
            }
            case MidaOrderStatus.ACCEPTED: {
                this.notifyListeners("accept");

                break;
            }
            case MidaOrderStatus.PENDING: {
                this.notifyListeners("pending");

                break;
            }
            case MidaOrderStatus.CANCELLED: {
                this.notifyListeners("cancel");

                break;
            }
            case MidaOrderStatus.EXECUTED: {
                this.notifyListeners("execute");

                break;
            }
            case MidaOrderStatus.EXPIRED: {
                this.notifyListeners("expire");

                break;
            }
        }
    }

    protected onPendingPriceChange (price: MidaDecimal): void {
        const previousPrice: MidaDecimal = (this.#stopPrice ?? this.#limitPrice) as MidaDecimal;

        if (previousPrice.equals(price)) {
            return;
        }

        if (this.#limitPrice) {
            this.#limitPrice = price;
        }
        else if (this.#stopPrice) {
            this.#stopPrice = price;
        }

        internalLogger.info(`Order ${this.id} | Pending price changed from ${previousPrice} to ${price}`);

        this.notifyListeners("pending-price-change", { price, previousPrice, });
    }

    protected onPendingVolumeChange (volume: MidaDecimal): void {
        const previousVolume: MidaDecimal = this.#requestedVolume;

        if (previousVolume.equals(volume)) {
            return;
        }

        this.#requestedVolume = volume;

        internalLogger.info(`Order ${this.id} | Pending volume changed from ${previousVolume} to ${volume}`);

        this.notifyListeners("pending-volume-change", { volume, previousVolume, });
    }

    protected onExpirationDateChange (date: MidaDate | undefined): void {
        const previousDate: MidaDate | undefined = this.#expirationDate;

        if (previousDate === date || date && previousDate?.equals(date)) {
            return;
        }

        this.#expirationDate = date;

        internalLogger.info(`Order ${this.id} | Expiration date changed from ${previousDate} to ${date}`);

        this.notifyListeners("expiration-date-change", { date, previousDate, });
    }

    protected onTrade (trade: MidaTrade): void {
        this.#trades.push(trade);

        internalLogger.info(`Order ${this.id} | Trade ${trade.id} executed`);

        this.notifyListeners("trade", { trade, });
    }
}

export const filterPendingOrders = (orders: MidaOrder[]): MidaOrder[] => {
    const pendingOrders: MidaOrder[] = [];

    for (const order of orders) {
        if (order.status === MidaOrderStatus.PENDING) {
            pendingOrders.push(order);
        }
    }

    return pendingOrders;
};

export const filterExecutedOrders = (orders: MidaOrder[]): MidaOrder[] => {
    const executedOrders: MidaOrder[] = [];

    for (const order of orders) {
        if (order.isExecuted) {
            executedOrders.push(order);
        }
    }

    return executedOrders;
};
