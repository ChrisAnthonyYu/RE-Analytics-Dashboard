from flask import Flask, jsonify, render_template
import pandas as pd
import os

# Initialize the Flask application
app = Flask(__name__)

# --- Helper Function to Load Data ---
def load_data():
    """Loads all necessary CSV files from the 'Data Source' directory."""
    data_path = 'Data Source/'
    files = {
        'trial_balance': 'Trial_Balance.csv',
        'mapping': 'Mapping_FSaccounts.csv',
        'properties': 'Properties.csv'
    }
    dataframes = {}
    for name, filename in files.items():
        try:
            # Clean up column names by stripping leading/trailing whitespace
            df = pd.read_csv(os.path.join(data_path, filename))
            df.columns = df.columns.str.strip()
            dataframes[name] = df
        except FileNotFoundError:
            # Return an error if a file is missing
            return {'error': f'File not found: {filename}'}
    return dataframes

# --- API Endpoint for the Income Statement ---
@app.route('/api/income_statement')
def get_income_statement():
    """Processes data and returns a structured Income Statement."""
    # 1. Load the data
    data = load_data()
    if 'error' in data:
        return jsonify(data), 404

    tb = data['trial_balance']
    mapping = data['mapping']

    # 2. Prepare the data
    # Ensure numeric columns are treated as such
    tb['Ending Balance'] = pd.to_numeric(tb['Ending Balance'], errors='coerce').fillna(0)
    tb['Account ID'] = tb['Account ID'].str.strip()
    mapping['Account_ID from'] = mapping['Account_ID from'].str.strip()
    mapping['Account_ID to'] = mapping['Account_ID to'].str.strip()

    # 3. Filter for Income Statement accounts from the mapping file
    is_mapping = mapping[mapping['FS'] == 'Income Statement'].sort_values('Order_IS')

    income_statement = {
        'Revenue': {'items': {}, 'total': 0},
        'Expenses': {'items': {}, 'total': 0},
        'Net Operating Income': 0,
        'Net Income': 0 # Simplified for this example
    }

    # 4. Calculate the financial statement
    for index, row in is_mapping.iterrows():
        # Get all accounts within the specified range
        accounts_in_range = tb[
            (tb['Account ID'] >= row['Account_ID from']) &
            (tb['Account ID'] <= row['Account_ID to'])
        ]
        
        # Sum the ending balances for these accounts
        total_balance = accounts_in_range['Ending Balance'].sum()

        # Assign to the correct section (Revenue or Expenses)
        group = row['Summary Grouping']
        account_name = row['Account']

        if group in ['Revenue', 'Other Income']:
            # Revenues are typically credits, so we invert the sign for display
            income_statement['Revenue']['items'][account_name] = -total_balance
            income_statement['Revenue']['total'] -= total_balance
        elif group in ['Expenses', 'Other Expenses']:
            income_statement['Expenses']['items'][account_name] = total_balance
            income_statement['Expenses']['total'] += total_balance
            
    # 5. Calculate final totals
    income_statement['Net Operating Income'] = income_statement['Revenue']['total'] - income_statement['Expenses']['total']
    income_statement['Net Income'] = income_statement['Net Operating Income'] # Simplified

    return jsonify(income_statement)

# --- Frontend Route ---
@app.route('/')
def dashboard():
    """Serves the main dashboard HTML page."""
    # We will create this HTML file in the next step
    return render_template('index.html')

if __name__ == '__main__':
    # Run the Flask app
    app.run(debug=True)