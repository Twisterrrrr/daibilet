# Venue PDP quality audit

`scripts/venue-quality-audit.sql` over the 781 venues that clear the presence
check. Per-venue output: `venue-quality-audit.csv`, one row each, with a defect
list and a verdict.

```
REWRITE         5   description is a verbatim copy of the title, or emoji from a supplier feed
FILL_MISSING  386   no hookFact and no wayToFind
POLISH        236   description under 300 chars, or marketing filler
OK            154
```

## Defects, overlapping

```
missing hookFact + wayToFind   390   (half the set)
description under 300 chars    339
marketing filler               117   ("невероятный", "уникальный", "поражающий")
no shortDescription             71
description copies title          3
emoji in description             2
```

## What this changes

Presence checks passed, quality did not. Half the set is missing two of the four
owner-defined fields, so there is no exemplar to model new work on - 154 venues
are clean.

The `FILL_MISSING` group is the cheapest: the description exists, two short
fields are absent. `REWRITE` is 5 venues and unambiguous.

Examples found:

- Дом-музей ЭЧПОЧМАКА - description is an emoji checklist from the supplier feed
  ("Дом-музей татарской кулинарии🤝🏻 Гостеприимное пространство👩🏻‍🍳").
- Памятник Александру Пушкину на площади Искусств - description opens with the
  title verbatim, which satisfies a length check while saying nothing.
- ChelseaHall - "волна эмоций, драйва и крутых впечатлений": filler in place of
  description.

## Caveat

These are mechanical checks. They find absence and obvious breakage, not whether
the remaining 154 read well. "OK" here means no defect fired, not approved.