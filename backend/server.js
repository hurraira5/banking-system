const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost', user: 'root', password: 'root', database: 'banking_db'
});

db.connect(err => {
  if (err) console.log('DB Error:', err.message);
  else console.log('✅ MySQL Connected!');
});

// 1. Dashboard Stats
app.get('/api/stats', (req, res) => {
  const sql = `SELECT
    (SELECT COUNT(*) FROM customers) AS total_customers,
    (SELECT COUNT(*) FROM accounts WHERE status='active') AS active_accounts,
    (SELECT COALESCE(SUM(balance),0) FROM accounts) AS total_deposits,
    (SELECT COUNT(*) FROM transactions) AS total_transactions,
    (SELECT COALESCE(SUM(amount),0) FROM loans WHERE status='approved') AS total_loans`;
  db.query(sql, (err, r) => err ? res.status(500).json({error:err.message}) : res.json(r[0]));
});

// 2. All Customers
app.get('/api/customers', (req, res) => {
  db.query(`SELECT c.*, COUNT(a.account_id) as accounts
    FROM customers c LEFT JOIN accounts a ON c.customer_id=a.customer_id
    GROUP BY c.customer_id ORDER BY c.created_at DESC`,
  (err, r) => err ? res.status(500).json({error:err.message}) : res.json(r));
});

// 3. All Accounts
app.get('/api/accounts', (req, res) => {
  db.query(`SELECT a.*, c.name as customer_name
    FROM accounts a JOIN customers c ON a.customer_id=c.customer_id
    ORDER BY a.balance DESC`,
  (err, r) => err ? res.status(500).json({error:err.message}) : res.json(r));
});

// 4. Recent Transactions
app.get('/api/transactions', (req, res) => {
  db.query(`SELECT t.*, c.name as customer_name, a.account_type
    FROM transactions t
    JOIN accounts a ON t.account_id=a.account_id
    JOIN customers c ON a.customer_id=c.customer_id
    ORDER BY t.transaction_date DESC LIMIT 50`,
  (err, r) => err ? res.status(500).json({error:err.message}) : res.json(r));
});

// 5. Transactions by Type (for pie chart)
app.get('/api/transactions/summary', (req, res) => {
  db.query(`SELECT type, COUNT(*) as count, SUM(amount) as total
    FROM transactions GROUP BY type`,
  (err, r) => err ? res.status(500).json({error:err.message}) : res.json(r));
});

// 6. Balance by Account Type (for bar chart)
app.get('/api/accounts/by-type', (req, res) => {
  db.query(`SELECT account_type, COUNT(*) as count, SUM(balance) as total_balance
    FROM accounts GROUP BY account_type`,
  (err, r) => err ? res.status(500).json({error:err.message}) : res.json(r));
});

// 7. All Loans
app.get('/api/loans', (req, res) => {
  db.query(`SELECT l.*, c.name as customer_name
    FROM loans l JOIN customers c ON l.customer_id=c.customer_id
    ORDER BY l.issued_date DESC`,
  (err, r) => err ? res.status(500).json({error:err.message}) : res.json(r));
});

// 8. Monthly Transactions (for line chart)
app.get('/api/transactions/monthly', (req, res) => {
  db.query(`SELECT DATE_FORMAT(transaction_date,'%Y-%m') as month,
    COUNT(*) as count, SUM(amount) as total
    FROM transactions GROUP BY month ORDER BY month`,
  (err, r) => err ? res.status(500).json({error:err.message}) : res.json(r));
});

// 9. Top customers by balance
app.get('/api/customers/top', (req, res) => {
  db.query(`SELECT c.name, SUM(a.balance) as total_balance
    FROM customers c JOIN accounts a ON c.customer_id=a.customer_id
    GROUP BY c.customer_id ORDER BY total_balance DESC LIMIT 5`,
  (err, r) => err ? res.status(500).json({error:err.message}) : res.json(r));
});

app.listen(5000, () => console.log('🚀 Server on port 5000'));