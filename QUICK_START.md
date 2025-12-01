# Quick Start Guide

## Getting Started in 5 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Application

```bash
npm start
```

### 3. Try It Out

1. **Add a Note**: Fill in the title and content, then click "Add Note"
2. **Bulk Add**: Click "Add 10 Sample Notes (Bulk)" to see transaction performance
3. **Search**: Type in the search box to find notes
4. **Edit/Delete**: Use the buttons on each note card
5. **Sync**: Enter your backend API URL and click "Sync Now"

## Testing Database Operations

### Option 1: Using the UI

The app provides a complete UI for all operations. Just run `npm start` and use the interface.

### Option 2: Using the Example Script

```bash
node examples/db-usage-example.js
```

This will demonstrate all CRUD operations, bulk inserts, search, and statistics.

## Setting Up Backend Sync

### 1. Create a NestJS Project

```bash
npm i -g @nestjs/cli
nest new my-backend
cd my-backend
```

### 2. Install Dependencies

```bash
npm install @nestjs/typeorm typeorm pg
npm install class-validator class-transformer
```

### 3. Implement the Sync Endpoint

Copy the code from `examples/nestjs-backend-example.ts` to your NestJS controller.

### 4. Configure Database

Set up your PostgreSQL connection in `app.module.ts`:

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'your_username',
  password: 'your_password',
  database: 'your_database',
  entities: [Note],
  synchronize: true, // Only for development
}),
```

### 5. Start Backend

```bash
npm run start:dev
```

### 6. Sync from Electron App

1. Open the Electron app
2. Enter `http://localhost:3000` in the API URL field
3. Click "Sync Now"

## Common Issues

### "better-sqlite3" build errors

If you get native module build errors:

```bash
npm rebuild better-sqlite3
```

Or reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Database locked

Close all app instances and delete:
- `user-data.db-shm`
- `user-data.db-wal`

Then restart the app.

### Sync not working

1. Check backend is running: `curl http://localhost:3000/api/sync`
2. Check CORS settings in NestJS
3. Verify API URL in the app
4. Check browser DevTools console for errors

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check `examples/` folder for code examples
- Review inline comments in source files for implementation details

