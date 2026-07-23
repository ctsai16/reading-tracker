# Reading Library

Reading Library is a personal reading-tracker web app styled as a set of bookshelves: each book is rendered as a colorful spine whose width and height are derived from its page count, so your shelf visually reflects what you've actually read. Books move between four shelves — To Be Read, Currently Reading, Completed, and Did Not Finish — as your relationship with them changes, and every book keeps a small history log of those transitions (added to TBR, started reading, marked as finished, etc.).

## Features

- Bookshelf UI with books rendered as spines (color, width, and height driven by page count and title), packed into rows and grouped by series with a ribbon indicator
- Four libraries: **TBR**, **Reading**, **Completed**, **DNF** — each with its own stats, empty state, and form fields tailored to that stage (e.g. "why you stopped" for DNF, "your review" for Completed)
- Status transitions with guided mini-forms: Start Reading, Mark as Finished, Did Not Finish, Reread, Try Again
- Star ratings (half-star precision), spice level, format (book/ebook/audiobook), hard-copy ownership, and free-text review/notes per book
- Series grouping with series name, order, and a colored ribbon badge on the spine
- Search by title/author, filter by genre, and sort (Author A-Z, Title A-Z, Highest Rated, Recently Finished)
- Open Library autofill — looks up a book by title/author and fills in page count, publish year, publisher, and a best-guess genre
- JSON export/import of your whole library, with duplicate detection (by title + author) on both add and import
- Responsive layout with a mobile-friendly single-column book detail view

## Tech stack

Vanilla HTML, CSS, and JavaScript — no frameworks, no build step, no dependencies. The only external network call is the optional Open Library autofill lookup (`openlibrary.org`); everything else runs entirely client-side.

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
