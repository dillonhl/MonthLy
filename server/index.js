const express = require('express');
const bodyParser = require('body-parser');
const keys = require('./client/src/config/keys');
const cors = require('cors');
const {SimpleTransaction} = require('./client/src/database/simpleTransactionObject');
const db = require('./client/src/database/db');
const { Configuration, PlaidEnvironments, PlaidApi } = require("plaid");

const app = express();
app.use(cors())
app.use(bodyParser.json());

// initialize database
(async () => {
  try {
    await db.initializeDatabase(); // Initialize the database
    console.log(db);
  } catch (error) {
    console.error("Error adding new user:", error);
  }
})();

// Initialize Plaid Client
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": keys.PLAID_CLIENT_ID,
      "PLAID-SECRET": keys.PLAID_SECRET,
    },
  },
});
const client = new PlaidApi(plaidConfig);

// Create link token
app.post('/create_link_token', async (req, res, next) => {
  console.log(`app.post create_link_token with userID: ${req.body.userID}`)
    try{
      const response = await client.linkTokenCreate({
        user: {
          client_user_id: `${req.body.userID}`,
        },
        client_name: 'Plaid Test App',
        products: ['auth', 'transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: 'https://sample-web-hook.com',
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings'],
          },
        },
      })
      //console.log(`app.post create_link_token result: ${response.data.link_token}`)
      return res.send({link_token: response.data.link_token}) 
      } catch (error) {
        console.log(`Running into an error!`);
        next(error);
    }
  });

// Get access token and populate databases
app.post('/get_access_token', async(req, res, next) => {
    //destructure publicToken in response data
    const {publicToken} = req.body;
    const {userID} = req.body;
    const response = await client.itemPublicTokenExchange({public_token: publicToken});
    const itemID = response.data.item_id;
    const accessToken = response.data.access_token;
    console.log("app.post get_access_token:")
    console.log(response);
    // Add new item to db
    await db.addItem(itemID, userID, accessToken);
    // Populate bank name
    await populateBankName(itemID, accessToken);
    // populate account info
    await populateAccountNames(accessToken);
    res.json({ status: "success" })
    return;
  })

app.post('/get_balance', async(req, res) =>{
    const accessToken = await db.getAccessToken(req.body.userID);
    const response = await client.accountsBalanceGet({access_token: accessToken.access_token});
    const accounts = response.data.accounts;
    // Calculate the sum of balances.available
    const totalBalance = accounts.reduce((sum, item) => sum + item.balances.current, 0);
    console.log(`balance: ${totalBalance}`)
    return res.send({balance: totalBalance}) 
  })

app.post('/update_budget', async(req, res) => {
  const userID = req.body.userID;
  const budget = req.body.budget;
  await db.updateBudget(userID, budget);
  return;
})

app.post('/login', async (req, res) => {
  try {
    console.log("app.post login");
    console.log(req.body)
    const username = req.body.username;
    const password = req.body.password;
    const result = await db.getUser(username,password);
    console.log(result);
    if (result)
      return res.send({userID: result.id, username: result.username});
    else {
      console.log("Incorrect username/password")
      return null;
    }
  } catch (error) {
    console.error(error);
  }
});

app.post("/transactions/sync", async (req, res, next) => {
    try {
        const userID = req.body.userID;
        const item = await db.getItemIDForUser(userID);
        const results = await syncTransactions(userID, item.id);
        res.json({ completeResults: results })
    } catch(error) {
        console.log("Running into an error!");
        next(error);
    }
});

const syncTransactions = async function (userID, itemID) {
  // 1. Fetch our most recent cursor from the database
  const summary = { added: 0, removed: 0, modified: 0 };
  const {
      access_token: accessToken,
      transaction_cursor: transactionCursor,
  } = await db.getItemInfoForUser(itemID, userID);

  // 2. Fetch all our transactions since the last cursor
  const allData = await fetchNewSyncData(accessToken, transactionCursor);

  // 3. Add new transactions to database
  await Promise.all(allData.added.map(async (txnObj) => {
      const simpleTransaction = SimpleTransaction.fromPlaidTransaction(txnObj, userID);
      const result = await db.addNewTransaction(simpleTransaction);
      if(result) {
          summary.added += result.changes;
      }
  }));

  // 4. Updated any modified transactions
  await Promise.all(allData.modified.map(async (txnObj) => {
      const simpleTransaction = SimpleTransaction.fromPlaidTransaction(txnObj, userID);
      //console.log(`I want to add ${JSON.stringify(simpleTransaction)}`);
      const result = await db.modifyExistingTransaction(simpleTransaction);
      if (result) {
      summary.modified += result.changes;
      }
  }));

  // 5. Do somethign with removed transactions
  await Promise.all(allData.removed.map(async (txnMini) => {
      //const result = await db.deleteExistingTransaction(txnMini.transaction_id);
      const result = await db.markTransactionAsRemoved(txnMini.transaction_id);
      if (result) {
      summary.removed += result.changes;
      }
  }));
  // 6. Save our most recent cursor
  console.log(`The last cursor value was ${allData.nextCursor}`);
  await db.saveCursorForItem(allData.nextCursor, itemID);

  return summary;
}

