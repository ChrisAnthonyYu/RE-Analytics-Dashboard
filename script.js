// script.js
const appData = {
    cashflowData: new Map()
};
let availableYears = [2023, 2024, 2025];
let cashflowYears = [];
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/ChrisAnthonyYu/RE-Analytics-Dashboard/main/Data%20Source/';
const FILE_NAMES = { 
    PROPERTIES:'Properties.csv', LOANS:'Loans.csv', LOAN_INFO:'Loan_Information.csv',
    TRIAL_BALANCE: 'Trial_Balance.csv', MAPPING: 'Mapping_FSaccounts.csv',
    RENTROLL_MONTHLY: 'RentRoll_Monthly.csv', 
    RENTROLL_ANNUAL: 'RentRoll_Annual.csv'
};
const REQUIRED_FILES = Object.values(FILE_NAMES);
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

document.addEventListener('DOMContentLoaded', ()=>{ 
    loadDataFromGithub(); 

    // Event listener for Cashflow Report toggle
    document.getElementById('toggleAllBtn').addEventListener('click', () => {
        const reportTable = document.querySelector('#cashflowReportContainer .report-table');
        const allDetailRows = document.querySelectorAll('#cashflowReportContainer .account-row[data-group]');
        if (!reportTable || allDetailRows.length === 0) return;
        const isCurrentlyCollapsed = reportTable.classList.contains('collapsed-view');
        const shouldCollapse = !isCurrentlyCollapsed;
        allDetailRows.forEach(row => row.classList.toggle('collapsed', shouldCollapse));
        reportTable.classList.toggle('collapsed-view', shouldCollapse);
        toggleAllBtn.textContent = shouldCollapse ? 'Expand All' : 'Collapse All';
    });

    // Event listener for Loan Schedule toggle
    document.getElementById('toggleScheduleBtn').addEventListener('click', () => {
        const scheduleRows = document.querySelectorAll('#loanScheduleContainer .past-transaction');
        const toggleBtn = document.getElementById('toggleScheduleBtn');
        if (scheduleRows.length === 0) return;
        const isCurrentlyCollapsed = scheduleRows[0].classList.contains('collapsed');
        const shouldCollapse = !isCurrentlyCollapsed;
        scheduleRows.forEach(row => row.classList.toggle('collapsed', shouldCollapse));
        toggleBtn.textContent = shouldCollapse ? 'Expand All' : 'Collapse Past';
    });
});

function updateActiveTabView() {
    const activeTabId = document.querySelector('.tab-content.active')?.id;
    if (activeTabId === 'home') {
        renderHomeView();
    } else if (activeTabId === 'cashflow-overview') {
        renderCashflowOverview();
    }
}

function showTab(id, el){
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('cashflowSubNav').style.display = (id === 'cashflow-overview') ? 'block' : 'none';
  
  updateGlobalYearFilterForTab(id);
  updateActiveTabView(); 
  
  if(id === 'cashflow-overview') {
      const activeSubTab = document.querySelector('.sub-nav-tab.active');
      if (!activeSubTab) {
        showCashflowSubTab('cf-overview', document.querySelector('.sub-nav-tab'));
      }
  }
}

