// db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres", // Replace with your PostgreSQL username
  host: "localhost",
  database: "salary", // Replace with your database name
  password: "2020", // Replace with your PostgreSQL password
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
