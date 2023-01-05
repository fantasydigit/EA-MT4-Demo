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
import { MidaMarketComponent, } from "#components/MidaMarketComponent";
import { MidaMarketComponentConstructor, } from "#components/MidaMarketComponentConstructor";
import { MidaMarketComponentDependencyDeclaration, } from "#components/MidaMarketComponentDependencyDeclaration";
import { MidaMarketComponentIndicatorDeclaration, } from "#components/MidaMarketComponentIndicatorDeclaration";
import { MidaMarketComponentParameterDeclaration, } from "#components/MidaMarketComponentParameterDeclaration";
import { MidaMarketComponentOracle, } from "#components/MidaMarketComponentOracle";
import { MidaMarketComponentState, } from "#components/MidaMarketComponentState";
import { MidaIndicator, } from "#indicators/MidaIndicator";
import { internalLogger, } from "#loggers/MidaLogger";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";

export type MidaMarketComponentMakerParameters = {
    component: MidaMarketComponent;
    params?: Record<string, any>;
    tradingAccount: MidaTradingAccount;
    symbol: string;
};

// eslint-disable-next-line max-lines-per-function, max-len
export const makeComponent = async (parameters: MidaMarketComponentMakerParameters): Promise<MidaMarketComponentState> => {
    const state: MidaMarketComponentState = await makeComponentState(parameters);
    const oracle: MidaMarketComponentOracle = new MidaMarketComponentOracle(state);

    await oracle.start();

    return state;
};

// eslint-disable-next-line max-lines-per-function, max-len, complexity
export const makeComponentState = async (parameters: MidaMarketComponentMakerParameters): Promise<MidaMarketComponentState> => {
    const {
        component,
        params,
        tradingAccount,
        symbol,
    } = parameters;
    const [ bid, ask, ] = await Promise.all([ tradingAccount.getSymbolBid(symbol), tradingAccount.getSymbolAsk(symbol), ]);
    let state: MidaMarketComponentState = {
        $component: component,
        $dependencies: [],
        $tradingAccount: tradingAccount,
        $watcher: {
            watchTicks: true,
            watchPeriods: false,
        },
        $symbol: symbol,
        $bid: bid,
        $ask: ask,
        $ticks: [],
        $periods: {},
        $livePeriods: {},
        $indicators: {},
    };

    await component.beforeCreate?.call(state);

    state = {
        ...component.state?.call(state),
        ...state,
    };

    // <params>
    const declaredParams: Record<string, MidaMarketComponentParameterDeclaration> = component.params ?? {};

    for (const propertyName of Object.keys(params ?? {})) {
        if (!declaredParams[propertyName]) {
            internalLogger.warn(`Market Component | Undeclared param ${propertyName} will be ignored`);
        }
    }

    for (const propertyName of Object.keys(declaredParams)) {
        const {
            type,
            required,
            default: defaultValue,
        } = declaredParams[propertyName];
        const value: any = params?.[propertyName] ?? (typeof defaultValue === "function" ? defaultValue() : defaultValue);

        if (!value && required) {
            internalLogger.fatal(`Market Component | Missing required param ${propertyName}`);

            throw new Error();
        }

        if (type && value.constructor !== type) {
            internalLogger.warn(`Market Component | Value of param ${propertyName} doesn't match its declared type`);
        }

        Object.defineProperty(state, propertyName, {
            get (): any {
                return value;
            },
        });
    }
    // </params>

    // <watcher>
    state.$watcher = {
        ...state.$watcher,
        ...component.watcher?.call(state),
    };
    // </watcher>

    // <computed>
    const computed = component.computed ?? {};

    for (const propertyName of Object.keys(computed)) {
        Object.defineProperty(state, propertyName, {
            get (): any {
                return computed?.[propertyName]?.call(state);
            },
        });
    }
    // </computed>

    // <methods>
    const methods = component.methods ?? {};

    for (const propertyName of Object.keys(methods)) {
        Object.defineProperty(state, propertyName, {
            value: methods?.[propertyName].bind(state),
            writable: true,
        });
    }
    // </methods>

    // <indicators>
    const indicators: Record<string, MidaMarketComponentIndicatorDeclaration> = typeof component.indicators === "function"
        ? component.indicators.call(state) : component.indicators ?? {};

    for (const propertyName of Object.keys(indicators)) {
        const {
            type,
            params,
            input,
        } = indicators?.[propertyName];
        const timeframe: MidaTimeframe = input?.timeframe as MidaTimeframe;

        if (!MidaIndicator.has(type)) {
            internalLogger.fatal(`Market Component | Indicator ${type} not found, have you installed its plugin?`);

            throw new Error();
        }

        const indicator: MidaIndicator = MidaIndicator.create(type, params);

        state.$watcher.watchPeriods = true;
        state.$watcher.timeframes = [ ...new Set([ ...state.$watcher.timeframes ?? [], timeframe, ]), ];
        state.$indicators[propertyName] = {
            indicator,
            input: {
                type: "close",
                live: false,
                limit: 2000,
                ...input,
            },
        };

        Object.defineProperty(state, propertyName, {
            get (): MidaIndicator {
                return indicator;
            },
        });
    }
    // </indicators>

    // <dependencies>
    const dependencies: Record<string, MidaMarketComponentDependencyDeclaration> = typeof component.dependencies === "function"
        ? component.dependencies.call(state) : component.dependencies ?? {};

    for (const propertyName of Object.keys(dependencies)) {
        const declaration: MidaMarketComponentDependencyDeclaration = dependencies[propertyName];
        const constructor: MidaMarketComponentConstructor = typeof declaration === "object" ? declaration.type : declaration;
        const dependencyComponent: MidaMarketComponent = constructor.$component;
        const dependencyParams: Record<string, any> | undefined = typeof declaration === "object" ? declaration.params : undefined;
        const dependencyState: MidaMarketComponentState = await makeComponentState({
            component: dependencyComponent,
            params: dependencyParams,
            tradingAccount,
            symbol,
        });

        state.$dependencies.push(dependencyState);

        Object.defineProperty(state, propertyName, {
            get (): MidaMarketComponentState {
                return dependencyState;
            },
        });
    }
    // </dependencies>

    await component.created?.call(state);

    return state;
};
