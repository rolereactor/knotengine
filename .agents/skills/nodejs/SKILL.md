---
name: nodejs
description: Node.js best practices and conventions. Use when working with Node.js backend projects.
---

# Skill: nodejs

## When to Use This Skill

Use this skill when:

- Working with Node.js backend
- Creating APIs
- Building server applications

## Best Practices

- Use ESM (`"type": "module"`) in package.json
- Use async/await over callbacks
- Handle errors properly
- Use environment variables for config

## Project Structure

```
src/
├── routes/
├── controllers/
├── services/
├── models/
├── middleware/
├── utils/
└── index.js / server.js
```

## Express Patterns

```javascript
// Route handler
app.get("/users", async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Error Handling

```javascript
// Async error wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

## Common Tools

- Express, Fastify - web frameworks
- Prisma, Drizzle - ORMs
- Zod - validation
- Dotenv - env variables

## Testing

- Use Jest or Vitest
- Supertest for API testing
- Test routes, not implementation
