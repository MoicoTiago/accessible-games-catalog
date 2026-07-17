# Portfolio Notes — Tiago Moico

## Project

Accessible Games Catalog is a full-stack group project focused on helping players discover games that match their access needs. It combines searchable accessibility metadata, personal preferences, recommendations, community reviews, moderation, and voice-assisted navigation.

## Tiago's contribution

Based on the original university Git history, Tiago contributed to:

- designing and populating the games and accessibility-tags data model, including many-to-many relationships and startup seeding;
- building the individual game experience and loading game and review data from the API;
- implementing review submission and database-backed homepage content;
- creating personalised game recommendations from a user's accessibility preferences;
- implementing game reports, an admin-only reports view, report resolution, and game deletion;
- adding and repairing automated tests, CI pipeline execution, and Postman API checks;
- maintaining project documentation and integrating work across feature branches.

These were contributions to a shared codebase. Other team members built and evolved substantial parts of the finished application.

## Engineering evidence

- React frontend with accessible controls, responsive pages, settings, and voice-command event handling
- Express REST API with authentication and role-aware administration
- Sequelize models and MariaDB persistence, with SQLite used for hermetic automated tests
- Search, filtering, recommendations, reviews, helpful voting, favourites, wishlists, and reporting
- OpenAPI and Postman artefacts for the HTTP contract
- Docker Compose environments and GitHub Actions CI
- 322 passing tests in the portfolio snapshot, with 84.83% backend line coverage

## Suggested CV wording

**Accessible Games Catalog — Full-stack group project**

Built accessibility-focused discovery and recommendation features using React, Node.js, Express, Sequelize, and MariaDB. Contributed relational game/tag modelling, game and review flows, personalised recommendations, admin reporting tools, API tests, and CI; the verified portfolio snapshot contains 322 automated tests.

## Interview prompts

- Explain why accessibility preferences belong in structured relational data rather than free-text labels.
- Walk through how recommendation results are derived from a user's saved tag preferences.
- Discuss the trade-offs of JWTs in browser storage and how production security would be improved.
- Describe why SQLite makes CI tests repeatable while MariaDB remains the development database.
- Show how role-aware report handling protects administrative operations.
