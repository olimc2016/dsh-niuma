# dsh-niuma · Salary Ticker for DSH

[![npm](https://img.shields.io/npm/v/dsh-niuma.svg)](https://www.npmjs.com/package/dsh-niuma)

> A DSH (DeepSeek Harness) plugin that turns your **monthly take-home pay** into a **live cash counter that ticks every second**.
> Glance at it during work: your money grows before your eyes. After hours it stops — a tiny daily reality check.

[中文](README.md) | English

---

> **Community plugin, not affiliated with DeepSeek.** All amounts are local estimates from the salary and working
> hours you enter — not a payslip, not a bill, not labor or financial advice.

---

## What it computes

Set it up once, then the panel refreshes every second:

- **Earned today**: your effective work income accumulated per second, 4 decimals, visibly ticking
- **Per-second / per-minute / per-hour / per-day / per-week / per-month** wage breakdown
- **Working-day rules**: Mon–Fri count as working days; **statutory holidays do NOT count** (so the daily wage rises); **make-up workdays DO count**
- Editable lunch break, with a checkbox for **whether lunch counts as paid work time** (unpaid lunch freezes the counter)
- Status badge: day off / not started / working / on lunch / off work
- Progress bar for today, countdown to start / end of shift

### Formulas

| Metric | Formula |
|---|---|
| Paid minutes per day | (end − start) − (lunch enabled and unpaid ? lunch length : 0) |
| Working days this month | Mon–Fri, minus statutory holidays, plus make-up workdays |
| Daily wage | monthly take-home ÷ working days this month |
| Hourly wage | daily wage ÷ paid hours |
| Minute / second wage | hourly ÷ 60 / ÷ 3600 |
| Weekly wage | daily wage × working days this week (Mon–Sun) |
| Earned today | paid seconds today × second wage (capped at the daily wage) |

Ships with the **2026** China statutory holiday and make-up workday calendar
([State Council notice](https://www.gov.cn/zhengce/content/202511/content_7047090.htm)); both lists are editable in the panel.

## Install

```bash
dsh plugin --profile desktop add dsh-niuma
```

Or add it to your profile's `package.json` dependencies and `dsh.profile.bundles`, then fully quit and reopen DSH.
**Plugins load at startup — a restart is required.**

## Privacy

No network calls, no telemetry. Your salary and schedule live in your local DSH settings only.

## Compatibility

- DSH 0.2.x (verified on 0.2.1-rc.2)
- Node ≥ 22.19.0

## Development

```bash
npm run setup    # link DSH base modules + esbuild (once)
npm run build    # build lib/client.js (the built artifact is committed)
npm test         # 5 checks: core / holidays / host smoke / client smoke / render smoke
```

See [`SPEC.md`](SPEC.md) for the implementation contract.

## License

MIT
