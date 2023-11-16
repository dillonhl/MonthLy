console.log("Database File Inititialize");
const path = require('path');
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
//const crypto = require("crypto");
const { SimpleTransaction } = require("./simpleTransactionObject");
console.log("Database File initialize end");

// You may want to have this point to different databases based on your environment
const databaseFile = path.join(__dirname, 'appdata.db');
let db;

// Set up our database
const existingDatabase = fs.existsSync(databaseFile);
console.log("Database File test");

const createUsersTableSQL =
  "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, "+
    "username TEXT NOT NULL, password TEXT NOT NULL)";
const createItemsTableSQL =
  "CREATE TABLE items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, " +
  "access_token TEXT NOT NULL, transaction_cursor TEXT, bank_name TEXT, " +
  "is_active INTEGER NOT_NULL DEFAULT 1, " +
  "budget INTEGER NOT_NULL DEFAULT 100, " +
  "FOREIGN KEY(user_id) REFERENCES users(id))";
const createAccountsTableSQL =
  "CREATE TABLE accounts (id TEXT PRIMARY KEY, item_id TEXT NOT NULL, " +
  "name TEXT, balance REAL DEFAULT 100.00, FOREIGN KEY(item_id) REFERENCES items(id))";
const createTransactionsTableSQL =
  "CREATE TABLE transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, " +
  "account_id TEXT NOT_NULL, category TEXT, date TEXT, " +
  "authorized_date TEXT, name TEXT, amount REAL, currency_code TEXT, " +
  "is_removed INTEGER NOT_NULL DEFAULT 0, " +
  "FOREIGN KEY(user_id) REFERENCES users(id), " +
  "FOREIGN KEY(account_id) REFERENCES accounts(id))";
const createBudgetsTableSQL = 
  "CREATE TABLE budgets (user_id TEXT NOT NULL, category TEXT NOT NULL, amount INTEGER NOT NULL," +
  "FOREIGN KEY(user_id) REFERENCES users(id))";

