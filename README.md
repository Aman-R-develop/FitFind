# FitFind 👗✨

FitFind is a fashion and outfit-discovery web application designed to help users explore products, manage their looks, save favorites, and discover outfit ideas through a simple and interactive interface.

## 📌 Project Overview

FitFind brings different parts of the fashion-discovery experience into one web interface. The project focuses on creating a clean, user-friendly experience for browsing fashion content, viewing products, managing a personal profile, and organizing saved looks.

## 🚀 Features

- **Home / Landing Page** — Main entry point to the FitFind application.
- **About** — Information about FitFind and the purpose of the project.
- **Features** — Overview of the key capabilities provided by the application.
- **Profile** — User profile section for managing personal information.
- **Favorites** — Section for saved or liked fashion items.
- **How It Works** — Explains the workflow and user experience.
- **My Looks** — Space for users to organize their selected looks.
- **Product** — Product-focused page for viewing fashion items.
- **Results** — Displays results generated from the application's interactions.
- **Upload** — Allows users to upload content as part of the experience.

## 🛠️ Tech Stack

- **HTML5** — Page structure and content
- **CSS3** — Styling, layouts, responsiveness, and visual design
- **Git & GitHub** — Version control and team collaboration

## 📁 Project Structure

```text
FitFind/
│
├── about/
│   ├── about.html
│   └── about.css
│
├── features/
│   ├── features.html
│   └── features.css
│
├── profile/
│   ├── profile.html
│   └── profile.css
│
├── favorites/
│   ├── favorites.html
│   └── favorites.css
│
├── how-it-works/
│   ├── how-it-works.html
│   └── how-it-works.css
│
├── index/
│   ├── index.html
│   └── index.css
│
├── my-looks/
│   ├── my-looks.html
│   └── my-looks.css
│
├── product/
│   ├── product.html
│   └── product.css
│
├── results/
│   ├── results.html
│   └── results.css
│
├── upload/
│   ├── upload.html
│   └── upload.css
│
└── README.md
```

## ▶️ How to Run the Project

Because FitFind currently uses HTML and CSS, no special backend setup is required.

### Option 1 — Open directly

Open:

```text
index/index.html
```

in a web browser.

### Option 2 — Use VS Code

1. Open the FitFind folder in VS Code.
2. Open `index/index.html`.
3. Use **Live Server** if it is installed.
4. Open the local URL shown by Live Server.

## 🌿 GitHub Team Workflow

For team development, use branches instead of making changes directly on `master`.

### 1. Get the latest code

```bash
git checkout master
git pull origin master
```

### 2. Create your feature branch

```bash
git checkout -b feature/your-feature-name
```

Example:

```bash
git checkout -b feature/profile
```

### 3. Work on your assigned files

Make your changes and test them locally.

### 4. Check your changes

```bash
git status
```

### 5. Stage only your feature

For example:

```bash
git add profile/
```

Avoid using `git add .` when other teammates may have uncommitted work.

### 6. Commit

```bash
git commit -m "Add profile page"
```

### 7. Push your branch

```bash
git push -u origin feature/profile
```

### 8. Create a Pull Request

On GitHub:

```text
Your branch → master
```

Create a Pull Request, let a teammate review the changes, and merge it after approval.

### 9. Update your local master

After a Pull Request is merged:

```bash
git checkout master
git pull origin master
```

## 👥 Contribution Guidelines

- Work only on your assigned feature unless the team agrees otherwise.
- Pull the latest `master` before starting new work.
- Use a separate branch for each feature.
- Keep commits focused and use meaningful commit messages.
- Check `git status` before committing.
- Do not commit unrelated files.
- Test your feature before creating a Pull Request.
- Communicate with the team before making changes that affect shared pages or navigation.

## 🎯 Project Goal

The goal of FitFind is to provide a simple and engaging fashion platform where users can discover products, organize looks, save favorites, and interact with fashion content through a unified web experience.

## 📄 Academic Project

FitFind is developed as a collaborative academic web-development project, with different team members responsible for different application features.

---

**FitFind — Discover. Style. Organize. ✨**
