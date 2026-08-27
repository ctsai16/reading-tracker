# Reading Library

Reading Library is a personal reading-tracker web app styled as a set of bookshelves: each book is rendered as a colorful spine whose width and height are derived from its page count, so your shelf visually reflects what you've actually read. It opens on a Summary dashboard with at-a-glance stats and shelf previews, and books move between four shelves — To Be Read, Currently Reading, Completed, and Did Not Finish — as your relationship with them changes, with every book keeping a small history log of those transitions.

## Features

- **Summary dashboard** (the default landing view): books and pages read, genres and authors explored (each with a top-5 breakdown), a fun fact picked at random each visit, and a preview grid of all four shelves showing a random sample of spines from each, with a link to jump straight to any shelf
- Bookshelf UI with books rendered as spines (color, width, and height driven by page count and title), packed into rows and grouped by series with a ribbon indicator
- Four shelves — **TBR**, **Reading**, **Completed**, **DNF** — reachable from a "Shelves" dropdown in the toggle bar, each with its own stats, empty state, and form fields tailored to that stage (e.g. "why you stopped" for DNF, "your review" for Completed)
- New books always start on TBR; move between shelves with guided mini-forms — Start Reading, Mark as Finished, Did Not Finish, Reread, Try Again — and reading-duration tracking ("Read in N days") once a book is completed
- Search-first add flow: a "Find a book" screen searches Open Library live as you type and pre-fills the full form on selection (title, author, best-guess genre, page count, publisher, publish year, series name + number) — or skip straight to a blank manual-entry form
- Live typeahead on the Title/Author fields too, for corrections or when editing an existing book — keyboard navigation (arrows + Enter) alongside mouse, and a clear message if Open Library can't be reached
- Format field (Book / Ebook / Audiobook) up front in the form; audiobooks get a manual runtime (hours + minutes) field in place of page count, since there's no free API for that yet
- Star ratings (half-star precision), spice level, hard-copy ownership, free-text review/notes, and series grouping with a colored ribbon badge on the spine
- Search by title/author, filter by genre, and sort (Author A-Z, Title A-Z, Highest Rated, Recently Finished) while viewing a shelf
- JSON export/import from the "More" menu next to Add, with duplicate detection (by title + author) on both add and import
- Responsive layout with a mobile-friendly single-column book detail view

## Tech stack

Vanilla HTML, CSS, and JavaScript — no frameworks, no build step, no dependencies. The only external network calls are the optional Open Library search/autofill lookups (`openlibrary.org`); everything else runs entirely client-side.

## How to run

Just open `index.html` directly in a browser:

```bash
open index.html
```

Or serve it locally (useful if your browser restricts `fetch`/localStorage on `file://` URLs):

```bash
python3 -m http.server
```

then visit `http://localhost:8000`.

## Data storage

Your library is saved to the browser's `localStorage` under the key `reading_library_books`, so it persists across page reloads on the same browser/device. (If this app is running inside Claude.ai, it instead uses Claude's built-in `window.storage` API when available.) There is no server or account — export to JSON periodically if you want a backup or want to move your library to another browser or device.
