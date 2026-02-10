# Website Node Dashboard

Dashboard management system for website content (menus, groups, buttons, forms, socials) with EJS views and REST APIs.

## 1) Libraries to Install

Install all dependencies from package.json:

```bash
npm install
```

Main dependencies:

- express
- ejs + express-ejs-layouts
- mongoose
- express-session
- method-override
- multer
- bcrypt
- dotenv
- swagger-jsdoc + swagger-ui-express

Dev dependencies:

- nodemon

## 2) Create .env File

Create a new .env file in the project root:

```
MONGO_URI=mongodb://localhost:27017/your_db_name
```

Notes:

- MONGO_URI is required. The app will fail to start if it is missing.

## 3) How to Run

Development (auto-reload):

```bash
npm run dev
```

Production:

```bash
npm start
```

Default server URL:

- http://localhost:3000

Swagger UI:

- http://localhost:3000/swagger

## 4) Flow of This Code

High-level flow:

1. server.js boots Express, loads .env, connects to MongoDB.
2. Middleware is configured: JSON body parsing, URL-encoded parsing, sessions, method override.
3. Static files are served from public/ and views are rendered with EJS layouts.
4. API routes under /api/\* serve JSON responses for menus, homepage, forms, socials, etc.
5. Dashboard routes under /dashboard/\* render EJS pages and rely on session login.
6. Data access is separated into modules/\* with models, services, controllers, routes.

Key modules:

- Menu: menu tree, parent-child relationship via parentId
- Group: content blocks, buttons embedded, optional HTML/editor content
- Button: route or form type, stores linked form info
- Form: dynamic form builder with submissions
- Social: homepage social links

Suggested dev flow:

- Start server with npm run dev
- Open /dashboard/\* for admin UI
- Use /api/\* for frontend integration
- Use /swagger for API reference

## 5) Folder Structure

Key folders:

- modules/ (feature modules: models, services, controllers, routes)
- views/ (EJS templates for dashboard UI)
- public/ (static assets: CSS, JS, uploads)
- routes/ (view routing)
- middleware/ (auth, upload, etc.)

Example structure:

```
modules/
	menu/
	group/
	button/
	form/
	social/
views/
	dashboard/
	layouts/
	partials/
public/
	css/
	js/
	uploads/
```

## 6) Main API Endpoints

Common endpoints used by FE:

- GET /api/homepage (aggregate homepage data)
- GET /api/homepage/top-menus
- GET /api/homepage/bottom-menus
- GET /api/homepage/menu-parents
- GET /api/homepage/menus/:id/children-tree
- GET /api/menus
- GET /api/menus/:id/children
- GET /api/menus/:id/children-tree
- GET /api/forms
- GET /api/socials

Swagger reference:

- /swagger
