# MidaTradingAccount
Guidelines for integrating a trading account and platform.

## Events
A trading account implementation should support the events defined below.

### Event: tick
Fired when there is a new market tick for a symbol listened through the `watchTicks()` method.

### Event: period-update
Fired when the last live candlestick is updated for a symbol and timeframe listened through the `watchPeriods()` method.
