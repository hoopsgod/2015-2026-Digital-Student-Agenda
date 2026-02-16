# Digital Student Agenda

A single-page web application for students to manage their tasks, schedule, notes, and links. Built as a self-contained HTML file with no external dependencies (other than Google Fonts).

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


## Validation

Run the built-in validator before committing UI/JS edits:

```bash
./scripts/validate.sh
```

This extracts the inline `<script>` payload from `index.html` and performs a JavaScript syntax check with Node (`node --check`).

## Tech Stack

- Vanilla HTML, CSS, and JavaScript (no build tools or frameworks)
- Google Fonts (Playfair Display, IBM Plex Sans)
- Responsive design with mobile sidebar and bottom navigation
