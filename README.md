# MonthLy Application : PlaidAPI, ReactJS, Node/Express

This app uses the Plaid API to connect to a bank account to load transactions.  This is set up with ReactJS on the front end and NodeJS/Express on the backend. A local database will be created on first server run.<br/>

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

```cd server``` and run ```npm install``` <br/>
```cd client``` and run ```npm install``` <br/>

You will need to create a free Plaid account to get keys.  Once you have the keys, you need to create the keys file: <br/>
Under ```server```: ```cd config```<br/>
```touch keys.js```<br/>
In the file, add the following:
```
module.exports = {
    PLAID_CLIENT_ID: 'ADD CLIENT KEY',
    PLAID_SECRET: 'ADD SECRET KEY'
    PLAID_ENV:
};
```

If you would like to test the application using the sandbox environment, add sandbox to the PLAID_ENV, and enter your keys from plaid into keys.js

To run both servers, run ```npm run dev``` from the ```server``` folder. 
Runs the app in the development mode.
Open http://localhost:3000 to view it in the browser.

Create a username and password, then it will redirect you to the main page. There you can connect to a bank.

When prompted, add the following test credentials for sandbox: <br/>
```username: user_good``` <br/>
```password: pass_good```

