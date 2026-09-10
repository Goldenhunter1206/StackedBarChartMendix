# Example app — booking hours against charging codes

A small Mendix app that uses the Stacked Bar Chart widget for its main screen.

People book hours on a day. Every booking is charged to a **charging code**,
and the code carries the colour its bookings are drawn in — so the chart's
colours are maintained in an ordinary table, not in the widget.

- One **bar per day**, one **element per booking**.
- Colours come from the `ChargingCode` table (a green family, in the spirit of
  Schaeffler's branding). Change a colour there and the chart follows.
- **Hover** a booking for its duration, date, charging code and — only when
  there is one — its comment.
- **Click** a booking to edit or delete it.
- **+** above a day books hours on that day.
- **Drag** a booking to another day, with a confirmation dialog.

## How it was built

Generated with [mxcli](https://github.com/mendixlabs/mxcli) 0.21 on Mendix
**11.14.0**. The MDL scripts in `mdl/` are the whole app — domain model, pages,
microflows and navigation — and running them against a blank project
reproduces it exactly:

```bash
mxcli new HoursBooking --version 11.14.0 --output-dir ./HoursBooking
cp com.dynamicchart.StackedBarChart.mpk HoursBooking/widgets/

cd HoursBooking
mxcli exec mdl/01-domain.mdl       -p HoursBooking.mpr   # entities and the association
mxcli exec mdl/03-pages.mdl        -p HoursBooking.mpr   # edit popups, charging code table
mxcli exec mdl/02-microflows.mdl   -p HoursBooking.mpr   # add / edit / delete / drop
mxcli exec mdl/05-colour-sync.mdl  -p HoursBooking.mpr   # cached colour + before-commit handler
mxcli exec mdl/04-home.mdl         -p HoursBooking.mpr   # the chart page
mxcli exec mdl/06-navigation.mdl   -p HoursBooking.mpr   # home page and menu
mxcli exec mdl/07-fix-seed.mdl     -p HoursBooking.mpr   # demo data
```

Pages come before microflows because the microflows open them.

Verified with Mendix's own consistency check, which reports **0 errors**:

```bash
mx check /absolute/path/to/HoursBooking.mpr
```

Open the app, press **Load demo data** once, and the week fills in.

Mendix 10 was the original target, but MxBuild 10.x is no longer on Mendix's
CDN, so the example is built on 11.14. The widget itself supports 10.24 and up.

## Domain model

```
ChargingCode          Booking
  Code                  DayKey        <- groups bookings into bars, and captions them
  Name                  BookingDate
  Colour  <-------.     Hours         <- the height of the element
  SortOrder        \    Comment
  Active            \   Sequence      <- written by the widget on a drop
                     \  Colour        }
                      \ CodeShort     } cached from the code by a before-commit handler
                       `CodeName      }
        Booking_ChargingCode (Booking -> ChargingCode)
```

### Why the colour is cached on the booking

The chart binds an attribute for its colour, and MDL cannot write an attribute
path that walks an association. So `BCo_Booking_ApplyCode` copies `Colour`,
`Code` and `Name` off the charging code before every commit, and the chart binds
those. The charging code table stays the single place a colour is defined.

The cache only refreshes when a booking is committed, so the charging code page
has an **Apply colours to existing bookings** button for after a colour change.

In Studio Pro you can skip all of this and point **Colour source → Expression**
at `$currentObject/TimeBooking.Booking_ChargingCode/Colour` instead; expressions
traverse associations happily. The cached form is used here only because mxcli
does not yet persist expression-typed widget properties.

## How the chart is configured

| Setting | Value | Why |
|---|---|---|
| Bar key | `DayKey` | A readable day string, so it doubles as the bar caption |
| Value | `Hours` | The height of each element |
| Colour source | Attribute → `Colour` | Cached from the charging code |
| Series attribute | `CodeName` | Names the colours in the legend |
| Sort keys | Colour, then `Sequence` | Codes group together; the drop position decides the order within a colour |
| Sequence attribute | `Sequence` | The widget writes a fractional index on a drop |
| Reorder within a bar | off | The order inside a day is by charging code, so free reordering there would not stick |
| Move between bars | on | Moving a booking to another day is the useful gesture |
| Confirmation | Built-in dialog | The widget knows the outcome, so Cancel is clean |

### The drop microflow

`ACT_Booking_Moved` receives the dragged booking plus the drop context as
action variables, and only has to set the day:

```
CHANGE $Booking (DayKey = $targetBarKey, ...) COMMIT REFRESH;
```

The **commit with refresh matters**. A Mendix action cannot report back to a
widget, so the refreshed data is the only signal that the move stuck — without
it the booking animates back when the commit timeout expires.

## Known rough edge

`labelTemplate`, `tooltipTitleTemplate` and `menuTitleTemplate` are written in
`04-home.mdl` but mxcli does not persist a widget's own text-template
properties (it does persist the ones inside the tooltip field blocks). Set them
in Studio Pro if you want the code shown on the element itself — everything
else, including the whole tooltip, works as generated.
