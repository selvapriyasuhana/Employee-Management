const express = require("express");
const bodyParser = require("body-parser");
const db = require("./db");
const app = express();
const cors = require("cors");

const port = 4000;

app.use(bodyParser.json());
app.use(cors());

// Create Employee
app.post("/employees", async (req, res) => {
  const {
    name,
    qualification,
    status,
    phonenumber,
    dateofjoining,
    department,
    designation,
    salary,
    address,
  } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO employees (name, qualification, status, phonenumber, dateofjoining, department, designation, salary, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [
        name,
        qualification,
        status,
        phonenumber,
        dateofjoining,
        department,
        designation,
        salary,
        JSON.stringify(address),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create employee" });
  }
});

// Get Employee by ID
app.get("/employees/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT * FROM employees WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get employee" });
  }
});

// Get Salary by Employee ID
app.get("/employees/:id/salary", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "SELECT salary FROM employees WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ salary: result.rows[0].salary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get salary" });
  }
});

// Get Salary History by Employee ID
app.get("/employees/:id/salaryhistory", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "SELECT * FROM salary_history WHERE employee_id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Salary history not found" });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get salary history" });
  }
});

// Add Salary History
app.post("/employees/:id/salaryincrement", async (req, res) => {
  const { id } = req.params;
  const { salary, year } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO salary_history (employee_id, salary, year) VALUES ($1, $2, $3) RETURNING *",
      [id, salary, year]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add salary history" });
  }
});

app.get("/employees/:id/salaryhistory/peryear", async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch salary history sorted by year
    const result = await db.query(
      "SELECT year, salary FROM salary_history WHERE employee_id = $1 ORDER BY year ASC",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Salary history not found" });
    }

    // Initialize salary increase array
    let salaryHistoryPerYear = result.rows.map((row, index, array) => {
      const salaryIncrease =
        index > 0 ? row.salary - array[index - 1].salary : 0; // Calculate salary increase for multiple years

      return {
        year: row.year,
        salary: row.salary,
        salaryIncrease: salaryIncrease, // Include increase based on previous year
      };
    });

    // If only one record, salary increase will be 0 by default
    res.json(salaryHistoryPerYear);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to calculate salary history" });
  }
});

// Get All Employees
app.get("/employees", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM employees");
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No employees found" });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get employees" });
  }
});

app.get("/employees/salary/investment", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT department, SUM(salary) as total_salary FROM employees GROUP BY department"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch salary investment data" });
  }
});

// Update Employee by ID and record salary history
app.put("/employees/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    qualification,
    status,
    phonenumber,
    dateofjoining,
    department,
    designation,
    salary,
    address,
  } = req.body;

  try {
    // Fetch the current employee data, specifically the current salary
    const employeeResult = await db.query(
      "SELECT salary FROM employees WHERE id = $1",
      [id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const currentSalary = employeeResult.rows[0].salary;

    // If the salary has changed, insert the new salary into salary_history
    if (currentSalary !== salary) {
      const currentYear = new Date().getFullYear();

      // Insert the new salary into the salary_history table
      await db.query(
        "INSERT INTO salary_history (employee_id, salary, year) VALUES ($1, $2, $3)",
        [id, salary, currentYear]
      );
    }

    // Update the employee's details in the 'employees' table
    const result = await db.query(
      `UPDATE employees 
       SET name = $1, qualification = $2, status = $3, phonenumber = $4, 
           dateofjoining = $5, department = $6, designation = $7, 
           salary = $8, address = $9 
       WHERE id = $10 
       RETURNING *`,
      [
        name,
        qualification,
        status,
        phonenumber,
        dateofjoining,
        department,
        designation,
        salary,
        JSON.stringify(address), // Store the address as JSON string
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Return the updated employee data
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

// Delete Employee by ID
app.delete("/employees/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      "DELETE FROM employees WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

// Test the database connection on server start
db.query("SELECT NOW()", [])
  .then((res) => console.log("Database connected:", res.rows[0]))
  .catch((err) => console.error("Database connection error:", err));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
