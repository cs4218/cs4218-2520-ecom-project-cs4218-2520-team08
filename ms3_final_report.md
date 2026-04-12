For this project's non-functional testing, my specific responsibility was to design and execute a comprehensive **Recovery Testing strategy**. While my teammates assessed system scalability under peak load, my objective was to evaluate the system’s resilience—specifically determining if the e-commerce backend could successfully recover from catastrophic failures. Given that Node.js applications are prone to process crashes (due to out-of-memory errors or uncaught exceptions), verifying the `nodemon` auto-recovery mechanism and database reconnection logic was absolutely critical for preventing prolonged production downtime.

The approach was meticulously designed using fault injection modeling. First, Apache JMeter established a continuous, concurrent baseline load of user traffic (e.g., fetching product counts). Midway through the sustained load, an external Node CLI script dynamically scanned the host for processes tracking port `6060` (the active backend) and deliberately injected a `SIGKILL` termination signal. This simulated an abrupt system shutdown, completely dropping active database connections.

I used two complementary tools to execute this recovery testing strategy:
| Tool | Purpose |
|------|---------|
| **Apache JMeter (.jmx)** | Served as the primary load execution and monitoring tool. It sustained simulated user traffic and accurately tracked the drop and re-establishment of HTTP connection throughput across the pre-crash, downtime, and post-crash phases. |
| **Node Child Process (.js)** | Delivered dynamic fault injection utilizing OS-level socket scanning (`lsof -t -i:6060 -sTCP:LISTEN`) and explicit asynchronous signal killing. It also effectively triggered the file modification needed to test the auto-recovery (`nodemon`) fallback logic. |

The recovery lifecycle profile was strictly divided into the following three phases:
| Phase | Duration | Arrival Rate | Purpose |
|-------|----------|--------------|---------|
| Steady-State (Pre-crash) | 23 s | ~16 req/s | Establish an active baseline connection pool and ensure steady requests. |
| Fault Injection (Crash) | 30 s | 0 req/s | Hard terminate the backend; measure exact error spiking on client dropouts. |
| Post-Recovery (Bounce) | 7 s | ~18 req/s | Allow `nodemon` to restart the app, verify DB re-connection, and validate 0% errors on subsequent traffic. |

**(Ensure you insert the image `recovery_throughput_chart.png` here to show the lifecycle)**

# Statistics & Analysis

Recovery testing requires drastically different evaluations compared to standard load testing. Standard APDEX scores are inherently skewed because downtime naturally produces 100% error rates. Instead, my test statistics focused on evaluating the success of the fallback logic:

| Metric | Reason | Criteria |
|--------|--------|----------|
| **Mean Time to Recover (MTTR)** | The absolute elapsed time from process termination until the backend resumes serving HTTP 200 OK responses. | ≤ 10s |
| **Crash Error Rate** | The immediate percentage of dropped requests during the backend shutdown window. | N/A (100% expected) |
| **Post-Crash Error Rate** | The percentage of successful requests handled AFTER the system finishes its restart sequence. | 0% (Required) |
| **Pre/Post Throughput Delta** | Evaluates if the database connection pool was properly reinstated by comparing throughput before and after the failure. | ±5 req/s variance |

**Recovery Test Results (Product Count Simulation)**
| Life Cycle Phase | Error Rate | Mean RT (ms) | Throughput (req/s) |
|------------------|------------|--------------|--------------------|
| Pre-Crash (Steady State) | 0% | 53.00 ms | 15.80 req/s |
| Crash (Service Downtime) | 100% | 5100.00 ms| 0.00 req/s |
| Post-Recovery (Stabilized) | 0% | 70.00 ms | 18.30 req/s |
| **Overall Combined** | **11.26%** | **65.00 ms** | **17.00 req/s** |

**Analysis of Findings:**
Across all 1,021 requests sent during the recovery suite lifecycle, the system demonstrated near-perfect resilience. Setting the benchmark for Mean Time To Recover (MTTR) under 10 seconds was aggressive, but the backend cleanly surpassed it, logging a recovery time of approximately 7 seconds. 
Most importantly, the **Post-Crash Error Rate returned gracefully to 0%**, with latency settling extremely close to the baseline (53ms vs 70ms). This confirmed that `nodemon` alongside Mongoose's automatic reconnection pool was fully sufficient for mitigating catastrophic Node process failures. 

# Combined Statistics (MS1, MS2, MS3)

Over the entire development lifecycle—spanning isolated Unit tests, flow-based Integration tests, and finally comprehensive Non-Functional evaluations—testing efforts naturally transitioned from broad functional correctness to performance stability. 

**(Insert `combined_bugs_chart.png` and `testing_effort_pie.png` here)**

The graphical tracking of bug identification across the three milestones outlines a clear software maturation curve. MS1 accounted for the highest volume of bugs identified and fixed (25 total), primarily addressing core logical defects and boundary conditions. By MS3, standard functionality had stabilized, dropping functional defect rates to their lowest points while exclusively revealing architectural vulnerabilities (such as connection leaks or deadlocks). 

**Two Notable Bugs Identified from the Testing Journey:**

| **Missing MongoDB Reconnection Credentials** | **Sigkill Eradicating Companion Processes** |
|----------------------------------------------|---------------------------------------------|
| **What:** During early MS3 testing, when the backend restarted after a crash, the application failed to reconnect to MongoDB, dumping `MongoServerError: bad auth`. The credentials loaded via `.env` were successfully injected on manual startup, but were missing from the auto-restart context. | **What:** The initial fault-injection script scanned port 6060 to terminate the backend (`lsof -t -i:6060`), but inadvertently identified JMeter connections interacting with the port as well, killing the test suite simultaneously alongside the server itself. |
| **Fix:** Validated that `.env` propagation was persistent across runtime restarts and enforced authentication credentials. | **Fix:** Narrowed the socket extraction flag strictly to listening processes (`-sTCP:LISTEN`) avoiding client connections entirely. |
| **Risk:** Devastating data loss. If left unresolved in production, an unexpected memory crash would lead to the server restarting blind—becoming completely severed from its database, halting all e-commerce operations. | **Risk:** High stability risk. In a production state, carelessly broad OS process wiping could terminate essential companion processes like logging daemons, metrics agents, or orchestrators. |

### Key Learning Points from CS4218
1. Systematic boundary value analysis and equivalence partitioning inherently expose overlooked edge cases faster than intuition-led testing ever will.
2. Distinct layers of testing capture vastly different defects sets; Unit testing tackles microscopic logic validation, while Non-Functional (Recovery) testing focuses exclusively on systemic behavioral resilience.
3. Achieving high code coverage is functionally useless without strong, explicit assertions; evaluating application boundaries defines true test confidence. 
4. External AI tooling significantly optimizes test scaffolding and boilerplate generation, but structural testing logic still fundamentally requires human architectural awareness. 
5. Deliberately designing tests for failure (via fault injection) is just as essential for modern architectural confidence as designing tests for success.

***
*Footer: Shivangi Kamat, A0319665R*
