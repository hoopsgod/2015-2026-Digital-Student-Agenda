# FocusFlow

A single-page web application designed to help students manage tasks, schedules, notes, and routines — especially students with ADHD who benefit from stronger daily structure. Built as a lightweight static web app (`index.html` + `app.js`) with no runtime dependencies (other than Google Fonts).

## Features

- **Dashboard** - Overview with task stats, due-this-week items, daily quotes, and quick actions
- **Log Homework** - Add, filter, and complete tasks with subject tags, priority levels, and due dates
- **Schedule** - Manage class schedules with Day A/B support and PDF/image upload
- **Analytics** - Track completion rates, subject progress, streaks, and view a calendar heatmap
- **Notes** - Create and edit notes
- **Quick Links** - Save frequently used URLs with custom icons
- **Customization** - Premium themes, dark mode, dyslexia font, and full branding (logo, name, subtitle)

## Usage

Open `index.html` in any modern web browser. All data is stored in the browser's `localStorage`.

## Privacy & Data Policy

- **Where data is stored:** By default, all tasks, notes, schedule entries, links, and personalization settings are saved locally in your browser storage on your device.
- **How long data persists:** Data remains until you remove items, reset the app settings, or clear browser/site storage.
- **Your control:** You can edit or delete records at any time in the app, and you can fully erase saved data through your browser controls or the app reset option.
- **Cloud sync safeguards (if enabled in future):** Any cloud synchronization should use secure OAuth-based authentication and encryption both in transit and at rest to protect user data.


## Validation

Run the built-in validator before committing UI/JS edits:

```bash
./scripts/validate.sh
```

This checks `app.js` syntax with Node (`node --check`).

## Tech Stack

- Vanilla HTML, CSS, and JavaScript (no build tools or frameworks)
- Google Fonts (Playfair Display, IBM Plex Sans)
- Responsive design with mobile sidebar and bottom navigation