const fetchNewSyncData = async function (accessToken, initialCursor, retriesLeft = 3) {
    const allData = { added: [], modified: [], removed: [], nextCursor: initialCursor };
    if (retriesLeft <= 0) {
      console.error("Too many retries!");
      // We're just going to return no data and keep our original cursor. We can try again later.
      return allData;
    }
    try{
      let keepGoing = false;
      do {
        const results = await client.transactionsSync({
          access_token: accessToken,
          cursor: allData.nextCursor,
          options: {
            include_personal_finance_category: true,
          },
        });
        const newData = results.data;
        allData.added = allData.added.concat(newData.added);
        allData.modified = allData.modified.concat(newData.modified);
        allData.removed = allData.removed.concat(newData.removed);
        allData.nextCursor = newData.next_cursor;
        keepGoing = newData.has_more;
        console.log(
          `Added: ${newData.added.length} Modified: ${newData.modified.length} Removed: ${newData.removed.length}`
        );
      } while (keepGoing == true);
      console.log('All done!');
      console.log(`Final Cursor: ${allData.nextCursor}`);
      return allData;
    } catch (error) {
      // If you want to see if this is a sync mutation error, you can look at
      // error?.response?.data?.error_code
      console.log(
        `Oh no! Error! ${JSON.stringify(
          error
        )} Let's try again from the beginning!`
      );
      await setTimeout(1000);
      return fetchNewSyncData(accessToken, initialCursor, retriesLeft - 1);
    }
  };

app.post('/get_recent_transactions', async(req, res) => {
  console.log("app.post /get_recent");
  const response = await db.getRecentTransactions(req.body.userID);
  return res.send(response);
})

app.post('/get_transactions', async(req, res) => {
  console.log("app.post /get_transactions")
  const maxNum = 1000;
  const response = await db.getTransactions(req.body.userID, maxNum);
  return res.send(response);
})

app.post('/item_info', async(req, res) => {
  console.log("app.post /item_info")
  const response = await db.getItemInfo(req.body.userID)
  console.log(response);
  // need to change the res.send if no entry in db
  if (response)
    return res.send({id: response.id, budget: response.budget, accessToken: response.access_token});
  else
    return res.send();

})

app.post('/get_budgets', async(req, res) => {
  console.log("app.post /get_budgets");
  const response = await db.getBudgetList(req.body.userID);
  console.log(response);
  return res.send(response);
})

app.post('/add_budget_item_to_db', async(req, res) => {
  console.log("app.post add_budget_to_db");
  const data = req.body;
  await db.addBudgetToList(data.user_id, data.category, data.amount);
  return;
})

app.post('/delete_budget_item', async(req, res) => {
  console.log("app.post delete_budget_item");
  const data = req.body;
  console.log(req.body);
  await db.removeBudgetFromList(req.body.userID, req.body.category, req.body.budget);
  return;
})

// Get bank name from plaid
const populateBankName = async (itemId, accessToken) => {
  try {
    const itemResponse = await client.itemGet({
      access_token: accessToken,
    });
    //console.log(itemResponse)
    const institutionId = itemResponse.data.item.institution_id;
    if (institutionId == null) {
      return;
    }
    const institutionResponse = await client.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"],
    });
    const institutionName = institutionResponse.data.institution.name;
    //console.log(institutionName);
    await db.addBankNameForItem(itemId, institutionName);
  } catch (error) {
    console.log(`Ran into an error! ${error}`);
  }
};

// Get Account info from plaid
const populateAccountNames = async (accessToken) => {
  try {
    const acctsResponse = await client.accountsGet({access_token: accessToken,});
    const acctsData = acctsResponse.data;
    console.log("acctsData: ");
    console.log(acctsData);
    const itemId = acctsData.item.item_id;
    await Promise.all(
      acctsData.accounts.map(async (acct) => {
        console.log(`Add account ID : ${acct.account_id}`);
        await db.addAccount(acct.account_id, itemId, acct.name);
      })
    );
  } catch (error) {
    console.log(`Ran into an error! ${error}`);
  }
};

app.post('/get_monthly_transactions', async(req, res) => {
  console.log('app.post /get_monthly');
  const results = await getAllTransactions(req.body.userID);
  return res.send({results});
})

async function getAllTransactions() {
  const allTransactions = {};

  for (let year = 2022; year <= 2023; year++) {
    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${month}`;
      allTransactions[key] = await db.getTransactionsByMonth(year, month);
    }
  }
  return allTransactions;
}

const PORT = 5000;

app.listen(PORT, () => console.log(`listening on port ${PORT}!`));
