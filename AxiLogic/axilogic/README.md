# AXILogic

Marketing site and lead system for AXILogic Solutions & Consultancy — a software engineering and operations consulting company in Maseru, Lesotho.

## Start here

- **DEPLOY.md** — from an empty machine to a live secured site, in order
- **SECURITY.md** — audit findings, what was fixed, what still needs your decision

## What it does

- Scroll-driven transformation sequence on the home page: scattered panels converge and resolve into a working operations board
- Interactive custom-build explorer — visitors pick their business type and see what a build looks like for them
- Contact form writing to Firestore, with honeypot, timing and throttle protection
- Admin panel behind Firebase Authentication: edit page copy and brand colours, read inquiries, configure the assistant
- Chat assistant, scripted by default, with a documented path to a real model behind a proxy
- Installable as an app, works offline

## Structure

Markup, styles and behaviour are separate files on purpose. It is not only tidier — it lets the Content Security Policy refuse inline scripts, which is what makes the policy worth having.

Nothing in the browser is trusted. Access control lives entirely in `firestore.rules`.

## Positioning note

There is no packaged product. Every engagement is a custom build, and the client owns the source code. The site says so plainly, and the assistant is instructed never to imply otherwise — including never inventing a price, a client name, or a case study.
