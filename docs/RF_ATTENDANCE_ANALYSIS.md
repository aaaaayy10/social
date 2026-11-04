# RF attendance analytics — 2026-11-04 update

The dashboard covers the 11 identifiable RF programs in the supplied February–October screenshots, not all 45 registered programs. Other blurred programs are excluded.

Attendance is the sum of each program's visible daily counts. Printed row totals and footers are ignored. A visible 1 is one attendee; a day with no attendance is not a class day. Expected attendance is the frozen November 4 paid enrollment multiplied by positive-attendance class days per program/month. Rates are weighted totals, not averages of percentages. No individual operational actions are exposed.

Latest July–October screenshots replace earlier sources for these months. August vacation is user-confirmed: only health100 operated, and the other ten programs have zero sessions and zero expected attendance. No missing-data inference is used for this vacation. The October life exercise individual PDF is superseded by the latest October program screenshot, not added to it. September changed daily cells are refreshed from the latest screenshot. June duplicate remains excluded.

| Month | Person-visits |
|---|---:|
| February | 1,967 |
| March | 945 |
| April | 3,819 |
| May | 1,660 |
| June | 3,374 |
| July | 1,903 |
| August (vacation) | 567 |
| September | 3,050 |
| October | 3,218 |
| Total | 20,503 |

Screenshot transcription has not been compared with an original spreadsheet. No dates or hidden program values are invented. Sequences are stored in the aggregate data for repeatable arithmetic, but the public dashboard shows summaries, trends, program comparisons and reference attendance/absence rates. It does not show the old daily-addition evidence table, October individual-PDF verification panel or extra-material/manual-extension panel.

March aerobics has 183 visits versus the current-paid denominator of 180. User requested calculation including this row: attendance is 101.7%, absence is zero. For any selected scope, attendance rate = summed attendance / summed expected; absence = max(0, summed expected - summed attendance), absence rate = absence / summed expected. These are weighted rates labelled average attendance/absence rates. No attendance count is capped and no negative absence is reported. Zero-session rows show zero visits/expected and no rate. Overall attendance 20,503 / expected 28,539 = 71.8%; absence 8,036 = 28.2%.

CSV respects the selected program and month. Monthly overview deliberately retains all nine months for trend context, with the selected month highlighted. Program summary and KPI totals follow both filters. Manual monthly totals remain supported by the data type, without user-facing implementation details.

Program summary table precedes monthly summary; program table supports attendance/absence ascending and descending, with undefined zero-session rates last. Expected column label is user-specified: 수납자 기준 출석 기준 연인원.
