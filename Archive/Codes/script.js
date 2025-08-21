// script.js
const appData = {};
let availableYears = [2023, 2024, 2025];
let cashflowYears = [];
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/ChrisAnthonyYu/RE-Analytics-Dashboard/main/Data%20Source/';
const FILE_NAMES = { 
    PROPERTIES:'Properties.csv', LOANS:'Loans.csv', LOAN_INFO:'Loan_Information.csv',
    TRIAL_BALANCE: 'Trial_Balance.csv', MAPPING: 'Mapping_FSaccounts.csv'
};
const REQUIRED_FILES = Object.values(FILE_NAMES);
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

document.addEventListener('DOMContentLoaded', ()=>{ loadDataFromGithub(); });

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
      showCashflowSubTab('cf-overview', document.querySelector('.sub-nav-tab'));
  }
}

function showCashflowSubTab(id, el) {
    document.querySelectorAll('.sub-tab-content').forEach(x => x.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.sub-nav-tab').forEach(x => x.classList.remove('active'));
    if(el) el.classList.add('active');
}

async function loadDataFromGithub(){
  const results = await Promise.all(REQUIRED_FILES.map(f=>fetch(GITHUB_BASE_URL+f).then(r=>r.text()).then(txt=>new Promise(res=>{
    Papa.parse(txt,{header:true,skipEmptyLines:true,dynamicTyping:true,transformHeader:h=>h.trim().toLowerCase().replace(/ /g,'_'),complete:r=>res({name:f,data:r.data})});
  }))));
  results.forEach(r=>{ const key=Object.keys(FILE_NAMES).find(k=>FILE_NAMES[k]===r.name); appData[key.toLowerCase()] = r.data; });
  if (appData.loans && appData.loans.length > 0) {
    cashflowYears = [...new Set(appData.loans.map(item => item.year))].filter(Boolean).sort((a,b) => b-a);
  }
  populateGlobalFilters();
  updateGlobalYearFilterForTab('home');
  renderHomeView();
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
  const cfContent = document.getElementById('cfContentContainer');
  const msg = document.getElementById('cfMessage');

  if(propId === 'all'){
    cfContent.style.display='none'; 
    msg.style.display='block';
    msg.textContent='Please select a property to view Cashflow Analytics.';
    return;
  }
  const prop = (appData.properties||[]).find(p=>String(p.property_id).toLowerCase()===String(propId).toLowerCase());
  const loans = (appData.loan_info||[]).filter(l=>String(l.property_id).toLowerCase()===String(propId).toLowerCase());
  const loanForAddress = loans.length > 0 ? loans[0] : null;
  document.getElementById('cf-property-name').textContent=prop?.properties||prop?.property||'-';
  document.getElementById('cf-property-address').textContent=loanForAddress?.address || prop?.address || '-';
  document.getElementById('cf-property-type').textContent=prop?.property_type||'-';
  document.getElementById('cf-property-owner').textContent=prop?.owner||'-';
  const ul=document.getElementById('cf-loans'); ul.innerHTML='';
  if (loans.length === 0) { ul.innerHTML = '<li>No loan information found for this property.</li>';
  } else {
    loans.forEach(li=>{
      // *** FIX: Uses the restored formatCurrency function for the loan amount ***
      ul.innerHTML+=`<li><strong>Banker:</strong> ${li.banker||'-'} | <strong>Loan #:</strong> ${li.loan_number||'-'} | <strong>Rate:</strong> ${formatPercent(li.rate)} | <strong>Maturity:</strong> ${li.maturity_date||'-'} <br> <strong>Loan Amount:</strong> ${formatCurrency(li.loan_amount)}</li>`;
    });
  }
  renderCashflowReportTable(propId, year);
  msg.style.display='none'; 
  cfContent.style.display='block';
}

function evaluateFormula(formula, reportMap) {
    if (!formula) return Array(12).fill(0);
    const terms = formula.split(/([+\-])/);
    let totalMonthlyValues = Array(12).fill(0);
    let currentOperator = '+';

    terms.forEach(term => {
        term = term.trim();
        if (term === '+' || term === '-') {
            currentOperator = term;
        } else if (term) {
            const values = reportMap.get(term)?.monthlyValues || Array(12).fill(0);
            if (currentOperator === '+') {
                totalMonthlyValues = totalMonthlyValues.map((v, i) => v + values[i]);
            } else if (currentOperator === '-') {
                totalMonthlyValues = totalMonthlyValues.map((v, i) => v - values[i]);
            }
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

function renderCashflowReportTable(propId, year) {
    const container = document.getElementById('cashflowReportContainer');
    if (year === 'all') { container.innerHTML = `<div class="loading">Please select a specific year to view the Cashflow Report.</div>`; return; }
    const filteredTB = (appData.trial_balance || []).filter(row => String(row.property_id).toLowerCase() === String(propId).toLowerCase() && +row.year === +year);
    if (filteredTB.length === 0) { container.innerHTML = `<div class="loading">No cashflow data available for the selected property and year.</div>`; return; }

    const mapping = (appData.mapping || []).filter(item => item.order_cf).sort((a,b) => a.order_cf - b.order_cf);
    let reportMap = new Map();
    mapping.forEach(item => reportMap.set(item.account_ref, { ...item, accounts: {}, monthlyValues: Array(12).fill(0) }));
    
    filteredTB.forEach(tbRow => {
        const group = [...reportMap.values()].find(g => 
            tbRow.account_id >= g.account_id_from && tbRow.account_id <= g.account_id_to
        );

        if (group) {
            const accountName = tbRow.accounts;
            if (!group.accounts[accountName]) {
                group.accounts[accountName] = { label: accountName, accountId: tbRow.account_id, monthlyValues: Array(12).fill(0) };
            }
            const monthIndex = MONTH_NAMES.findIndex(m => m.toLowerCase() === String(tbRow.month).trim().toLowerCase());
            if (monthIndex !== -1) {
                let amount = parseCurrency(tbRow.amount);
                
                if (group.account_ref.startsWith('adj_')) {
                    if (parseCurrency(tbRow.debit) > 0) {
                        amount = -amount;
                    }
                }
                
                group.accounts[accountName].monthlyValues[monthIndex] += amount;
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
            if (reportMap.has(group.account_ref)) {
                reportMap.get(group.account_ref).monthlyValues = calculatedValues;
            }
        }
    });
    
    let tableHTML = `<table class="report-table"><thead><tr><th>Account</th>${MONTH_NAMES_SHORT.map(m => `<th>${m}</th>`).join('')}<th>Total</th></tr></thead><tbody>`;
    
    reportMap.forEach(group => {
        const childAccounts = Object.values(group.accounts).sort((a, b) => String(a.accountId).localeCompare(String(b.accountId)));
        const isTotalLine = group.fs === 'Total';

        if (!isTotalLine && childAccounts.length > 0) {
             childAccounts.forEach(account => {
                const total = account.monthlyValues.reduce((a, b) => a + b, 0);
                tableHTML += `<tr class="account-row"><td>${account.label}</td>`;
                account.monthlyValues.forEach(value => { tableHTML += `<td>${formatNumber(value)}</td>`; });
                tableHTML += `<td>${formatNumber(total)}</td></tr>`;
            });
             
             const total = group.monthlyValues.reduce((a, b) => a + b, 0);
             tableHTML += `<tr class="group-header-row"><td>${group.account}</td>`;
             group.monthlyValues.forEach(value => { tableHTML += `<td>${formatNumber(value)}</td>`; });
             tableHTML += `<td>${formatNumber(total)}</td></tr>`;

        } else if (isTotalLine) {
             const total = group.monthlyValues.reduce((a, b) => a + b, 0);
             tableHTML += `<tr class="highlight-row"><td>${group.account}</td>`;
             group.monthlyValues.forEach(value => { tableHTML += `<td>${formatNumber(value)}</td>`; });
             tableHTML += `<td>${formatNumber(total)}</td></tr>`;
        }
    });

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

// *** RESTORED: This function is for values that should always show full currency ***
function formatCurrency(v){
    const n = parseCurrency(v);
    return isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', 'currency': 'USD' }) : '$0.00';
}

// *** This function is specifically for the report's number format ***
function formatNumber(v){
    const n = parseCurrency(v);
    if (Math.round(n) === 0) return '-';
    return Math.round(n).toLocaleString('en-US');
}

function formatPercent(v){
    const n=Number(v);
    if(!isFinite(n))return '-';
    const pct = n < 1 ? n * 100 : n; 
    return pct.toFixed(2)+'%';
}