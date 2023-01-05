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

import { MidaTick, } from "#ticks/MidaTick";
import { MidaPeriod, } from "#periods/MidaPeriod";

export type MidaTradingSystemSymbolState = {
    shared?: Record<string, any>;

    /* - - - */

    configure? (): Promise<void>;
    onStart? (): Promise<void>;
    onPreTick? (tick: MidaTick): Promise<void>;
    onTick? (tick: MidaTick): Promise<void>;
    onLateTick? (tick: MidaTick): Promise<void>;
    onPrePeriodUpdate? (period: MidaPeriod): Promise<void>;
    onPeriodUpdate? (period: MidaPeriod): Promise<void>;
    onLatePeriodUpdate? (period: MidaPeriod): Promise<void>;
    onPrePeriodClose? (period: MidaPeriod): Promise<void>;
    onPeriodClose? (period: MidaPeriod): Promise<void>;
    onLatePeriodClose? (period: MidaPeriod): Promise<void>;
    onStop? (): Promise<void>;
};