function showCashflowSubTab(id, el) {
    document.querySelectorAll('.sub-tab-content').forEach(x => x.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.sub-nav-tab').forEach(x => x.classList.remove('active'));
    if(el) el.classList.add('active');
    const propId = document.getElementById('globalProperty').value;
    if (propId === 'all') return;
    renderCashflowOverview();
}

async function loadDataFromGithub() {
    const homeContentBody = document.querySelector('#homeContent .card-body');
    try {
        const promises = REQUIRED_FILES.map(file => {
            const url = GITHUB_BASE_URL + file;
            return fetch(url).then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${file}: ${response.status} ${response.statusText}`);
                }
                return response.text();
            }).then(text => new Promise(resolve => {
                Papa.parse(text, {
                    header: true, skipEmptyLines: true, dynamicTyping: true,
                    transformHeader: h => h.trim().toLowerCase().replace(/ /g, '_'),
                    complete: result => resolve({ name: file, data: result.data })
                });
            }));
        });
        const results = await Promise.all(promises);
        results.forEach(r => {
            const key = Object.keys(FILE_NAMES).find(k => FILE_NAMES[k] === r.name);
            if (key) appData[key.toLowerCase()] = r.data;
        });
        if (appData.loans && appData.loans.length > 0) {
            cashflowYears = [...new Set(appData.loans.map(item => item.year))].filter(Boolean).sort((a, b) => b - a);
        }
        populateGlobalFilters();
        updateGlobalYearFilterForTab('home');
        renderHomeView();
    } catch (error) {
        console.error("Data loading failed:", error);
        homeContentBody.innerHTML = `<div class="loading" style="color: var(--color-error);"><strong>Error:</strong> Could not load data. Please check console (F12) for details.</div>`;
    }
}

function populateGlobalFilters(){
  const propSel=document.getElementById('globalProperty');
  propSel.innerHTML='<option value="all">All Properties</option>';
  (appData.properties||[]).forEach(p=>{propSel.innerHTML+=`<option value="${p.property_id}">${p.properties||p.property}</option>`;});
  const monthSel=document.getElementById('globalMonth');
  monthSel.innerHTML='<option value="all">All Months</option>';
  MONTH_NAMES.forEach((m,i)=>monthSel.innerHTML+=`<option value="${i+1}">${m}</option>`);
  document.getElementById('globalProperty').value = 'all';
  document.getElementById('globalMonth').value = 'all';
}

function updateGlobalYearFilterForTab(tabId) {
    const yearSelect = document.getElementById('globalYear'); const currentValue = yearSelect.value;
    let newOptions = (tabId === 'cashflow-overview') ? cashflowYears : availableYears;
    yearSelect.innerHTML = '<option value="all">All Years</option>';
    let selectedValueExists = false;
    newOptions.sort((a,b)=>b-a).forEach(y => {
        const isSelected = String(y) === String(currentValue);
        if(isSelected) selectedValueExists = true;
        yearSelect.innerHTML += `<option value="${y}" ${isSelected ? 'selected' : ''}>${y}</option>`;
    });
    if (!selectedValueExists) { yearSelect.value = 'all'; }
}

function onGlobalFiltersChange(){
  updateActiveTabView();
}

function renderHomeView(){
  const body=document.querySelector('#homeContent .card-body');
  const [p, y, m] = [document.getElementById('globalProperty').value, document.getElementById('globalYear').value, document.getElementById('globalMonth').value];
  body.innerHTML=`Filters applied: Property ${p}, Year ${y}, Month ${m}`;
}

function renderCashflowOverview(){
  const propId = document.getElementById('globalProperty').value;
  const year = document.getElementById('globalYear').value;
  const month = document.getElementById('globalMonth').value;
  const cfContent = document.getElementById('cfContentContainer');
  const msg = document.getElementById('cfMessage');

  if(propId === 'all'){
    cfContent.style.display='none'; 
    msg.style.display='block';
    msg.textContent='Please select a property to view Cashflow Analytics.';
    return;
  }
  
  msg.style.display='none'; 
  cfContent.style.display='block';

  const prop = (appData.properties||[]).find(p=>String(p.property_id).toLowerCase()===String(propId).toLowerCase());
  const loans = (appData.loan_info||[]).filter(l=>String(l.property_id).toLowerCase()===String(propId).toLowerCase());
  const loanForAddress = loans.length > 0 ? loans[0] : null;
  document.getElementById('cf-property-name').textContent=prop?.properties||prop?.property||'-';
  document.getElementById('cf-property-address').textContent=loanForAddress?.address || prop?.address || '-';
  document.getElementById('cf-property-type').textContent=prop?.property_type||'-';
  document.getElementById('cf-property-owner').textContent=prop?.owner||'-';
  
  appData.cashflowData = calculateCashflowData(propId, year);
  
  const activeSubTab = document.querySelector('.sub-tab-content.active');
  if (activeSubTab) {
      switch(activeSubTab.id) {
          case 'cf-overview': 
              renderOverviewKPIs(year, month);
              renderOverviewLoanPaymentCard(propId, year, month);
              break;
          case 'cf-cashflow': renderCashflowReportTable(propId, year); break;
          case 'cf-loan-schedule': renderLoanScheduleTable(propId, year, month); break;
          case 'cf-rent-roll': renderRentRollTable(); break;
          case 'cf-interest-sensitivity':
              renderInterestRateSensitivity();
              break;
      }
  }
}

function renderOverviewKPIs(year, month) {
    const container = document.getElementById('overview-kpi-cards');
    container.innerHTML = '';

    if (month === 'all' || year === 'all' || !appData.cashflowData.size) {
        container.innerHTML = '<div class="loading" style="grid-column: 1 / -1;">Please select a specific month and year for an overview.</div>';
        return;
    }
    
    const monthIndex = parseInt(month, 10) - 1;

    const kpiData = [
        { title: 'Total Income', value: appData.cashflowData.get('rev_total')?.monthlyValues[monthIndex] || 0 },
        { title: 'Operating Expense', value: appData.cashflowData.get('exp_total')?.monthlyValues[monthIndex] || 0 },
        { title: 'Net Operating Income', value: appData.cashflowData.get('noi')?.monthlyValues[monthIndex] || 0 },
        { title: 'Net Income', value: appData.cashflowData.get('ni')?.monthlyValues[monthIndex] || 0 },
        { title: 'Cashflow', value: appData.cashflowData.get('cf')?.monthlyValues[monthIndex] || 0 }
    ];

    kpiData.forEach(kpi => {
        const previousValue = 0; // The previous value is not in the data, so it will be hardcoded to 0 for now.
        const percentageChange = previousValue !== 0 ? ((kpi.value - previousValue) / previousValue) * 100 : 0;
        const trendColor = kpi.value > previousValue ? 'green' : (kpi.value < previousValue ? 'red' : 'gray');
        const changeArrow = kpi.value > previousValue ? '▲' : (kpi.value < previousValue ? '▼' : '-');

        container.innerHTML += `
            <div class="card info-card">
                <div class="card-header">${kpi.title}</div>
                <div class="card-body">
                    <div class="info-item main-value"><span class="value">${formatCurrency(kpi.value)}</span></div>
                </div>
            </div>
        `;
    });
}

function renderOverviewLoanPaymentCard(propId, year, month) {
    const container = document.getElementById('overview-loan-payment-card-container');
    container.innerHTML = '';
    if (month === 'all' || year === 'all') { return; }

    const property = (appData.properties||[]).find(p => String(p.property_id) === String(propId));
    if (!property) { return; }
    const propertyName = (property.properties || property.property || '').trim().toLowerCase();
    
    const loans = appData.loans || [];
    const selectedMonthName = MONTH_NAMES[parseInt(month) - 1];
    const paymentData = loans.find(loan => 
        (loan.property || '').trim().toLowerCase() === propertyName &&
        String(loan.year) === year && 
        String(loan.month).trim().toLowerCase() === selectedMonthName.trim().toLowerCase()
    );

    let cardHTML = `
        <div class="card info-card">
            <div class="card-header">Current Month Loan Payment</div>
            <div class="card-body">`;

    if (paymentData) {
        const summaryItems = [
            { label: 'Beginning Balance', value: formatCurrency(paymentData.beginning_balance) },
            { label: 'Ending Balance', value: formatCurrency(paymentData.ending_balance) },
            { label: 'Scheduled Payment', value: formatCurrency(paymentData.scheduled_payment) },
            { label: 'Total Payment', value: formatCurrency(paymentData.total_payment) },
            { label: 'Principal', value: formatCurrency(paymentData.principal) },
            { label: 'Interest', value: formatCurrency(paymentData.interest) },
        ];
        cardHTML += '<div class="loan-summary-grid-new"><div class="summary-column">';
        const half = Math.ceil(summaryItems.length / 2);
        summaryItems.slice(0, half).forEach(item => { cardHTML += `<div class="summary-item-new"><span class="label">${item.label}:</span><span class="value">${item.value}</span></div>`; });
        cardHTML += '</div><div class="summary-separator"></div><div class="summary-column">';
        summaryItems.slice(half).forEach(item => { cardHTML += `<div class="summary-item-new"><span class="label">${item.label}:</span><span class="value">${item.value}</span></div>`; });
        cardHTML += '</div></div>';
    } else {
        cardHTML += '<div class="loading">No loan payment data for this month.</div>';
    }

    cardHTML += '</div></div>';
    container.innerHTML = cardHTML;
}

function renderLoanScheduleTable(propId, year, month) {
    const summaryContainer = document.getElementById('loanSummaryCardContainer');
    const scheduleContainer = document.getElementById('loanScheduleContainer');
    summaryContainer.innerHTML = ''; 
    scheduleContainer.innerHTML = '';

    const property = (appData.properties||[]).find(p => String(p.property_id) === String(propId));
    if (!property) { scheduleContainer.innerHTML = '<div class="loading">Property not found.</div>'; return; }
    
    const loanInfo = (appData.loan_info||[]).find(l => String(l.property_id) === String(propId));
    if (!loanInfo) { 
        summaryContainer.innerHTML = '<div class="loading card">Loan summary information not found.</div>';
        scheduleContainer.innerHTML = '<div class="loading">Loan schedule information not found.</div>';
        return; 
    }

    const propertyName = property.properties || property.property;
    const filteredLoans = (appData.loans || []).filter(loan => 
        String(loan.property).trim().toLowerCase() === String(propertyName).trim().toLowerCase()
    );

    if (filteredLoans.length === 0) {
        summaryContainer.innerHTML = '<div class="loading card">Loan summary not available.</div>';
        scheduleContainer.innerHTML = `<div class="loading">No loan schedule data found for ${propertyName}.</div>`;
        return;
    }

    const selectedMonthName = (month !== 'all') ? MONTH_NAMES[parseInt(month) - 1] : null;
    const highlightedRowData = filteredLoans.find(loan => String(loan.year) === year && String(loan.month).trim().toLowerCase() === String(selectedMonthName).trim().toLowerCase());
    const lastPayment = filteredLoans[filteredLoans.length - 1];

    const summaryItems = [
        { label: 'Loan Amount', value: formatCurrency(loanInfo.loan_amount) }, { label: 'Loan Period in Years', value: `${loanInfo.term || '-'} years` },
        { label: 'Start Date of Loan', value: filteredLoans[0]?.payment_date || '-' }, { label: 'Lender Name', value: loanInfo.banker || '-' },
        { label: 'Scheduled Payment', value: formatCurrency(highlightedRowData?.scheduled_payment || filteredLoans[0]?.scheduled_payment) }, { label: 'Actual Number of Payments', value: lastPayment?.pmt_no || '-' },
        { label: 'Annual Interest Rate', value: `${Number(loanInfo.rate || 0).toFixed(2)}%` }, { label: 'Number of Payments per Year', value: '12' },
        { label: 'Scheduled Number of Payments', value: lastPayment?.pmt_no || '-' }, { label: 'Total Interest', value: formatCurrency(filteredLoans.reduce((sum, row) => sum + parseCurrency(row.interest), 0)) },
    ];
    
    let summaryHTML = `<div class="card info-card"><div class="card-header">Loan Summary</div><div class="card-body"><div class="loan-summary-grid-new"><div class="summary-column">`;
    const half = Math.ceil(summaryItems.length / 2);
    summaryItems.slice(0, half).forEach(item => { summaryHTML += `<div class="summary-item-new"><span class="label">${item.label}:</span><span class="value">${item.value}</span></div>`; });
    summaryHTML += '</div><div class="summary-separator"></div><div class="summary-column">';
    summaryItems.slice(half).forEach(item => { summaryHTML += `<div class="summary-item-new"><span class="label">${item.label}:</span><span class="value">${item.value}</span></div>`; });
    summaryHTML += '</div></div></div></div>';
    summaryContainer.innerHTML = summaryHTML;

    const headers = ['Pmt No', 'Payment Date', 'Month', 'Year', 'Beginning Balance', 'Scheduled Payment', 'Total Payment', 'Principal', 'Interest', 'Ending Balance'];
    const currencyColumns = ['beginning_balance', 'scheduled_payment', 'total_payment', 'principal', 'interest', 'ending_balance'];
    
    let tableHTML = `<table class="report-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
    
    const cutoffDate = (year !== 'all' && month !== 'all') ? new Date(parseInt(year), parseInt(month) - 1, 1) : null;
    let isInitiallyCollapsed = !!cutoffDate;
    
    filteredLoans.forEach(loan => {
        const isHighlighted = (String(loan.year) === year && String(loan.month).trim().toLowerCase() === String(selectedMonthName).trim().toLowerCase());
        const loanDate = new Date(loan.payment_date);
        let rowClass = isHighlighted ? 'highlight-loan-row' : '';
        if (cutoffDate && loanDate < cutoffDate) rowClass += ' past-transaction collapsed';
        tableHTML += `<tr class="${rowClass.trim()}">`;
        headers.forEach(header => {
            const key = header.toLowerCase().replace(/ /g, '_');
            let value = loan[key] != null ? loan[key] : '-';
            if (currencyColumns.includes(key)) value = formatCurrency(value);
            tableHTML += `<td>${value}</td>`;
        });
        tableHTML += `</tr>`;
    });

    tableHTML += `</tbody></table>`;
    scheduleContainer.innerHTML = tableHTML;
    document.getElementById('toggleScheduleBtn').textContent = isInitiallyCollapsed ? 'Expand All' : 'Collapse Past';
    const highlightedEl = scheduleContainer.querySelector('.highlight-loan-row');
    if (highlightedEl) highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function evaluateFormula(formula, reportMap) {
    if (!formula) return Array(12).fill(0);
    const terms = formula.split(/([+\-])/);
    let totalMonthlyValues = Array(12).fill(0), currentOperator = '+';
    terms.forEach(term => {
        term = term.trim();
        if (term === '+' || term === '-') { currentOperator = term; } 
        else if (term) {
            const values = reportMap.get(term)?.monthlyValues || Array(12).fill(0);
            totalMonthlyValues = totalMonthlyValues.map((v, i) => currentOperator === '+' ? v + values[i] : v - values[i]);
        }
    });
    return totalMonthlyValues;
}

function parseCurrency(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    const number = Number(value.replace(/[^0-9.-]+/g, ""));
    return isFinite(number) ? number : 0;
}

function calculateCashflowData(propId, year) {
    const reportMap = new Map();
    if (year === 'all') return reportMap;
    const filteredTB = (appData.trial_balance || []).filter(row => String(row.property_id).toLowerCase() === String(propId).toLowerCase() && +row.year === +year);
    if (filteredTB.length === 0) return reportMap;
    const mapping = (appData.mapping || []).filter(item => item.order_cf).sort((a, b) => a.order_cf - b.order_cf);
    mapping.forEach(item => reportMap.set(item.account_ref, { ...item, accounts: {}, monthlyValues: Array(12).fill(0) }));
    filteredTB.forEach(tbRow => {
        const group = [...reportMap.values()].find(g => tbRow.account_id >= g.account_id_from && tbRow.account_id <= g.account_id_to);
        if (group) {
            const accountName = tbRow.accounts;
            if (!group.accounts[accountName]) group.accounts[accountName] = { label: accountName, accountId: tbRow.account_id, monthlyValues: Array(12).fill(0) };
            const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === String(tbRow.month).trim().toLowerCase());
            if (monthIndex !== -1) {
                const normalBalance = group.normal_balance?.toLowerCase(), debit = parseCurrency(tbRow.debit), credit = parseCurrency(tbRow.credit);
                let activityAmount = (group.fs === 'Income Statement') ? ((normalBalance === 'debit') ? (debit - credit) : (credit - debit)) : (credit - debit);
                group.accounts[accountName].monthlyValues[monthIndex] += activityAmount;
            }
        }
    });
    reportMap.forEach(group => {
        if (Object.keys(group.accounts).length > 0) {
            group.monthlyValues = Object.values(group.accounts).reduce((totals, account) => {
                account.monthlyValues.forEach((val, i) => totals[i] += val);
                return totals;
            }, Array(12).fill(0));
        }
    });
    mapping.forEach(group => {
        if (group.calculation_formula) {
            const calculatedValues = evaluateFormula(group.calculation_formula, reportMap);
            if (reportMap.has(group.account_ref)) reportMap.get(group.account_ref).monthlyValues = calculatedValues;
        }
    });
    return reportMap;
}

function renderCashflowReportTable(propId, year) {
    const container = document.getElementById('cashflowReportContainer');
    if (year === 'all') { container.innerHTML = `<div class="loading">Please select a specific year to view the Cashflow Report.</div>`; return; }
    const reportMap = appData.cashflowData;
    if (!reportMap || reportMap.size === 0) { container.innerHTML = `<div class="loading">No cashflow data available for the selected property and year.</div>`; return; }
    const mapping = (appData.mapping || []).filter(item => item.order_cf).sort((a, b) => a.order_cf - b.order_cf);
    const HIGHLIGHT_ACCOUNT_REFS = ['rev_total', 'exp_total', 'noi', 'ni', 'adj_total', 'cf'];
    const adjTotalMapping = mapping.find(m => m.account_ref === 'adj_total');
    const adjustmentChildrenRefs = adjTotalMapping ? adjTotalMapping.calculation_formula.split(/[+\-]/).map(t => t.trim()) : [];
    const isInitiallyCollapsed = true;
    let tableHTML = `<table class="report-table ${isInitiallyCollapsed ? 'collapsed-view' : ''}"><thead><tr><th>Account</th>${MONTH_NAMES_SHORT.map(m => `<th>${m}</th>`).join('')}<th>Total</th></tr></thead><tbody>`;
    reportMap.forEach(group => {
        if (adjustmentChildrenRefs.includes(group.account_ref)) return;
        const childAccounts = Object.values(group.accounts).sort((a, b) => String(a.accountId).localeCompare(String(b.accountId)));
        childAccounts.forEach(account => {
            const total = account.monthlyValues.reduce((a, b) => a + b, 0);
            const collapsedClass = isInitiallyCollapsed ? 'collapsed' : '';
            tableHTML += `<tr class="account-row ${collapsedClass}" data-group="${group.account_ref}"><td>${account.label}</td>`;
            account.monthlyValues.forEach(value => tableHTML += `<td>${formatNumber(value)}</td>`);
            tableHTML += `<td>${formatNumber(total)}</td></tr>`;
        });
        if (group.account_ref === 'adj_total') {
            adjustmentChildrenRefs.forEach(childRef => {
                const childGroup = reportMap.get(childRef);
                if (!childGroup) return;
                const total = childGroup.monthlyValues.reduce((a, b) => a + b, 0);
                const collapsedClass = isInitiallyCollapsed ? 'collapsed' : '';
                tableHTML += `<tr class="account-row ${collapsedClass}" data-group="adj_total"><td>${childGroup.account}</td>`;
                childGroup.monthlyValues.forEach(value => tableHTML += `<td>${formatNumber(value)}</td>`);
                tableHTML += `<td>${formatNumber(total)}</td></tr>`;
            });
        }
        const total = group.monthlyValues.reduce((a, b) => a + b, 0);
        let rowClass = '';
        if (HIGHLIGHT_ACCOUNT_REFS.includes(group.account_ref)) rowClass = 'highlight-row';
        else if (childAccounts.length > 0 || group.account_ref === 'adj_total') rowClass = 'group-header-row';
        if (rowClass) {
            tableHTML += `<tr class="${rowClass}"><td>${group.account}</td>`;
            group.monthlyValues.forEach(value => tableHTML += `<td>${formatNumber(value)}</td>`);
            tableHTML += `<td>${formatNumber(total)}</td></tr>`;
        }
    });
    tableHTML += `</tbody></table>`;
    let monthFilter = document.getElementById('globalMonth').value;
    let monthName = (monthFilter !== 'all') ? MONTH_NAMES[parseInt(monthFilter) - 1] : "December";
    const filteredTB = (appData.trial_balance || []).filter(row => String(row.property_id).toLowerCase() === String(propId).toLowerCase() && +row.year === +year);
    const monthlyTB = filteredTB.filter(r => String(r.month).trim().toLowerCase() === monthName.toLowerCase());
    const operatingCashAccounts = monthlyTB.filter(r => r.account_id >= '1100-0000' && r.account_id <= '1145-0000');
    let reconHTML = `<table class="report-table cash-recon-table"><thead><tr><th>MONTH TO DATE</th><th>BEGINNING BALANCE</th><th>ENDING BALANCE</th><th>DIFFERENCE</th></tr></thead><tbody>`;
    let totalBegin = 0, totalEnd = 0;
    operatingCashAccounts.forEach(acc => {
        const begin = parseCurrency(acc.beginning_balance), end = parseCurrency(acc.ending_balance), diff = end - begin;
        totalBegin += begin; totalEnd += end;
        reconHTML += `<tr><td>${acc.accounts}</td><td>${formatCurrency(begin)}</td><td>${formatCurrency(end)}</td><td>${formatCurrency(diff)}</td></tr>`;
    });
    const totalDiff = totalEnd - totalBegin;
    reconHTML += `<tr class="highlight-row"><td>TOTAL CASH</td><td>${formatCurrency(totalBegin)}</td><td>${formatCurrency(totalEnd)}</td><td>${formatCurrency(totalDiff)}</td></tr>`;
    reconHTML += `</tbody></table>`;
    container.innerHTML = tableHTML + reconHTML;
    document.getElementById('toggleAllBtn').textContent = isInitiallyCollapsed ? 'Expand All' : 'Collapse All';
}

function renderRentRollTable() {
    const container = document.getElementById('rentRollCardsContainer');
    const propId = document.getElementById('globalProperty').value;
    const property = (appData.properties || []).find(p => String(p.property_id) === String(propId));
    if (!property) { container.innerHTML = ''; return; }
    const propertyName = (property.properties || property.property || '').trim().toLowerCase();

    const monthlyData = (appData.rentroll_monthly || []).find(row => (row.property || '').trim().toLowerCase() === propertyName);
    const annualData = (appData.rentroll_annual || []).find(row => (row.property || '').trim().toLowerCase() === propertyName);

    if (!monthlyData || !annualData) {
        container.innerHTML = '<div class="loading" style="grid-column: 1 / -1;">Summary data not found in RentRoll_Monthly.csv or RentRoll_Annual.csv.</div>';
        return;
    }

    const rentPremium = monthlyData.market_rent ? ((monthlyData.tenant_rent - monthlyData.market_rent) / monthlyData.market_rent) : 0;
    const annualTotalIncome = (annualData.tenant_rent || 0) + (annualData.cam || 0) + (annualData.misc || 0);

    container.innerHTML = `
        <div class="card info-card">
            <div class="card-header">Property Details</div>
            <div class="card-body">
                <div class="info-item"><span class="label">Total Units:</span><span class="value">${formatNumber(monthlyData.total_units)}</span></div>
                <div class="info-item"><span class="label">Total Square Footage:</span><span class="value">${formatNumber(monthlyData.sq_footage)} sq ft</span></div>
                <div class="info-item"><span class="label">Property Type:</span><span class="value">${property.property_type || '-'}</span></div>
            </div>
        </div>
        <div class="card info-card">
            <div class="card-header">Monthly Rent Details</div>
            <div class="card-body">
                <div class="info-item"><span class="label">Market Rent:</span><span class="value">${formatCurrency(monthlyData.market_rent)}</span></div>
                <div class="info-item"><span class="label">Actual Tenant Rent:</span><span class="value">${formatCurrency(monthlyData.tenant_rent)}</span></div>
                <div class="info-item"><span class="label">CAM Charges:</span><span class="value">${formatCurrency(monthlyData.cam)}</span></div>
                <div class="info-item"><span class="label">Rent Premium:</span><span class="value">${formatPercent(rentPremium)}</span></div>
                <div class="info-item"><span class="label">Rent per Sq Ft:</span><span class="value">${formatCurrency(monthlyData.tenant_rent_per_sqft)}</span></div>
            </div>
        </div>
        <div class="card info-card">
            <div class="card-header">Annual Rent Details</div>
            <div class="card-body">
                <div class="info-item"><span class="label">Annual Market Rent:</span><span class="value">${formatCurrency(annualData.market_rent)}</span></div>
                <div class="info-item"><span class="label">Annual Tenant Rent:</span><span class="value">${formatCurrency(annualData.tenant_rent)}</span></div>
                <div class="info-item"><span class="label">Annual CAM Charges:</span><span class="value">${formatCurrency(annualData.cam)}</span></div>
                <div class="info-item"><span class="label">Total Annual Income:</span><span class="value">${formatCurrency(annualTotalIncome)}</span></div>
            </div>
        </div>
    `;
}

function renderInterestRateSensitivity() {
    const propId = document.getElementById('globalProperty').value;
    const year = document.getElementById('globalYear').value;
    const month = document.getElementById('globalMonth').value;
    const mainCardBody = document.querySelector('#cf-interest-sensitivity .card-body');
    let container = document.getElementById('interestSensitivityContainer');
    
    if (month === 'all' || year === 'all' || propId === 'all') {
        if (container) container.style.display = 'none';
        if (!mainCardBody.querySelector('.loading')) {
            mainCardBody.innerHTML = '<div class="loading">Please select a specific property, month, and year to view the DSCR and sensitivity analysis.</div>';
        }
        return;
    }
    
    if (!container) {
        mainCardBody.innerHTML = `
            <div id="interestSensitivityContainer">
                <div class="card dscr-card">
                    <div class="card-header">Debt Service Coverage Ratio (DSCR)</div>
                    <div class="card-body dscr-card-body">
                        <div class="dscr-value-container">
                            <span class="dscr-label">DSCR</span>
                            <span id="dscr-value" class="dscr-main-value">0.00</span>
                        </div>
                        <div class="dscr-details-container">
                            <div class="dscr-item"><span class="label">NOI:</span><span class="value" id="dscr-noi">-</span></div>
                            <div class="dscr-item"><span class="label">Debt Service:</span><span class="value" id="dscr-debt-service">-</span></div>
                            <div class="dscr-item sub-item"><span class="label">Principal:</span><span class="value" id="dscr-principal">-</span></div>
                            <div class="dscr-item sub-item"><span class="label">Interest:</span><span class="value" id="dscr-interest">-</span></div>
                        </div>
                    </div>
                </div>
                <div class="dscr-input-container">
                    <label for="userInputRate">User Input Interest Rate (%):</label>
                    <input type="number" id="userInputRate" step="0.01" onchange="renderInterestRateSensitivity()" onkeyup="renderInterestRateSensitivity()">
                </div>
                <div id="analysisInputsContainer" class="analysis-inputs" style="display: none;"></div>
                <div id="sensitivityTableContainer" class="card" style="display:none;"></div>
            </div>`;
        container = document.getElementById('interestSensitivityContainer');
    } else {
        mainCardBody.querySelector('.loading')?.remove();
        container.style.display = 'block';
    }
    
    const sensitivityContainer = document.getElementById('sensitivityTableContainer');
    const analysisInputsContainer = document.getElementById('analysisInputsContainer');

    const monthIndex = parseInt(month, 10) - 1;
    const noiData = appData.cashflowData.get('noi');
    const monthlyNOI = noiData ? noiData.monthlyValues[monthIndex] : 0;
    
    const property = (appData.properties || []).find(p => String(p.property_id) === String(propId));
    const loanInfo = (appData.loan_info || []).find(l => String(l.property_id) === String(propId));
    
    if (!property || !loanInfo) {
        document.getElementById('dscr-value').textContent = 'N/A';
        document.getElementById('dscr-noi').textContent = formatCurrency(monthlyNOI);
        document.getElementById('dscr-debt-service').textContent = '-';
        document.getElementById('dscr-principal').textContent = '-';
        document.getElementById('dscr-interest').textContent = '-';
        sensitivityContainer.style.display = 'none';
        analysisInputsContainer.style.display = 'none';
        return;
    }

    analysisInputsContainer.innerHTML = `
        Analysis based on: 
        <span>Loan Amount: ${formatCurrency(loanInfo.loan_amount)}</span> | 
        <span>Loan Term: ${loanInfo.term} years</span>
    `;
    analysisInputsContainer.style.display = 'block';

    const propertyName = (property.properties || property.property || '').trim().toLowerCase();
    const selectedMonthName = MONTH_NAMES[monthIndex];
    const paymentData = (appData.loans || []).find(loan =>
        (loan.property || '').trim().toLowerCase() === propertyName &&
        String(loan.year) === year &&
        String(loan.month).trim().toLowerCase() === selectedMonthName.trim().toLowerCase()
    );

    const principal = paymentData ? parseCurrency(paymentData.principal) : 0;
    const interest = paymentData ? parseCurrency(paymentData.interest) : 0;
    const debtService = principal + interest;
    const dscr = debtService !== 0 ? monthlyNOI / debtService : 0;

    document.getElementById('dscr-value').textContent = formatDSCR(dscr);
    document.getElementById('dscr-noi').textContent = formatCurrency(monthlyNOI);
    document.getElementById('dscr-debt-service').textContent = formatCurrency(debtService);
    document.getElementById('dscr-principal').textContent = formatCurrency(principal);
    document.getElementById('dscr-interest').textContent = formatCurrency(interest);

    sensitivityContainer.style.display = 'block';

    const annualNOI = noiData ? noiData.monthlyValues.slice(0, monthIndex + 1).reduce((sum, val) => sum + val, 0) : 0;
    
    // FIX: Ensure loanAmount and loanTermYears are clean numbers for calculation
    const loanAmount = parseCurrency(loanInfo.loan_amount);
    const loanTermYears = Number(loanInfo.term);

    const calculateMonthlyPayment = (rateInPercent) => {
        const rate = rateInPercent / 100;
        if (rate <= 0 || !loanAmount || !loanTermYears) return 0;
        const r = rate / 12;
        const n = loanTermYears * 12;
        if ( (Math.pow(1 + r, n) - 1) === 0) return loanAmount / n;
        return (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    };

    const currentRate = loanInfo.rate;
    const currentMonthlyDebtService = paymentData ? parseCurrency(paymentData.total_payment) : 0;
    const ytdPaymentsForCurrentRate = (appData.loans || [])
        .filter(loan =>
            (loan.property || '').trim().toLowerCase() === propertyName &&
            parseInt(loan.year, 10) === parseInt(year, 10) &&
            MONTH_NAMES.findIndex(m => m.toLowerCase() === String(loan.month).trim().toLowerCase()) <= monthIndex
        )
        .reduce((sum, loan) => sum + parseCurrency(loan.total_payment), 0);
    
    const currentAnnualDebtService = ytdPaymentsForCurrentRate;
    const currentDSCR = currentAnnualDebtService !== 0 ? annualNOI / currentAnnualDebtService : 0;
    const currentCashFlow = annualNOI - currentAnnualDebtService;
    
    const userInputRateInput = document.getElementById('userInputRate');
    const userInputRate = parseFloat(userInputRateInput.value);
    
    let userInputRowHTML = '';
    if (!isNaN(userInputRate) && userInputRate > 0) {
        const userInputMonthlyDebtService = calculateMonthlyPayment(userInputRate);
        const userInputAnnualDebtService = userInputMonthlyDebtService * 12;
        const userInputDSCR = userInputAnnualDebtService !== 0 ? annualNOI / userInputAnnualDebtService : 0;
        const userInputCashFlow = annualNOI - userInputAnnualDebtService;
        
        userInputRowHTML = `
            <tr>
                <td>${userInputRate.toFixed(2)}%</td>
                <td>${formatTableValue(userInputMonthlyDebtService)}</td>
                <td>${formatTableValue(userInputAnnualDebtService)}</td>
                <td>${formatTableValue(annualNOI)}</td>
                <td>${formatDSCR(userInputDSCR)}</td>
                <td>${formatTableValue(userInputCashFlow)}</td>
            </tr>
        `;
    }

    let tableHTML = `
        <div class="card-header">Interest Rate Sensitivity Table</div>
        <div class="card-body">
            <table class="report-table sensitivity-table">
                <thead>
                    <tr>
                        <th>Interest Rate (%)</th>
                        <th>Monthly Debt Service</th>
                        <th>Annual Debt Service</th>
                        <th>NOI</th>
                        <th>DSCR</th>
                        <th>Cash Flow Before Tax</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${Number(currentRate || 0).toFixed(2)}%</td>
                        <td>${formatTableValue(currentMonthlyDebtService)}</td>
                        <td>${formatTableValue(currentAnnualDebtService)}</td>
                        <td>${formatTableValue(annualNOI)}</td>
                        <td>${formatDSCR(currentDSCR)}</td>
                        <td>${formatTableValue(currentCashFlow)}</td>
                    </tr>
                    ${userInputRowHTML}
                </tbody>
            </table>
        </div>
    `;
    sensitivityContainer.innerHTML = tableHTML;
}

function formatCurrency(v){
    const n = parseCurrency(v);
    if (!isFinite(n)) return '0.00';
    const formatted = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? `(${formatted})` : formatted;
}

function formatNumber(v){
    const n = parseCurrency(v);
    if (!isFinite(n)) return '0.00'; 
    if (Math.abs(n) === 0) return '0.00';
    
    const parts = n.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    let formatted = parts.join('.');
    
    if (n < 0) {
        return `(${formatted.substring(1)})`;
    } else {
        return formatted;
    }
}

function formatTableValue(v) {
    const n = parseCurrency(v);
    if (!isFinite(n) || n === 0) return '-';

    const formatted = Math.abs(n).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
    });

    return n < 0 ? `(${formatted})` : formatted;
}

function formatPercent(v){
    const n = Number(v);
    if(!isFinite(n)) return '-';
    return (n * 100).toFixed(2) + '%';
}

function formatDSCR(v) {
    const n = Number(v);
    if (!isFinite(n)) return '0.00';
    return n.toFixed(2);
}

