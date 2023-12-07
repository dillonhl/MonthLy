import React, { useEffect, useState, useRef } from 'react';
import axios from "axios";
import { LinkButton } from './Link';

// NavBar
export const HomePage = (props) => {
    // Logout button handler
    const handleLogout = (e) => {
        e.preventDefault();
        props.onPageSwitch('logout');
    }
    
    return (
        <div>
            <div className="navbar">
                 <ul className="navmenu">
                    <li><a href="#home" onClick={() => props.onPageSwitch('HomePage')} className="logo">
                        <i className="bx bxs-wallet"></i><span>Month</span>Ly
                    </a></li>
                    <li><a href="#home" onClick={() => props.onPageSwitch('HomePage')}><i className="bx bxs-dashboard"></i><span>Dashboard</span></a></li>
                    <li><a href="#analytics" className="active" onClick={() => props.onPageSwitch('AnalyticsPage')}><i className="bx bx-analyse"></i><span>Analytics</span></a></li>
                    <li><a href="#transactions" onClick={() => props.onPageSwitch('TransactionsPage')}><i className='bx bx-credit-card' ></i><span>Transactions</span></a></li>
                </ul>

                <button className='logout' onClick={handleLogout}><i className="bx bx-log-out-circle" style={{ color: 'red', marginRight: 3 }}></i>Logout</button>
            </div>
            

        </div>
    )
}

// Get item info from items table
async function getItemInfo(user_id) {
    try {
        const result = await axios.post('http://localhost:5000/item_info', {userID: user_id});

        return result;
    } catch (error) {
        // Handle any file read or write errors here
        console.error('Error:', error);
        return null; // Return null or handle the error
    }
}

// Get budget list from budgets table
async function getBudgets(user_id) {
    try{
        const result = await axios.post('http://localhost:5000/get_budgets', {userID: user_id}) ;
        return result;
    } catch (error) {
        // Handle any file read or write errors here
        console.error('Error:', error);
        return null; // Return null or handle the error
      }

}

