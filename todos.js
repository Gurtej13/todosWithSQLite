const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./todos.db', (err) => {
  if (err) {
    console.error('Error connecting to SQLite database', err);
    return;
  }
  console.log('Connected to SQLite database');
});

// Initialize the todos table
db.run(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium'
  )
`);

// GET /todos - Retrieve all to-do items or filter by completed status
app.get('/todos', (req, res) => {
  const { completed } = req.query;
  let query = 'SELECT * FROM todos';
  const params = [];

  if (completed !== undefined) {
    query += ' WHERE completed = ?';
    params.push(completed === 'true' ? 1 : 0);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve todos' });
    }
    res.json(rows);
  });
});

// POST /todos - Add a new to-do item
app.post('/todos', (req, res) => {
  const { task, priority } = req.body;
  const query = 'INSERT INTO todos (task, priority) VALUES (?, ?)';
  const params = [task, priority || 'medium'];

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create to-do item' });
    }
    res.status(201).json({ id: this.lastID, task, priority: priority || 'medium', completed: 0 });
  });
});

// PUT /todos/:id - Update an existing to-do item
app.put('/todos/:id', (req, res) => {
  const { id } = req.params;
  const { task, completed, priority } = req.body;
  const query = `
    UPDATE todos
    SET task = COALESCE(?, task),
        completed = COALESCE(?, completed),
        priority = COALESCE(?, priority)
    WHERE id = ?
  `;
  const params = [task, completed !== undefined ? (completed ? 1 : 0) : null, priority, id];

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update to-do item' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'To-Do item not found' });
    }
    res.json({ message: 'To-Do item updated successfully' });
  });
});

// PUT /todos/complete-all - Mark all to-do items as completed
app.put('/todos/complete-all', (req, res) => {
  const query = 'UPDATE todos SET completed = 1';

  db.run(query, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to mark all items as completed' });
    }
    res.json({ message: 'All to-do items marked as completed' });
  });
});

// DELETE /todos/:id - Delete a to-do item
app.delete('/todos/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM todos WHERE id = ?';

  db.run(query, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete to-do item' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'To-Do item not found' });
    }
    res.status(204).send();
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
