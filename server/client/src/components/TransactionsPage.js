import React, { useEffect, useState } from 'react';
import { Table } from 'reactstrap';
import axios from 'axios';
export const TransactionsPage = (props) => {
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        const getTransactions = async () => {
            try {
                console.log("display transactions page")
                const results = await axios.post('http://localhost:5000/get_transactions', {userID: props.userID});
                setTransactions(results.data);
            } catch(error){
                console.log(error);
            }
        }
        getTransactions(props.userID);
    }, []);
    
    return (
        <>
            <div className="transactions-container">
                <div className="header">
                    <h1>Transactions History</h1>
                </div>
                <div className="transactions">
                    <Table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                        {transactions.map((transaction, index) =>
                            <tr key={index}>
                                <th>{transaction.date}</th>
                                <td>{transaction.category}</td>
                                <td>{transaction.name}</td>
                                <td>${transaction.amount.toFixed(2)}</td>
                            </tr>)}
                        </tbody>
                    </Table>
                </div>

                

            </div>
        </>
    )
}