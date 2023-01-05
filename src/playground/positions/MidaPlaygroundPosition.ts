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

import { MidaPlaygroundPositionParameters, } from "!/src/playground/positions/MidaPlaygroundPositionParameters";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaUnsupportedOperationError, } from "#errors/MidaUnsupportedOperationError";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaPositionDirection, } from "#positions/MidaPositionDirection";
import { MidaPositionStatus, } from "#positions/MidaPositionStatus";
import { MidaProtection, } from "#protections/MidaProtection";
import { MidaProtectionChange, } from "#protections/MidaProtectionChange";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";

export class MidaPlaygroundPosition extends MidaPosition {
    readonly #engineEmitter: MidaEmitter;

    public constructor ({
        id,
        symbol,
        tradingAccount,
        volume,
        direction,
        protection,
        engineEmitter,
    }: MidaPlaygroundPositionParameters) {
        super({
            id,
            symbol,
            volume,
            direction,
            tradingAccount,
            protection,
        });

        this.#engineEmitter = engineEmitter;

        this.#configureListeners();
    }

    public override async getUsedMargin (): Promise<MidaDecimal> {
        if (this.status === MidaPositionStatus.CLOSED) {
            return decimal(0);
        }

        return decimal(0);
    }

    public override async addVolume (volume: number): Promise<MidaOrder> {
        return this.tradingAccount.placeOrder({
            positionId: this.id,
            direction: this.direction === MidaPositionDirection.LONG ? MidaOrderDirection.BUY : MidaOrderDirection.SELL,
            volume: volume,
        });
    }

    public override async subtractVolume (volume: number): Promise<MidaOrder> {
        return this.tradingAccount.placeOrder({
            positionId: this.id,
            direction: this.direction === MidaPositionDirection.LONG ? MidaOrderDirection.SELL : MidaOrderDirection.BUY,
            volume: volume,
        });
    }

    public override async getUnrealizedSwap (): Promise<MidaDecimal> {
        if (this.status === MidaPositionStatus.CLOSED) {
            return decimal(0);
        }

        return decimal(0);
    }

    public override async getUnrealizedCommission (): Promise<MidaDecimal> {
        if (this.status === MidaPositionStatus.CLOSED) {
            return decimal(0);
        }

        return decimal(0);
    }

    public override async getUnrealizedGrossProfit (): Promise<MidaDecimal> {
        if (this.status === MidaPositionStatus.CLOSED) {
            return decimal(0);
        }

        return decimal(0);
    }

    public override async changeProtection (protection: MidaProtection): Promise<MidaProtectionChange> {
        throw new MidaUnsupportedOperationError();
    }

    #configureListeners (): void {
        this.#engineEmitter.on("trade", (event) => {
            const { trade, } = event.descriptor;

            if (trade.positionId === this.id) {
                this.onTrade(trade);
            }
        });
    }
}
