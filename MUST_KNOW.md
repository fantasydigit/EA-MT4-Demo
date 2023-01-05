## The Tick Processing Problem
The tick processing problem is raised when a market emits one or multiple ticks before our computer
has finished processing a previosuly emitted tick.

A trading system takes as input real-time market ticks or derived data in order to resolve the entry and exit conditions.
Ideally, a trading system computation time should be near to 0. This would allow a trading system to compute any amount of market data
independentely of the events frequency.

In reality this is different, let's suppose that on average the BTCUSD market emits 2 ticks every 10ms. Now, our trading system
takes aproximately 10ms to process 1 tick and decide if it's time to entry or exit the market (or if it's time to do nothing).
The consequences of the above are that the trading system is not able to keep the pace with the market events,
as the seconds go by the trading system will keep queueing the incoming ticks while processing the older ones, resulting
in the trading system being disconnected from the reality.

One of the common issues is that the trading system may decide to enter or exit the market after processing an old tick,
ending up doing trades at a completely unexpected price.

### The solutions
1. Default. Ticks are queued;
2. Disable the ticks queue and process only the most recent tick;
3. Improve the performance of your algorithms, if your algorithms are taking too much time
   consider using Worker Threads and AssemblyScript for near-native performance;

### The impact on backtesting

1. Any of the solutions above;
2. Tell the backtesting engine to wait for the trading system, this means that the trading simulator will wait
for the trading system to finish processing the current tick (or related event) before emitting the next one.

In reality, the financial markets will not wait for us, that's why the solution above is applicable only in the
simulator while backtesting.
