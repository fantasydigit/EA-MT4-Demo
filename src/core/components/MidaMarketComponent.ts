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
import { MidaMarketComponentConstructor, } from "#components/MidaMarketComponentConstructor";
import { MidaMarketComponentDependencyDeclaration, } from "#components/MidaMarketComponentDependencyDeclaration";
import { MidaMarketComponentIndicatorDeclaration, } from "#components/MidaMarketComponentIndicatorDeclaration";
import { makeComponent, } from "#components/MidaMarketComponentMaker";
import { MidaMarketComponentParameterDeclaration, } from "#components/MidaMarketComponentParameterDeclaration";
import { MidaMarketComponentState, } from "#components/MidaMarketComponentState";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaMarketWatcherDirectives, } from "#watchers/MidaMarketWatcherDirectives";

export const marketComponent = (component: MidaMarketComponent): MidaMarketComponentConstructor => {
    // eslint-disable-next-line arrow-body-style
    const constructor: MidaMarketComponentConstructor = (tradingAccount: MidaTradingAccount, symbol: string, params?: Record<string, any>) => {
        return makeComponent({
            component,
            params,
            tradingAccount,
            symbol,
        });
    };

    constructor.$component = component;

    return constructor;
};

export type MidaMarketComponent = {
    name?: string;

    params?: Record<string, MidaMarketComponentParameterDeclaration>;

    dependencies?: Record<string, MidaMarketComponentDependencyDeclaration>
        | ((this: MidaMarketComponentState) => Record<string, MidaMarketComponentDependencyDeclaration>);

    watcher? (this: MidaMarketComponentState): MidaMarketWatcherDirectives;

    state? (this: MidaMarketComponentState): Record<string, any>;

    computed?: Record<string, (this: MidaMarketComponentState) => any>;

    indicators?: Record<string, MidaMarketComponentIndicatorDeclaration>
        | ((this: MidaMarketComponentState) => Record<string, MidaMarketComponentIndicatorDeclaration>);

    methods?: Record<string, (this: MidaMarketComponentState, ...parameters: any[]) => any>;

    beforeCreate? (this: MidaMarketComponentState): Promise<void>;

    created? (this: MidaMarketComponentState): Promise<void>;

    awake? (this: MidaMarketComponentState): Promise<void>;

    update? (this: MidaMarketComponentState): Promise<void>;

    lateUpdate? (this: MidaMarketComponentState): Promise<void>;

    tick? (this: MidaMarketComponentState, tick: MidaTick): Promise<void>;

    periodUpdate? (this: MidaMarketComponentState, period: MidaPeriod): Promise<void>;

    [periodUpdateByTimeframe: `${string}PeriodUpdate`]: (this: MidaMarketComponentState, period: MidaPeriod) => Promise<void>;

    periodClose? (this: MidaMarketComponentState, period: MidaPeriod): Promise<void>;

    [periodCloseByTimeframe: `${string}PeriodClose`]: (this: MidaMarketComponentState, period: MidaPeriod) => Promise<void>;
};