const createFirstUser = `INSERT INTO users(id, username, password) VALUES(1000000000, "user_good", "pass_good")`;
const createSecondUser = `INSERT INTO users(username, password) VALUES("user_two", "pass_two")`;
const createExBudget = `INSERT INTO budgets(user_id, category, amount) VALUES("1000000000", "Entertainment", 100)`;
const createExBudget2 = `INSERT INTO budgets(user_id, category, amount) VALUES("1000000000", "Travel", 200)`;
const initializeDatabase = async function () {
  if (db) return; // If the database is already initialized, return

  try {
    db = await dbWrapper.open({
      filename: databaseFile,
      driver: sqlite3.Database,
    });

    if (!existingDatabase) {
      await db.run(createUsersTableSQL);
      await db.run(createItemsTableSQL);
      await db.run(createAccountsTableSQL);
      await db.run(createTransactionsTableSQL);
      await db.run(createBudgetsTableSQL);
      await db.run(createFirstUser);
      await db.run(createSecondUser);
      await db.run(createExBudget);
      await db.run(createExBudget2);
    } else {
      const tableNames = await db.all(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const tableNamesToCreationSQL = {
        users: createUsersTableSQL,
        items: createItemsTableSQL,
        accounts: createAccountsTableSQL,
        transactions: createTransactionsTableSQL,
      };
      for (const [tableName, creationSQL] of Object.entries(
        tableNamesToCreationSQL
      )) {
        if (!tableNames.some((table) => table.name === tableName)) {
          console.log(`Creating ${tableName} table`);
          await db.run(creationSQL);
        }
      }
      console.log("Database is up and running!");
      sqlite3.verbose();
    }
  } catch (dbError) {
    console.error(dbError);
  }
};

  const debugExposeDb = function () {
    return db;
  };

  const addUser = async function (username, password) {
    const result = await db.run(
      `INSERT INTO users(username, password) VALUES("${username}", "${password}")`
    );
    console.log(result.lastID)
    return result.lastID;
  };

  const getUserList = async function () {
    const result = await db.all(`SELECT id, username FROM users`);
    return result;
  };

  const getUser = async function (username, password) {
    const result = await db.get('SELECT id, username FROM users WHERE username = ? AND password = ?', [username, password]);
    return result;
  };

  const getRecentTransactions = async function (userID, accountID) {
    const result = await db.all(`SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 10`, [userID]);
    return result;
  }

  const addItem = async function (itemId, userId, accessToken) {
    const result = await db.run(
      `INSERT INTO items(id, user_id, access_token) VALUES(?, ?, ?)`,
      itemId,
      userId,
      accessToken
    );
    return result;
  };
  
  const addBankNameForItem = async function (itemId, institutionName) {
    const result = await db.run(
      `UPDATE items SET bank_name=? WHERE id =?`,
      institutionName,
      itemId
    );
    return result;
  };
  
  const addAccount = async function (accountId, itemId, acctName) {
    await db.run(
      `INSERT OR IGNORE INTO accounts(id, item_id, name) VALUES(?, ?, ?)`,
      accountId,
      itemId,
      acctName
    );
  };
  
  const getItemInfo = async function (userID) {
    const result = await db.get(
      `SELECT * FROM items WHERE user_id=?`,
      userID
    );
    return result;
  };
  
  const getItemInfoForUser = async function (itemId, userId) {
    const result = await db.get(
      `SELECT access_token, transaction_cursor FROM items 
      WHERE id= ? AND user_id = ?`,
      itemId,
      userId
    );
    return result;
  };

  const getItemIDForUser = async function (userId) {
    const items = await db.get(`SELECT id FROM items WHERE user_id=?`, userId);
    return items;
  };

  const addBudgetToList = async function (userID, category, amount) {
    const result = await db.run(
      `INSERT INTO budgets (user_id, category, amount) VALUES (?, ?, ?)`, 
      [userID, category, amount]
    );
    console.log(`add budget ${category}`);
    return;
  }

  const getBudgetList = async function (userID) {
    const result = await db.all(
      `SELECT * FROM budgets WHERE user_id=?`,
      userID
    );
    return result;
  };

  const getAccessToken = async function(userID) {
    const result = await db.get(
      `SELECT * FROM items WHERE user_id=?`,
      userID
    );
      return result;
    
  };

  /**
 * Add a new transaction to our database
 *
 * @param {SimpleTransaction} transactionObj
 */
const addNewTransaction = async function (transactionObj) {
  try {
    const result = await db.run(
      `
  INSERT INTO transactions 
    (id, user_id, account_id, category, date, authorized_date, name, amount,
    currency_code)
  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      transactionObj.id,
      transactionObj.userId,
      transactionObj.accountId,
      transactionObj.category,
      transactionObj.date,
      transactionObj.authorizedDate,
      transactionObj.name,
      transactionObj.amount,
      transactionObj.currencyCode
    );

    return result;
  } catch (error) {
    console.log(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
    if (error.code === "SQLITE_CONSTRAINT") {
      console.log(`Maybe I'm reusing a cursor?`);
    }
  }
};

/**
 *
 * Modify an existing transaction in our database
 *
 * @param {SimpleTransaction} transactionObj
 */
const modifyExistingTransaction = async function (transactionObj) {
  try {
    const result = await db.run(
      `UPDATE transactions 
      SET account_id = ?, category = ?, date = ?, 
      authorized_date = ?, name = ?, amount = ?, currency_code = ? 
      WHERE id = ?
      `,
      transactionObj.accountId,
      transactionObj.category,
      transactionObj.date,
      transactionObj.authorizedDate,
      transactionObj.name,
      transactionObj.amount,
      transactionObj.currencyCode,
      transactionObj.id
    );
    return result;
  } catch (error) {
    console.log(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
};

/**
 * Mark a transaction as removed from our database
 *
 * @param {string} transactionId
 */
const markTransactionAsRemoved = async function (transactionId) {
    try {
    const updatedId = transactionId + "-REMOVED-" + crypto.randomUUID();
    const result = await db.run(
      `UPDATE transactions SET id = ?, is_removed = 1 WHERE id = ?`,
      updatedId,
      transactionId
    );
    return result;
  } catch (error) {
    console.log(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
};

/**
 * Actually delete a transaction from the database
 *
 * @param {string} transactionId
 */
const deleteExistingTransaction = async function (transactionId) {
    try {
    const result = await db.run(
      `DELETE FROM transactions WHERE id = ?`,
      transactionId
    );
    return result;
  } catch (error) {
    console.log(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
};
const getTransactions = async function (userID, maxNum) {
  const results = await db.all(
    `SELECT transactions.*,
      accounts.name as account_name,
      items.bank_name as bank_name
    FROM transactions
    JOIN accounts ON transactions.account_id = accounts.id
    JOIN items ON accounts.item_id = items.id
    WHERE transactions.user_id = ?
      and is_removed = 0
    ORDER BY date DESC
    LIMIT ?`,
    userID,
    maxNum
  );
  return results;
}
/**
 * Save our cursor to the database
 *
 * @param {string} transactionCursor
 * @param {string} itemId
 */
const saveCursorForItem = async function (transactionCursor, itemId) {
  try {
    await db.run(
      `UPDATE items SET transaction_cursor = ? WHERE id = ?`,
      transactionCursor,
      itemId
    );
  } catch (error) {
    console.error(
      `It's a big problem that I can't save my cursor. ${JSON.stringify(error)}`
    );
  }
};

const updateBudget = async function (userID, budget) {
  try {
    await db.run(`UPDATE items SET budget = ? where user_id = ?`,
    budget,
    userID);
  } catch (error) {
    console.error(
      `Error with updating budget. ${JSON.stringify(error)}`
    );
  }
}

const removeBudgetFromList = async function(userID, category, amount) {
  try {
    await db.run(
      `DELETE FROM budgets WHERE user_id = ? AND category = ? AND amount = ?`,
      [userID, category, amount]
    );
  } catch (error) {
    console.log(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
}

const getTransactionsByMonth = async function(userID, year, month) {
  const startOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endOfMonth = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

  const results = await db.all(`
    SELECT * FROM transactions
    WHERE user_id = '${userID}' AND date >= '${startOfMonth}' AND date < '${endOfMonth}';
    `);
    //console.log(results);
  return results;

}

  module.exports = {
    debugExposeDb,
    initializeDatabase,
    addUser,
    getUserList,
    getUser,
    addItem,
    addBankNameForItem,
    addAccount,
    getItemInfo,
    getItemInfoForUser,
    getItemIDForUser,
    getRecentTransactions,
    addBudgetToList,
    getBudgetList,
    getAccessToken,
    addNewTransaction,
    modifyExistingTransaction,
    markTransactionAsRemoved,
    deleteExistingTransaction,
    getTransactions,
    saveCursorForItem,
    updateBudget,
    removeBudgetFromList,
    getTransactionsByMonth,
  };