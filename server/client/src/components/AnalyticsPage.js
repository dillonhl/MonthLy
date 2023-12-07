import { Table } from 'reactstrap';
import React, { useEffect, useState } from 'react';

// Needed to map month to number from data ex. 2023-11 = November
const monthMapping = {
    '1': 'January',
    '2': 'February',
    '3': 'March',
    '4': 'April',
    '5': 'May',
    '6': 'June',
    '7': 'July',
    '8': 'August',
    '9': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December',
  };
 

export const AnalyticsPage = (props) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // Months are zero-based, so add 1
    const currentYear = today.getFullYear();
    //const yearMonthString = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
    
    const [highestCategories, setHighestCategories] = useState({});
    const [year, setYear] = useState(currentYear);

    useEffect(() => {
        const maxEntry = (entries) => {
            let highest = { category: null, amount: -Infinity}
            for (const category in entries) {
                const amount = entries[category];
                if (amount > highest.amount) {
                    highest = {category, amount};
                }
            }
            return highest;
        }
        const getHighestCategory = () => {
            const highestCategories = {};
            for (const month in props.aggregatedData) {
                const entries = props.aggregatedData[month];
                // Find the entry with the highest amount
                const highestEntry = maxEntry(entries);
                highestCategories[month] = {
                    category: highestEntry.category,
                    amount: highestEntry.amount
                };
            }
            console.log(highestCategories)
            setHighestCategories(highestCategories);
        }
    
        getHighestCategory();
    }, []);

    const handleYearButton = (selectedYear) => {
        setYear(selectedYear);
      };

    const renderTableRows = () => {
        
        const yearData = Object.entries(highestCategories)
        .filter(([entryKey]) => entryKey.startsWith(`${year}-`));
        console.log(yearData)
        
        const rows = yearData.map(([month, data]) => (
            data.category !== null ? (
                <tr key={month}>
                    <td>{monthMapping[month.split('-')[1]]}</td>
                    <td>{data.category}</td>
                    <td>{data.amount.toFixed(2)}</td>
                </tr>
                ) : null
        ));
        return rows;
    }

    return (
        <>
            <div className="analytics-container">
                <div className="header">
                    <h1>Analytics</h1>
                </div>
                <div className="analytics">
                    <button onClick={() => handleYearButton(currentYear)} 
                        style={{backgroundColor : year === currentYear ? '#181a1e' : '#fbfbfb',
                            color : year === currentYear ? '#fbfbfb' : '#181a1e' }}>
                                {currentYear} 
                    </button>
                    <button onClick={() => handleYearButton(currentYear-1)}
                        style={{backgroundColor : year === currentYear-1 ? '#181a1e' : '#fbfbfb',
                            color : year === currentYear-1 ? '#fbfbfb' : '#181a1e' }}>
                                {currentYear-1}</button>
                    <Table>
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Highest Category</th>
                                <th>Amount Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderTableRows()}
                        </tbody>
                    </Table>
                </div>
            </div>
        </>
    )
}