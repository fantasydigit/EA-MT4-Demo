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

import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";

describe("MidaDecimal", () => {
    describe(".add", () => {
        it("returns the expected values", async () => {
            expect(decimal(0).add(50).toString()).toBe("50");
            expect(decimal(50).add(-50).toString()).toBe("0");
            expect(decimal(0.1).add(0.2).toString()).toBe("0.3");
            expect(decimal(-0.02).add(-0.02).toString()).toBe("-0.04");
            expect(decimal(0.02).add(-0.02).toString()).toBe("0");
            expect(decimal(-0.02).add(0.02).toString()).toBe("0");
        });
    });

    describe(".multiply", () => {
        it("returns the expected values", async () => {
            expect(decimal(-0.02).multiply(0.02).toString()).toBe("-0.0004");
            expect(decimal(0.02).multiply(-0.02).toString()).toBe("-0.0004");
        });
    });

    describe(".low", () => {
        it("returns the lowest value", async () => {
            expect(MidaDecimal.min(
                0.9, 0.8, 0.7,
                0.6, 0.5, 0.4,
                0.3, 0.2, 0.1
            ).toString()).toBe("0.1");
        });
    });

    describe(".max", () => {
        it("returns the highest value", async () => {
            expect(MidaDecimal.max(
                0.1, 0.2, 0.3,
                0.4, 0.5, 0.6,
                0.7, 0.8, 0.9
            ).toString()).toBe("0.9");
        });
    });
});
