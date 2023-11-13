const db = require('./db')
const createExBudget2 = `INSERT INTO budgets(user_id, category, amount) VALUES("1000000000", "Travel", 200)`;
(async () => {
    try {
      await db.initializeDatabase(); // Initialize the database
      await db.addBudgetToList(1000000000, "Travel", 200);
    } catch (error) {
      console.error("Error adding new user:", error);
    }
  })();