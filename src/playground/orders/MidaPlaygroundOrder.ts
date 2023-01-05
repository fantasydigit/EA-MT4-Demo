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
import { MidaPlaygroundOrderParameters, } from "!/src/playground/orders/MidaPlaygroundOrderParameters";
import { MidaEvent, } from "#events/MidaEvent";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaProtectionDirectives, } from "#protections/MidaProtectionDirectives";
import { MidaTrade, } from "#trades/MidaTrade";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";

export class MidaPlaygroundOrder extends MidaOrder {
    readonly #engineEmitter: MidaEmitter;
    readonly #requestedProtection?: MidaProtectionDirectives;

    public constructor ({
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
        trades,
        positionId,
        timeInForce,
        isStopOut,
        label,
        engineEmitter,
        requestedProtection,
    }: MidaPlaygroundOrderParameters) {
        super({
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
            trades,
            positionId,
            timeInForce,
            isStopOut,
            label,
        });

        this.#engineEmitter = engineEmitter;
        this.#requestedProtection = requestedProtection;

        this.#configureListeners();
    }

    public get requestedProtection (): MidaProtectionDirectives | undefined {
        return this.#requestedProtection;
    }

    public override async cancel (): Promise<void> {
        if (this.status !== MidaOrderStatus.PENDING) {
            return;
        }

        const tradingAccount: MidaPlaygroundAccount = this.tradingAccount as MidaPlaygroundAccount;

        await tradingAccount.cancelPendingOrderById(this.id);
    }

    #execute (event: MidaEvent): void {
        const trades: MidaTrade[] = event.descriptor.trades;
        const lastTrade: MidaTrade = trades.at(-1) as MidaTrade;

        this.lastUpdateDate = lastTrade.executionDate;
        this.positionId = lastTrade.positionId;

        for (const trade of trades) {
            this.onTrade(trade);
        }

        this.onStatusChange(MidaOrderStatus.EXECUTED);
    }

    #cancel (event: MidaEvent): void {
        this.lastUpdateDate = event.descriptor.cancelDate;

        this.onStatusChange(MidaOrderStatus.CANCELLED);
    }

    #reject (event: MidaEvent): void {
        this.lastUpdateDate = event.descriptor.rejectionDate;
        this.rejection = event.descriptor.rejection;

        this.onStatusChange(MidaOrderStatus.REJECTED);
    }

    #configureListeners (): void {
        this.#engineEmitter.once("order-accept", (event: MidaEvent): void => {
            if (event.descriptor.orderId === this.id) {
                this.lastUpdateDate = event.descriptor.acceptDate;

                this.onStatusChange(MidaOrderStatus.ACCEPTED);
            }
        });

        this.#engineEmitter.once("order-pending", (event: MidaEvent): void => {
            if (event.descriptor.orderId === this.id) {
                this.lastUpdateDate = event.descriptor.pendingDate;

                this.onStatusChange(MidaOrderStatus.PENDING);
            }
        });

        this.#engineEmitter.once("order-execute", (event: MidaEvent): void => {
            const trades: MidaTrade[] = event.descriptor.trades;

            if (trades[0].orderId === this.id) {
                this.#execute(event);
            }
        });

        this.#engineEmitter.once("order-cancel", (event: MidaEvent): void => {
            if (event.descriptor.orderId === this.id) {
                this.#cancel(event);
            }
        });

        this.#engineEmitter.once("order-reject", (event: MidaEvent): void => {
            if (event.descriptor.orderId === this.id) {
                this.#reject(event);
            }
        });
    }
}
