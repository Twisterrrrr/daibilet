# Venue content rules

Owner-approved, 2026-10-02. Binding on every venue page. Applies to all 4304
venues, including the 1871 with no scheduled events.

## Each column has one role, and no role is a duplicate

### shortDescription - card header, <=120 chars
What this is, one phrase.
> Памятник Евстигнееву: актёр на скамейке у Драмтеатра

### description - "about" block, 2-3 paragraphs
History, author, year, what to look at. Must not restate shortDescription.
> Цибарев, 2005, поза из фильма, главная фототочка Покровской

### hookFact - one line, <=80 chars
The hook: why go here. Not "what it is" but "why this place".
> Главная фототочка Большой Покровской

### wayToFind - 2-3 sentences, practical
How to find it: landmarks, transport, orientation. Must not restate the
address - the address is a separate field.
> Напротив Драмтеатра, 300 м от площади Революции. Остановка "Большая
> Покровская", 5 минут пешком

**Anti-duplication rule.** If a hookFact sentence appears in description, rewrite
it. If wayToFind restates the address, drop it.

### Fill all four, do not collapse them
hookFact feeds listings, not the PDP. wayToFind feeds the "how to find" block.
Different surfaces, different jobs; folding them into description loses context.

## FAQ: database rows, never hardcoded

`resolveVenueCuratedFaqItems(slug)` covers a handful of venues and cannot scale
to 4304. FAQ must live in the database:

```
model VenueFaq {
  id       String @id
  venueId  String
  question String
  answer   String
  order    Int
  source   String?   // wordstat / support / manual
  venue    Venue     @relation(...)
}
```

3-5 questions per venue, from Wordstat or real support contacts. **Not
invented** - fabricated FAQ risks the FAQPage rich result.

Do not publish FAQ across the 781 T1 venues before this table exists.

## metroStation: database first, computed fallback

1. If set in the database, use it.
2. If empty, `resolveNearestMetroStationName` by coordinates.
3. If both empty, render no block at all - never a dash.

A hand-entered value beats the computed one: coordinates can be a block centre,
and the nearest station by straight line may involve an awkward transfer or
exit. But most of the 4304 have no value, so the fallback earns its place.

Record which source was used, so a wrong station can be traced.

## Order of work

1. FAQ schema + migration + API (Codex).
2. metroStation priority in the render (Cline).
3. Duplicate rules written here, so any generation prompt can cite them.
4. **5 exemplars, written by hand** (Cline), reviewed by owner. Not 781.
5. If the structure holds, scale in batches of 20-30, checking uniqueness and
   duplicate phrases each time.

## Current data problem to fix while filling

Existing rows violate the rules. Example, Памятник Евстигнееву:
hookFact "Актер сидит на скамейке" and wayToFind "Ориентир: ул. Большая
Покровская, д. 13" are both fragments of the description. Filling all four fields
means rewriting these rows, not appending to them.