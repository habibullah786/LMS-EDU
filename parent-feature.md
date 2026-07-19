# LMS-EDU Parent Features

This document is the living inventory of implemented LMS-EDU parent-facing features. Update it whenever a parent feature is added, changed, or removed.

## 1. Authentication and Account Access

- Parents can log in or create an account through the shared authentication modal.
- Successful login and registration close the modal and keep the parent on the page where it was opened.
- Authenticated sessions are restored through the Laravel API.
- The parent dashboard is protected from unauthenticated access.
- After login, the main website navigation groups account details, Dashboard, and Logout inside a single user dropdown.
- Parents can log out from the website navigation or parent dashboard.

## 2. Parent Dashboard

- Dedicated parent dashboard with Overview, My Children's Classes, and Profile sections.
- Overview displays registration totals, trial-class totals, and recent registrations.
- Parents can open the trial-class booking flow from the dashboard.

## 3. Children's Classes

- Displays the parent's registered children and their classes.
- Combines trial and paid class registrations in one view.
- Supports registration filtering and empty-state guidance.

## 4. Profile and Security

- Parents can update their name and phone number.
- Parents can change their password after confirming the current password.
- Password validation requires a minimum of eight characters and matching confirmation.
