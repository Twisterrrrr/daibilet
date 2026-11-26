# Post-deploy observation

The production web deploy keeps the previous build on the shadow upstream while it starts the incoming build. Before traffic returns to the new build, deployment warms 12 hub routes and up to 40 current event pages. The deploy log emits `DEPLOY_WARMUP`; GitHub Actions copies that result into the run summary.

Dynamic indexability checks retry failed requests and failed HTML assertions up to four times, with a short increasing delay. The retry applies to city, places, venues and locations catalogs. Persistent errors or missing server-rendered content still fail the check.

The deploy job waits five minutes after the initial smoke and then:

- reruns indexability checks;
- checks bot 5xx and ReferenceError logs since the deploy began, using a deploy-specific watermark under `var/monitor/`;
- records web/API active state, restart count, cgroup memory, disk use, Next cache sizes and local health TTFB in a `POST_DEPLOY_OBSERVATION` JSON line;
- fails the observation if a service is inactive, a health probe is not 200, a probe TTFB is at least five seconds, disk use reaches 90%, or the crawler monitor finds an error.

The five-minute step also runs when an earlier deployment smoke fails, unless the workflow was cancelled. If deployment never started and therefore has no deploy watermark, it skips the crawler window rather than scanning the default two-hour history; it still records the server snapshot.

The existing minute-level SSR healthcheck and five-minute `oom-watch.sh` remain the continuous host checks. This workflow adds a bounded post-deploy sample; it is not a substitute for field p75 LCP/CLS/INP monitoring.