// List of transaction categories according to plaid
const categoriesList = ["Bank fees","Entertainment", "Travel", "Food & drink", "General merchandise", "General services", "Government & non-profit", "Home improvement", "Income", "Loan payments", "Medical", "Personal care", "Rent & utilities", "Transfer in", "Transfer out", "Transportation" ];
export const Dashboard = (props) => {
    const [monthlyExpenses, setMonthlyExpenses] = useState(0);
    const [totalSaved, setTotalSaved] = useState(0.00);
    const [budget, setBudget] = useState(0);
    const [categoryBudgets, setCategoryBudgets] = useState([]);
    const [newBudgetCategory, setNewBudgetCategory] = useState('');
    const [newBudgetAmount, setNewBudgetAmount] = useState(0);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const formRef = useRef(null);

    // Check if already connected to a bank
    // May only want to do some of the stuff at login...
    useEffect(() => {
        const fetchData = async () => {
            try {
                const itemInfo = await getItemInfo(props.userID); // should receive budget and check if bank is connected
                const db_budget_list = await getBudgets(props.userID); // get budget list from database
                // might need to check if empty
                setCategoryBudgets(db_budget_list.data);
                if (itemInfo.data) { // need better statement to check if item was found
                    setConnected(true);
                    setBudget(itemInfo.data.budget); // get entered budget from database
                    // Get most recent transactions for container
                    const recentTransactionsInfo = await axios.post('http://localhost:5000/get_recent_transactions', {userID: props.userID});
                    setRecentTransactions(recentTransactionsInfo.data);
                }
                setLoading(false); // finished loading initial data
            } catch (error) {
                console.log('Error fetching data: ', error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // to get total saved and expenses
    useEffect(() => {
        const getData = async () => {
            try {
                // Get most recent transactions for container
                const expenses = await getMonthExpenses(); // Get expenses summed up for the month
                setMonthlyExpenses(expenses);
                if (budget === 0) {
                    setTotalSaved(0.00);
                }
                else{
                    const saved = await getTotalSaved(); // get total saved for the year
                    setTotalSaved(saved);
                }
            } catch (error) {
                console.log('Error getting data: ', error);
            }
        };
        getData();
    }, [props.aggregatedData, budget]);

    async function getMonthExpenses() {
        try{
            // Check how much was spent in the current month
            const today = new Date();
            const currentMonth = today.getMonth() + 1; // Months are zero-based, so add 1
            const currentYear = today.getFullYear();
            const yearMonthString = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
            let sum = 0.00;
            const data = props.aggregatedData[yearMonthString]
            for (const category in data) { // add up each category to get total expenses for the month
                sum = sum + data[category];
            }
            return sum;
        } catch (error) {
            console.log(error);
        }
    }

    async function getTotalSaved() {
        try {
            // budget is 0
            if (budget === 0 || budget === 0.00 || budget === "0" || budget === null || budget === "") {
                return 0.00;
            }

            // Check how much spent per month for the year
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            //const yearString = `${currentYear}`;
            let totalSaved = 0.00;
            // Filter out the current year from the transactions
            const currentYearData = Object.fromEntries(
                Object.entries(props.aggregatedData)
                .filter(([month]) => month.startsWith(currentYear.toString()))
            );
            for (const month in currentYearData) {
                // exclude months later in the current year
                const monthValue = parseInt(month.split('-')[1]);
                if (monthValue <= currentMonth) {
                    const data = props.aggregatedData[month]
                    let sum = 0.00;
                    for (const category in data) { // add up all of the categories in aggregated data to get the expenses per month
                        if (category !== "INCOME" && category !== "Transfer In" && data[category] > 0) {
                            sum = sum + data[category];
                        }
                    }
                    totalSaved = totalSaved + (budget - sum); // add how much was saved in the month
                    sum = 0.00;
                }
            }
            return totalSaved;
        } catch (error) {
            console.log(error);
        }
    }

    // Add budgets for categories (drop down menu for categories)
    const addBudget = () => {
        setShowForm(true);
    }
    // Hook to close form if clicked outside of it
    useEffect(() => {
        function handleClickOutside(event) {
            if(formRef.current && !formRef.current.contains(event.target)) {
                setShowForm(false);
                setNewBudgetCategory('');
                setNewBudgetAmount(0);
                setShowForm(false);
            }
        }
        if(showForm) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
        }
    }, [showForm]);

    const createNewBudgetListItem = (category, amount) => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // Months are zero-based, so add 1
        const currentYear = today.getFullYear();
        const yearMonthString = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
        const spent = props.aggregatedData[yearMonthString]?.[category.toUpperCase()] || 0;
        const checkAmount = amount >= spent;
        const icon = checkAmount ? 'bx-check-circle' : 'bx-x-circle';
        const iconStyle = checkAmount ? { color: 'green' } : { color: 'red' };
        return (<>
            <div className="task-title">
                <i className={`bx ${icon}`} style={iconStyle}></i>
                <span>{category}</span>
            </div>
            <span className="budget-amount" style={{ paddingRight: '10px', paddingLeft: '5px' }}>${spent} / {amount}</span>
            <i className='bx bx-trash bx-flip-horizontal' onClick={(e) => delBudget(e, category, amount)}></i></>);
    }

    const addBudgetItemToDB = async (user_id, category, amount) => {
        await axios.post('http://localhost:5000/add_budget_item_to_db', {user_id: user_id, category: category, amount: amount});
    }

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        // Create new item element
        const newBudgetItem = {
            user_id: props.userID,
            category: `${newBudgetCategory}`,
            amount: newBudgetAmount
        };
        // Add new budget item to category budgets
        setCategoryBudgets([...categoryBudgets, newBudgetItem]);
        // reset form and hide
        setNewBudgetCategory('');
        setNewBudgetAmount(0);
        setShowForm(false);

        // add new item to database
        await addBudgetItemToDB(newBudgetItem.user_id, newBudgetItem.category, newBudgetItem.amount);
    }

    const handleInputBudget = async (value) => {
        if (connected === true && value != budget && value !== '' && value !== null) { // only update if value was changed
            setBudget(value);
            await axios.post('http://localhost:5000/update_budget', {userID: props.userID, budget: value});
        }
    }

    // Delete budget for category
    const delBudget = async (e, category, budget) => {
        e.target.parentNode.remove();
        // edit database
        await axios.post('http://localhost:5000/delete_budget_item', {userID: props.userID, category: category, budget: budget});
    }

    return (
        <div>
            <div className="dashboard"> 
                <div className="header">
                    <div className="left">
                        <h1>Dashboard</h1>
                        <div className='breadcrumb'>
                            <span>Insights</span>
                            {(loading===false && connected === false) ? <LinkButton token ={props.token} linkBank={props.linkBank}/> : <></>}
                        </div>
                    </div>
                    <div className='report'>
                        <label htmlFor="budget">Enter Monthly Budget:</label>
                        <input placeholder={budget} className="budget" type="number" id="budget" name="budget"
                            onBlur={(e) => handleInputBudget(e.target.value)} 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.target.blur();
                                    handleInputBudget(e.target.value)}}}></input>
                    </div>
                </div>
                
                <ul className="insights">
                    <li>
                    <i className='bx bx-dollar-circle' ></i>
                        <span className="info">
                            <h3>${props.balance.toFixed(2)}</h3>
                            <p>Account Balance</p>
                        </span>
                    </li>
                    <li><i className='bx bx-money-withdraw'></i>
                        <span className="info">
                            <h3>${monthlyExpenses.toFixed(2)}</h3>
                            <p>This Month's Expenses</p>
                        </span>
                    </li>
                    <li><i className='bx bx-money'></i>
                        <span className="info">
                            <h3>${budget}</h3>
                            <p>Budget</p>
                        </span>
                    </li>
                    <li><i className='bx bx-wallet-alt bx-flip-horizontal' ></i>
                        <span className="info">
                            <h3>${totalSaved.toFixed(2)}</h3>
                            <p>Total Saved This Year</p>
                        </span>
                    </li>
                </ul>

                <div className="bottom-data">
                    <div className="orders">
                        <div className="header">
                            <i className='bx bx-receipt'></i>
                            <h3>Recent Transactions</h3>
                            <i className='bx bx-filter'></i>
                            <i className='bx bx-search'></i>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((transaction, index) =>
                                    <tr key={index}>
                                        <td>{transaction.date}</td>
                                        <td>{transaction.category}</td>
                                        <td>{transaction.name}</td>
                                        <td>${transaction.amount.toFixed(2)}</td>
                                    </tr>)}
                            </tbody>
                        </table>
                    </div>

                    <div className="reminders">
                        <div className="header">
                            <i className='bx bx-note'></i>
                            <h3>Budgets</h3>
                            <i className='bx bx-plus' onClick={addBudget}></i>
                            {showForm && (
                            <div ref={formRef} className='form-container'>
                                <form className="" onSubmit={handleFormSubmit}>
                                    <select
                                        value={newBudgetCategory}
                                        onChange={(e) => setNewBudgetCategory(e.target.value)}
                                    >
                                         <option value="">Select a budget category</option>
                                        {categoriesList.map((x) => (
                                            <option key={x} value={x}>
                                                {x}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Budget Amount"
                                        value={newBudgetAmount}
                                        onChange={(e) => setNewBudgetAmount(e.target.value)}
                                    />
                                    <button type="submit">Add Budget</button>
                                </form>
                            </div>
                        )}
                        </div>
                        <ul className="task-list">
                            {categoryBudgets.map((item,index) => (
                                <li key={index}>
                                    {createNewBudgetListItem(item.category, item.amount)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    )
}