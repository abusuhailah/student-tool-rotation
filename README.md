# Tool Rotation · AbuSuhailah

A dashboard that shows which student has **AI Studio** and which has **Google Flow** each day.

- Each day 1 student has AI Studio and 2 students have Google Flow.
- Today's AI Studio student gets Google Flow tomorrow, and once more about halfway through the cycle,
  so nobody waits long between turns (with 10 students: AI Studio day 1, Flow days 2 and 7).
- After the last student it starts again from the first, so it loops forever.

## Change the students

Open `students.js` and edit the `students` list. The order of the list is the rotation order.
`startDate` is the day the first student in the list has AI Studio.

## Hosting

This is a plain static website with no build step. Upload or connect this repository to any static host
(GitHub Pages, Netlify, Vercel, cPanel / Hostinger, etc.) and serve the root folder. `index.html` is the entry page.
