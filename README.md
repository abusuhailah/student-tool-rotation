# Tool Rotation · AbuSuhailah

A dashboard that shows which student has **AI Studio** and which has **Google Flow** each day.

- Each day one student has AI Studio and one has Google Flow.
- Today's AI Studio student gets Google Flow tomorrow, and the next student in the list moves into AI Studio.
- After the last student it starts again from the first, so it loops forever.

## Change the students

Open `students.js` and edit the `students` list. The order of the list is the rotation order.
`startDate` is the day the first student in the list has AI Studio.

## Hosting

This is a plain static website with no build step. Upload or connect this repository to any static host
(GitHub Pages, Netlify, Vercel, cPanel / Hostinger, etc.) and serve the root folder. `index.html` is the entry page.
