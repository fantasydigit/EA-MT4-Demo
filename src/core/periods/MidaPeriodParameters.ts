import { MidaDate, } from "#dates/MidaDate";
import { MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaQuotationPrice, } from "#quotations/MidaQuotationPrice";
import { MidaTick, } from "#ticks/MidaTick";

/**
 * The period constructor parameters
 * @see MidaPeriod
 */
export type MidaPeriodParameters = {
    symbol: string;
    startDate: MidaDate;
    quotationPrice: MidaQuotationPrice;
    open: MidaDecimal;
    close: MidaDecimal;
    low: MidaDecimal;
    high: MidaDecimal;
    volume: MidaDecimal;
    timeframe: number;
    isClosed?: boolean;
    ticks?: MidaTick[];
};
