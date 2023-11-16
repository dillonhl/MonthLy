import React from 'react';
import "./App.css";
import axios from "axios";
import { withRouter } from 'react-router-dom';
import {Login, SignUp}  from './components/LoginSignUp';
import { Dashboard, HomePage } from './components/HomePage';
import './login.css';
import { AnalyticsPage } from './components/AnalyticsPage';
import { TransactionsPage } from './components/TransactionsPage';
import { LoadingPage } from './components/LoadingPage';
class App extends React.PureComponent {
  state = {
            currentForm: "login",
            currentPage: "null",
            token: null,
            userID: "null",
            aggregatedData: [],
            balance: 0.00,
            loggedIn: false,
          }

  toggleForm = (formName) => {
    this.setState({currentForm: formName});
    console.log(`Switch to form: ${formName}`);
    if (formName === 'HomePage') {
      this.setState({currentPage: formName});
      // create public link token
      this.createLinkToken(this.state.userID);
    }
  }

  togglePage = (pageName) => {
    if (pageName !== this.state.currentPage) {
      this.setState({currentPage: pageName});
      console.log(`Switch for page: ${pageName}`);
    }
    if (pageName === 'logout') {
      this.logout();
      console.log(`Logging Out, go to Login Page`);
    }
  }
  // reset states
  logout = () => {
    this.setState({currentForm: 'login'});
    this.setState({currentPage: 'null'});
    this.setState({userID: "null"});
    this.setState({aggregatedData: []});
    this.setState({token: null});
    this.setState({loggedIn: false});
    this.setState({balance: 0.0});
  }

  //connects to plaid to create temporary link token
  createLinkToken = async (userID) => {
    console.log(`Creating Link token user userID: ${userID}`)
    
    const res = await axios.post('http://localhost:5000/create_link_token', {userID: userID});
    const data = res.data.link_token
    this.setState({ token: data })
    console.log(`Creating Link token result ${res.data}`);
  }

  // Link bank using link token
  linkBank = async (publicToken) => {
    console.log("client side public token", publicToken)
    const userID = this.state.userID;
    // Get access token and also populate databases
    const res = await axios.post('http://localhost:5000/get_access_token', {publicToken: publicToken, userID: userID})
    if (res.data.status === "success"){
      this.setState({currentPage: "LoadingPage"});
      await this.getTransactionsSync();
      await this.handleTransactions();
      await this.getBalance();
      this.setState({currentPage: "HomePage"});
    }
    
  }

  setUserID = (userID) => {
    this.setState({userID: userID});
  }

  // Executes when userID is changed / when user logs in
  componentDidUpdate(prevProps, prevState) {
    const checkConnectionAndUpdate = async () => {
      if (prevState.userID !== this.state.userID) {
        // Check if connected
        const isConnected = await this.checkConnected(this.state.userID);
        if (isConnected) {
          this.getTransactionsSync();
          this.handleTransactions();
          this.getBalance();
          this.setState({loggedIn: true})
          console.log('User is connected');
        }
        else {
          this.setState({loggedIn: true})
        }
      }
    };
  
    checkConnectionAndUpdate();
  }
  // Check if bank is connected
  checkConnected = async (userID) => {
    const itemInfo = await axios.post('http://localhost:5000/item_info', {userID: userID});
    if (itemInfo.data) {
      return true;
    }
    else {
      return false;
    }
  }
  // Get latest transactions from plaid api
  getTransactionsSync = async () => {
    await axios.post('http://localhost:5000/transactions/sync', {userID: this.state.userID});
  }


  handleTransactions = async () => {
    try {
      const response = await axios.post('http://localhost:5000/get_monthly_transactions', { userID: this.state.userID });
      const allTransactions = response.data.results;
      console.log("all :")
      console.log(allTransactions);
      // Initialize an object to store the aggregated data
      const aggregatedData = {};

      // Iterate over each month in allTransactions
      for (const month in allTransactions) {
        // Initialize an object to store the sum of amounts for each category
        const categorySum = {};

        // Iterate over each transaction in the current month
        allTransactions[month].forEach(transaction => {
          const { category, amount } = transaction;

          // Accumulate the amount for the current category
          categorySum[category] = (categorySum[category] || 0) + amount;
        });

        // Store the result in the aggregatedData object
        aggregatedData[month] = categorySum;
      }
      this.setState({aggregatedData: aggregatedData})
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }

  // get balance from plaid
  getBalance = async () => {
    const balanceInfo = await axios.post('http://localhost:5000/get_balance', {userID: this.state.userID});
    this.setState({balance: balanceInfo.data.balance});
}

  render(){
    return (
      <>
      <div className="App">
        { // Login page
          this.state.currentForm === "login" ? <Login onFormSwitch={this.toggleForm} setUserID={this.setUserID}/> : <></>
        }
        { // Signup page
          this.state.currentForm === "signup" ? <SignUp onFormSwitch={this.toggleForm} setUserID={this.setUserID}/> : <></>
        }
        <div className="HomePage">
          { // User logged in, go to home page, display navbar
            this.state.currentForm === "HomePage" ? <HomePage onPageSwitch={this.togglePage}/> : <></>
          }  
          { // display dashboard
            this.state.currentPage === "HomePage" ? <Dashboard aggregatedData={this.state.aggregatedData} balance={this.state.balance} token ={this.state.token} 
                                                                            linkBank={this.linkBank} userID={this.state.userID} currentPage={this.state.currentPage}/> : <></>
          }
          { // display analytics page
            this.state.currentPage === "AnalyticsPage" ? <AnalyticsPage aggregatedData={this.state.aggregatedData} userID={this.state.userID}/> : <></>
          }
          { // display transactions page
            this.state.currentPage === "TransactionsPage" ? <TransactionsPage aggregatedData={this.state.aggregatedData} userID={this.state.userID}/> : <></>
          }
          { // Display loading page when connecting bank
            this.state.currentPage === "LoadingPage" ? <LoadingPage/> : <></>
          }
        </div>

      </div>
      </>
    );
  }
}

export default withRouter(App);
