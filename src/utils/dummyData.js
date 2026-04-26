import { v4 as uuidv4 } from 'uuid';

// Create an array of dummy transactions (approximately 80 transactions)
export const dummyTransactions = [
  // January 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3200,
    date: "2023-01-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-01-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 145.75,
    date: "2023-01-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-01-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Gas Bill",
    amount: 78.50,
    date: "2023-01-12",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Dinner with Friends",
    amount: 65.30,
    date: "2023-01-15",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 450,
    date: "2023-01-20",
    category: "freelance",
    type: "income"
  },
  
  // February 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3200,
    date: "2023-02-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-02-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Valentine's Day Gift",
    amount: 120.50,
    date: "2023-02-14",
    category: "other",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Fancy Dinner",
    amount: 135.75,
    date: "2023-02-14",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 155.20,
    date: "2023-02-08",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-02-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 600,
    date: "2023-02-22",
    category: "freelance",
    type: "income"
  },
  
  // March 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3200,
    date: "2023-03-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-03-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 167.35,
    date: "2023-03-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-03-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Spring Shopping",
    amount: 245.89,
    date: "2023-03-15",
    category: "other",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Car Maintenance",
    amount: 195.50,
    date: "2023-03-18",
    category: "transportation",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Bonus Payment",
    amount: 750,
    date: "2023-03-25",
    category: "salary",
    type: "income"
  },
  
  // April 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3200,
    date: "2023-04-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-04-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 143.65,
    date: "2023-04-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-04-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Easter Celebration",
    amount: 85.45,
    date: "2023-04-09",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 520,
    date: "2023-04-15",
    category: "freelance",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Gas Bill",
    amount: 65.20,
    date: "2023-04-18",
    category: "utilities",
    type: "expense"
  },
  
  // May 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3200,
    date: "2023-05-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-05-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 125.50,
    date: "2023-05-03",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Electric Bill",
    amount: 85.20,
    date: "2023-05-05",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Subscription",
    amount: 59.99,
    date: "2023-05-07",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Dinner at Restaurant",
    amount: 78.45,
    date: "2023-05-09",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 750,
    date: "2023-05-10",
    category: "freelance",
    type: "income"
  },
  
  // June 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3200,
    date: "2023-06-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-06-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 132.75,
    date: "2023-06-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-06-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Summer Clothes",
    amount: 178.50,
    date: "2023-06-15",
    category: "other",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Summer Festival Tickets",
    amount: 120,
    date: "2023-06-18",
    category: "entertainment",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 830,
    date: "2023-06-22",
    category: "freelance",
    type: "income"
  },
  
  // July 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3300, // Got a raise
    date: "2023-07-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-07-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 145.30,
    date: "2023-07-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-07-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Beach Trip",
    amount: 325.65,
    date: "2023-07-15",
    category: "entertainment",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Air Conditioning Repair",
    amount: 150,
    date: "2023-07-20",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 680,
    date: "2023-07-25",
    category: "freelance",
    type: "income"
  },
  
  // August 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3300,
    date: "2023-08-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-08-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 138.45,
    date: "2023-08-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-08-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Vacation",
    amount: 850.75,
    date: "2023-08-15",
    category: "entertainment",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 950,
    date: "2023-08-20",
    category: "freelance",
    type: "income"
  },
  
  // September 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3300,
    date: "2023-09-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-09-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 142.65,
    date: "2023-09-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-09-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Fall Shopping",
    amount: 235.45,
    date: "2023-09-15",
    category: "other",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Car Insurance (6 months)",
    amount: 540,
    date: "2023-09-20",
    category: "transportation",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 780,
    date: "2023-09-25",
    category: "freelance",
    type: "income"
  },
  
  // October 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3300,
    date: "2023-10-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-10-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 156.35,
    date: "2023-10-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-10-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Halloween Decorations",
    amount: 85.45,
    date: "2023-10-15",
    category: "other",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Halloween Party",
    amount: 120.75,
    date: "2023-10-31",
    category: "entertainment",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 850,
    date: "2023-10-20",
    category: "freelance",
    type: "income"
  },
  
  // November 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3300,
    date: "2023-11-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-11-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 187.25,
    date: "2023-11-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-11-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Thanksgiving Dinner",
    amount: 145.50,
    date: "2023-11-23",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Black Friday Shopping",
    amount: 375.65,
    date: "2023-11-24",
    category: "other",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 920,
    date: "2023-11-20",
    category: "freelance",
    type: "income"
  },
  
  // December 2023
  {
    id: uuidv4(),
    description: "Monthly Salary",
    amount: 3300,
    date: "2023-12-01",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "Rent Payment",
    amount: 1200,
    date: "2023-12-02",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Grocery Shopping",
    amount: 198.75,
    date: "2023-12-05",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Internet Bill",
    amount: 59.99,
    date: "2023-12-10",
    category: "utilities",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Christmas Shopping",
    amount: 450.85,
    date: "2023-12-15",
    category: "other",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Christmas Dinner",
    amount: 175.25,
    date: "2023-12-25",
    category: "food",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Holiday Bonus",
    amount: 1000,
    date: "2023-12-20",
    category: "salary",
    type: "income"
  },
  {
    id: uuidv4(),
    description: "New Year's Eve Party",
    amount: 150.45,
    date: "2023-12-31",
    category: "entertainment",
    type: "expense"
  },
  {
    id: uuidv4(),
    description: "Freelance Project",
    amount: 750,
    date: "2023-12-22",
    category: "freelance",
    type: "income"
  }
];

// Create a complete data object including default categories
export const dummyData = {
  transactions: dummyTransactions,
  // We'll use the default categories from initialState
  darkMode: false
}; 