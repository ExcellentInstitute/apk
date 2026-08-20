// =========================================================
// 🌐 ENTERPRISE FIREBASE PIPELINE (Pure Realtime Database)
// Google Sheets backend has been completely disconnected.
// =========================================================

// Initialize Firebase App (CDN Compat Method)
const firebaseConfig = {
    apiKey: "AIzaSyAPJ28Y1jBL30phxN-8yV-4X0raSEuBkx4",
    authDomain: "excellent-institute-vault.firebaseapp.com",
    databaseURL: "https://excellent-institute-vault-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "excellent-institute-vault",
    storageBucket: "excellent-institute-vault.firebasestorage.app",
    messagingSenderId: "132693034261",
    appId: "1:132693034261:web:90db93c407607bd3c5951c",
    measurementId: "G-CTLW9E7MYK"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// FCM Notification Relay (Only used for Push Notifications)
const FCM_RELAY_URL = "https://script.google.com/macros/s/AKfycbxFsBuyiWOdTMMGeOgTXhvSmAfUK_uMbdwVO945ejPvnsEOQtX9ZtMCh9RQtBWzHSVj/exec";

let appData = { students: [], transactions: [], stats: { income: 0, expense: 0, balance: 0 }, files: [], materials: [], notices: [], settings: {}, seating: {}, batchRequests: [] };
let sessionPassword = ""; 
let cropper = null;
let currentCropTarget = null;
let croppedImages = { reg: null, edit: null };
let assumptionsData = [];
let assumptionMode = false;
let analyticsChart = null;
let pendingQRCodeBase64 = null;
let isBalanceHidden = true;

window.onload = function() {
    setDefaultDates();
};

// =========================================================
// 🛡️ DATA SANITIZER (PREVENTS FIREBASE OBJECT/ARRAY CRASHES)
// =========================================================
function parseFbList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter(e => e !== null);
    return Object.values(data).filter(e => e !== null);
}

// =========================================================
// 🚀 PURE FIREBASE SYNC ENGINE WITH GRACEFUL DEGRADATION
// =========================================================

// Enterprise safety wrapper to prevent app crashes if a rule is missing
const safeWrite = async (path, data) => {
    try {
        await firebase.database().ref(path).set(data);
    } catch (err) {
        console.warn(`⚠️ Warning: Could not write to '${path}'. Check Firebase Rules.`, err.message);
    }
};

async function saveDatabase() {
    try {
        await Promise.all([
            safeWrite('students', appData.students || []),
            safeWrite('transactions', appData.transactions || []),
            safeWrite('stats', appData.stats || { income: 0, expense: 0, balance: 0 }),
            safeWrite('files', appData.files || []),
            safeWrite('materials', appData.materials || []),
            safeWrite('notices', appData.notices || []),
            safeWrite('settings', appData.settings || {}),
            safeWrite('seating', appData.seating || {}),
            safeWrite('batch_requests', appData.batchRequests || [])
        ]);
    } catch (error) {
        console.error("Critical Firebase Sync Error:", error);
    }
}

// =========================================================
// 🔐 PURE FIREBASE AUTHENTICATION LOGIN
// =========================================================

// Enterprise safety wrapper for fetching to prevent full login crashes
const safeFetch = async (path) => {
    try {
        return await firebase.database().ref(path).once('value');
    } catch (err) {
        console.warn(`⚠️ Warning: Could not read '${path}'. Check Firebase Rules.`, err.message);
        return { val: () => null }; // Return an empty snapshot simulator
    }
};

async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value.toLowerCase().trim();
    const pass = document.getElementById('password').value.trim(); 
    const errorMsg = document.getElementById('login-error');
    const btnText = document.getElementById('login-btn-text');

    errorMsg.classList.add('hidden');
    btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Authenticating...';
    
    try {
        let email = user;
        if (!email.includes('@')) {
            email = `${user}@ei.com`;
        }

        // 1. Authenticate with Firebase Server securely
        await firebase.auth().signInWithEmailAndPassword(email, pass);

        // 2. Safely load nodes individually using the crash-proof wrapper
        const [stSnap, txSnap, statSnap, flSnap, matSnap, notSnap, setSnap, seatSnap, reqSnap] = await Promise.all([
            safeFetch('students'),
            safeFetch('transactions'),
            safeFetch('stats'),
            safeFetch('files'),
            safeFetch('materials'),
            safeFetch('notices'),
            safeFetch('settings'),
            safeFetch('seating'),
            safeFetch('batch_requests')
        ]);
        
        appData = {
            students: parseFbList(stSnap.val()),
            transactions: parseFbList(txSnap.val()),
            stats: statSnap.val() || { income: 0, expense: 0, balance: 0 },
            files: parseFbList(flSnap.val()),
            materials: parseFbList(matSnap.val()),
            notices: parseFbList(notSnap.val()),
            settings: setSnap.val() || {},
            seating: seatSnap.val() || {},
            batchRequests: parseFbList(reqSnap.val())
        };

        sessionPassword = pass; 
        
        // Safety ID Generator for newly migrated data
        appData.transactions.forEach(tx => { if(!tx.id) tx.id = 'TXN' + Math.floor(Math.random() * 90000 + 10000); });
        appData.students.forEach(st => { if(!st.id) st.id = 'STU' + Math.floor(Math.random() * 90000 + 10000); if(!st.status) st.status = 'Active'; });

        localStorage.setItem('excellentERP_Database', JSON.stringify(appData));
        
        setDefaultDates();
        refreshAllUI();
        
        document.getElementById('login-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            document.getElementById('app-screen').classList.add('flex');
            document.getElementById('password').value = '';
            btnText.innerHTML = 'Secure Access <i class="fa-solid fa-arrow-right-to-bracket ml-3"></i>';
            document.getElementById('login-screen').style.opacity = '1';
        }, 500);

    } catch(err) {
        console.error("Login System Error:", err);
        errorMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-2"></i> Error: ' + err.message;
        showError(errorMsg);
        btnText.innerHTML = 'Secure Access <i class="fa-solid fa-arrow-right-to-bracket ml-3"></i>';
    }
}

// =========================================================
// ⚙️ AUTOMATED MIGRATION TOOLS
// =========================================================
async function runStudentAuthMigration() {
    if(!confirm("Start automated Auth Migration? This will create secure Firebase accounts for all students without logging you out.")) return;
    
    try {
        let secondaryApp;
        if (firebase.apps.length < 2) {
            secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
        } else {
            secondaryApp = firebase.app("SecondaryApp");
        }

        let successCount = 0;
        let skipCount = 0;

        for (let student of appData.students) {
            let phone = String(student.phone).trim();
            if(phone) {
                let email = `${phone}@ei.com`;
                let firstName = String(student.name || "").trim().split(/\s+/)[0];
                let dateStr = student.date || "";
                let regYear = dateStr.length >= 4 ? dateStr.substring(0, 4) : new Date().getFullYear().toString();
                let password = `EI${firstName}${regYear}`;
                
                try {
                    await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
                    successCount++;
                    console.log(`Created: ${email}`);
                } catch(e) {
                    if(e.code === 'auth/email-already-in-use') {
                        skipCount++;
                    } else {
                        console.error(`Error creating ${email}:`, e);
                    }
                }
                await secondaryApp.auth().signOut();
            }
        }
        alert(`Migration Complete!\n✅ Accounts Created: ${successCount}\n⏭️ Already Existed (Skipped): ${skipCount}`);
    } catch (err) {
        alert("Migration encountered an error: " + err.message);
    }
}

async function runFileMigration() {
    if(!confirm("Start File Vault Split? This will safely move Study Materials to the public node while keeping Certificates locked.")) return;
    
    try {
        let newPrivateFiles = [];
        let newPublicMaterials = appData.materials ? [...appData.materials] : [];

        if (appData.files && appData.files.length > 0) {
            appData.files.forEach(f => {
                if (f.category === 'Material' || f.category === 'Assignment') {
                    if (!newPublicMaterials.some(m => m.id === f.id)) {
                        newPublicMaterials.push(f);
                    }
                } else {
                    newPrivateFiles.push(f);
                }
            });
        }

        appData.files = newPrivateFiles;
        appData.materials = newPublicMaterials;

        await Promise.all([
            safeWrite('files', appData.files.length > 0 ? appData.files : null),
            safeWrite('materials', appData.materials.length > 0 ? appData.materials : null)
        ]);
        
        renderHubFiles();
        alert("File Migration Complete! Database successfully split into two secure vaults.");
    } catch(e) {
        alert("Error during file migration: " + e.message);
    }
}

// =========================================================
// 🧮 UNIFIED DYNAMIC FLOATING EMI MATH
// =========================================================
function calculateExactDues(student) {
    let safeParse = (val) => {
        if (!val) return 0.0;
        return parseFloat(String(val).replace(/,/g, '').trim()) || 0.0;
    };
    
    let totalFee = safeParse(student.totalFee);
    if (totalFee === 0) totalFee = safeParse(student['Total Course Fee']);
    
    let storedPaidFee = 0.0;
    const paidKeys = ['paidFee', 'Advance/Paid', 'advance/paid', 'Advance', 'paid'];
    for (let key of paidKeys) {
        storedPaidFee = safeParse(student[key]);
        if (storedPaidFee > 0) break;
    }

    let stTx = appData.transactions.filter(tx => {
        let title = String(tx.title || "");
        let sName = String(student.name || "UNNAMED");
        return tx.type === 'income' && !title.includes('Job Desk:') && !title.includes('Print Desk:') && (title.includes(`[${student.id}]`) || (title.includes(sName) && !title.includes('[STU')));
    });
    
    let totalTxPaid = 0.0;
    stTx.forEach(tx => totalTxPaid += safeParse(tx.amount));
    
    let actualPaid = totalTxPaid > storedPaidFee ? totalTxPaid : storedPaidFee;
    let adWallet = safeParse(student.adWallet);
    
    let totalOutstanding = totalFee - (actualPaid + adWallet);
    if (totalOutstanding < 0) totalOutstanding = 0.0;

    let feeStructure = (student.feeType || student.feeStructure || student['Fee Structure'] || student.fee_structure || 'Monthly').toString().trim();
    let durationMonths = 12;
    let courseStr = (student.course || student.Course || "").toString();
    let match = courseStr.match(/(\d+)\s*(month|mth|mon)/i);
    if (match && parseInt(match[1])) {
        durationMonths = parseInt(match[1]);
    } else {
        let explicitDuration = parseInt(student.duration || student.Duration) || 0;
        if (explicitDuration > 0) durationMonths = explicitDuration;
    }

    let currentMonthDue = 0.0;

    if (feeStructure.toLowerCase().includes('one-time') || feeStructure.toLowerCase().includes('onetime') || feeStructure.toLowerCase().includes('lumpsum')) {
        currentMonthDue = totalOutstanding;
    } else {
        let elapsedMonths = 0;
        let dateStr = (student.date || student['Admission Date'] || "").toString();
        
        try {
            if (dateStr) {
                let adDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
                let adDate;
                if (adDateStr.includes('-')) {
                    adDate = new Date(adDateStr);
                } else if (adDateStr.includes('/')) {
                    let parts = adDateStr.split('/');
                    if (parts.length === 3) adDate = new Date(parts[2], parts[1] - 1, parts[0]);
                }

                if (adDate && !isNaN(adDate.getTime())) {
                    let now = new Date();
                    elapsedMonths = (now.getFullYear() - adDate.getFullYear()) * 12 + now.getMonth() - adDate.getMonth();
                    
                    let targetDay = adDate.getDate();
                    let daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    if (targetDay > daysInCurrentMonth) targetDay = daysInCurrentMonth;
                    
                    if (now.getDate() < targetDay) elapsedMonths--;
                    if (elapsedMonths < 0) elapsedMonths = 0;
                }
            }
        } catch (e) {
            elapsedMonths = stTx.length > 0 ? 1 : 0;
        }

        let totalInstallments = durationMonths - 1;
        if (totalInstallments < 1) totalInstallments = 1;
        
        let remainingInstallments = totalInstallments - elapsedMonths;
        if (remainingInstallments < 1) remainingInstallments = 1;

        if (elapsedMonths >= totalInstallments) {
            currentMonthDue = totalOutstanding;
        } else {
            currentMonthDue = Math.ceil(totalOutstanding / remainingInstallments);
        }
        if (currentMonthDue < 0) currentMonthDue = 0.0;
        if (currentMonthDue > totalOutstanding) currentMonthDue = totalOutstanding;
    }

    return { 
        currentMonthDue: currentMonthDue, 
        totalOutstanding: totalOutstanding, 
        actualPaid: actualPaid, 
        adDiscount: adWallet 
    };
}

function shareTransactionWA(txId) {
    const tx = appData.transactions.find(t => t.id === txId);
    if(!tx) return;
    const isInc = tx.type === 'income';
    let msg = `${isInc ? '🟢' : '🔴'} *TRANSACTION RECORD*%0A*Date:* ${tx.date}\%0A*Title:*${String(tx.title || "").replace(/ \[STU.*\]/, '')}%0A*Amount:* ${isInc ? '+' : '-'}₹${tx.amount}`;
    if(tx.description && tx.description !== "N/A" && tx.description !== "-") msg += `%0A*Details:* ${tx.description}`;
    
    const link = document.createElement('a');
    link.href = `https://api.whatsapp.com/send?text=${msg}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function sendCustomPushNotification() {
    const stId = document.getElementById('tuition-student-id').value;
    const student = appData.students.find(s => s.id === stId);
    if (!student) return;
    
    const phone = student.phone ? String(student.phone).trim() : "";
    if(!phone) return alert("Cannot send notification: Student phone number is missing.");

    const metrics = calculateExactDues(student);
    let currentDue = metrics.currentMonthDue;
    let totalDue = metrics.totalOutstanding;
    
    if (student.customDueAmount && student.customDueAmount !== "") {
        currentDue = parseFloat(student.customDueAmount);
        totalDue = currentDue;
    }
    
    if (currentDue <= 0) {
        return alert("This student has no pending dues. No alert needed.");
    }
    
    if(!confirm(`Send App Notification to ${student.name} for ₹${Math.floor(currentDue)}?`)) return;

    const title = encodeURIComponent("Pending Fee Alert ⚠️");
    const body = encodeURIComponent(`You have a current pending due of ₹${Math.floor(currentDue)} (Total Remaining: ₹${Math.floor(totalDue)}). Please clear it via the Student Hub to avoid interruptions.`);
    
    const notifyBtn = document.getElementById('custom-notify-btn');
    if(notifyBtn) notifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs text-amber-500"></i>';

    try {
        let response = await fetch(`${FCM_RELAY_URL}?action=send_notification&phone=${phone}&title=${title}&body=${body}`);
        let result = await response.json();
        if (result.success) {
            alert(`Push notification sent successfully to ${student.name}!`);
        } else {
            alert("Failed to send: " + result.error);
        }
    } catch (err) {
        alert("Network error while sending notification. Check connection.");
    } finally {
        if(notifyBtn) notifyBtn.innerHTML = '<i class="fa-solid fa-bell text-xs"></i>';
    }
}

function shareStudentWA() {
    const stId = document.getElementById('tuition-student-id').value;
    const student = appData.students.find(s => s.id === stId);
    if(!student) return;
    
    const metrics = calculateExactDues(student);
    let displayDue = metrics.totalOutstanding;
    
    if (student.customDueAmount && student.customDueAmount !== "") {
        displayDue = parseFloat(student.customDueAmount);
    }
    
    const msg = `🎓 *STUDENT UPDATE*%0A*Name:* ${student.name}%0A*Course:* ${student.course}\%0A*Duration:*${student.duration || '?'} Months%0A*Total Fee:* ₹${student.totalFee}\%0A*Total Paid:* ₹${metrics.actualPaid}%0A*Ad Discount:* ₹${metrics.adDiscount.toFixed(2)}\%0A*Due:* ₹${displayDue.toFixed(2)}${student.customDueDate ? ' (By: '+student.customDueDate+')' : ''}\%0A*Status:* ${displayDue <= 0 ? 'Cleared ✅' : 'Pending ⚠️'}`;
    
    const link = document.createElement('a');
    link.href = `https://api.whatsapp.com/send?text=${msg}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    ['reg-date', 'tuition-date', 'job-date', 'print-date', 'exp-date'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).value = today;
    });
    if(document.getElementById('assumed-date')) {
        document.getElementById('assumed-date').value = today.substring(0,7);
    }
}

function checkDuesNotifications() {
    let dueStudents = [];
    
    appData.students.forEach(st => {
        if ((st.status || 'Active') !== 'Active') return;
        
        if (st.customDueAmount && st.customDueAmount !== "") {
            const customDue = parseFloat(st.customDueAmount);
            if (customDue > 0) {
                dueStudents.push({ ...st, currentDue: customDue });
            }
            return; 
        }

        const metrics = calculateExactDues(st);
        if (metrics.currentMonthDue > 0) {
            dueStudents.push({ ...st, currentDue: metrics.currentMonthDue });
        }
    });

    const badge = document.getElementById('notif-badge');
    const countText = document.getElementById('notif-count-text');
    const list = document.getElementById('notif-list');

    if (dueStudents.length > 0) {
        badge.innerText = dueStudents.length;
        badge.classList.remove('hidden');
        countText.innerText = `${dueStudents.length} Pending`;
        
        list.innerHTML = '';
        dueStudents.forEach(st => {
            list.innerHTML += `
                <div class="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer rounded-xl" onclick="closeNotificationsIfOpen(); switchTab('tuition'); setTimeout(()=>selectStudent('${st.id}'), 100);">
                    <p class="text-sm font-bold text-slate-800">${st.name}</p>
                    <p class="text-xs text-rose-500 font-bold mt-1">₹${st.currentDue.toFixed(2)} Due for Current Month</p>
                </div>
            `;
        });
    } else {
        badge.classList.add('hidden');
        countText.innerText = `0 Pending`;
        list.innerHTML = `<div class="p-6 text-center text-slate-400 text-sm font-bold"><i class="fa-solid fa-check-circle text-3xl mb-2 text-emerald-400 block"></i>All clear! No pending dues this month.</div>`;
    }
}

function toggleNotifications() {
    const drop = document.getElementById('notif-dropdown');
    if (drop.classList.contains('hidden')) {
        checkDuesNotifications(); 
        drop.classList.remove('hidden');
        setTimeout(() => { drop.classList.remove('scale-95', 'opacity-0'); }, 10);
    } else {
        drop.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { drop.classList.add('hidden'); }, 200);
    }
}

function closeNotificationsIfOpen(e) {
    if(e && e.target.closest && e.target.closest('.fa-bell')) return; 
    const drop = document.getElementById('notif-dropdown');
    if (!drop.classList.contains('hidden')) {
        drop.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { drop.classList.add('hidden'); }, 200);
    }
}

function togglePasswordVisibility() {
    const passInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

function openCropModal(event, target) {
    const file = event.target.files[0];
    if (!file) return;
    currentCropTarget = target;
    const reader = new FileReader();
    reader.onload = function(e) {
        const image = document.getElementById('image-to-crop');
        image.src = e.target.result;
        image.classList.remove('hidden');
        
        const modal = document.getElementById('crop-modal');
        const content = document.getElementById('crop-modal-content');
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);

        if (cropper) cropper.destroy();
        cropper = new Cropper(image, { aspectRatio: 1, viewMode: 1, autoCropArea: 1 });
    };
    reader.readAsDataURL(file);
}

function closeCropModal() {
    const modal = document.getElementById('crop-modal');
    const content = document.getElementById('crop-modal-content');
    modal.classList.add('opacity-0'); content.classList.add('scale-95');
    setTimeout(() => { 
        modal.classList.add('hidden'); 
        if(cropper) { cropper.destroy(); cropper = null; }
        document.getElementById('image-to-crop').src = '';
        if(!croppedImages[currentCropTarget]) {
            document.getElementById(currentCropTarget === 'reg' ? 'reg-image' : 'edit-image').value = '';
        }
    }, 300);
}

function confirmCrop() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    croppedImages[currentCropTarget] = canvas.toDataURL('image/jpeg', 0.8);
    closeCropModal();
}

function showError(el) {
    el.classList.remove('hidden');
    document.getElementById('login-screen').animate([{ transform: 'translateX(0px)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0px)' }], { duration: 300 });
}

function logout() { location.reload(); }

function recalculateStats() {
    appData.stats.income = 0;
    appData.stats.expense = 0;
    appData.transactions.forEach(tx => {
        if(tx.type === 'income') appData.stats.income += parseFloat(tx.amount);
        if(tx.type === 'expense') appData.stats.expense += parseFloat(tx.amount);
    });
    appData.stats.balance = appData.stats.income - appData.stats.expense;
}

function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden;
    const btn = document.getElementById('toggle-balance-btn');
    if (isBalanceHidden) {
        btn.innerHTML = '<i class="fa-solid fa-eye mr-2"></i> Show Values';
        btn.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
        btn.classList.add('bg-slate-100', 'text-slate-700', 'border-slate-200');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-eye-slash mr-2"></i> Hide Values';
        btn.classList.remove('bg-slate-100', 'text-slate-700', 'border-slate-200');
        btn.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
    }
    updateDashboard();
}

function updateDashboard() {
    const format = (num) => isBalanceHidden ? '₹ ••••••' : `₹${num.toLocaleString('en-IN')}`;
    
    document.getElementById('dash-income').innerText = format(appData.stats.income);
    document.getElementById('dash-expense').innerText = format(appData.stats.expense);
    document.getElementById('dash-balance').innerText = format(appData.stats.balance);
    document.getElementById('header-balance').innerText = format(appData.stats.balance);
}

function refreshAllUI() {
    updateDashboard(); 
    renderStudentList(); 
    renderLedger(); 
    renderExpenseList(); 
    renderJobList(); 
    renderPrintList();
    renderAnalytics(); 
    checkDuesNotifications(); 
    populateSettings();
    
    renderHubFiles();
    renderBroadcastList();
    
    renderSeatingLayout();
    renderBatchRequests();

    const activeId = document.getElementById('tuition-student-id').value;
    if(activeId && !document.getElementById('tuition-active').classList.contains('hidden')) {
        selectStudent(activeId);
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay.classList.contains('hidden')) { overlay.classList.remove('hidden'); setTimeout(() => overlay.classList.remove('opacity-0'), 10); } 
    else { overlay.classList.add('opacity-0'); setTimeout(() => overlay.classList.add('hidden'), 300); }
}

function exportDatabaseBackup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.download = `Excellent_Institute_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.href = url; link.click();
}

function importDatabaseBackup(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.students && importedData.transactions && importedData.stats) {
                appData = importedData; saveDatabase(); alert("Database Restored Successfully!"); refreshAllUI();
            } else alert("Error: Invalid backup format.");
        } catch (error) { alert("Error reading backup."); }
    };
    reader.readAsText(file);
}

function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    const viewSection = document.getElementById(`view-${tabId}`);
    const navBtn = document.getElementById(`nav-${tabId}`);
    
    if(viewSection) viewSection.classList.add('active');
    if(navBtn) navBtn.classList.add('active');
    
    const titles = { 
        'dashboard': 'System Dashboard', 
        'registration': 'New Admission', 
        'tuition': 'Student Database', 
        'seating': 'Batch & Seating Management',
        'filehub': 'Institute File Hub', 
        'broadcast': 'Alerts & Notifications', 
        'job': 'Job Applications', 
        'print': 'Print & Copy Desk', 
        'expenditure': 'Expenditures', 
        'analytics': 'Profit & Loss Analytics', 
        'settings': 'System Settings',
        'exam': 'MCQ Exam Portal'
    };
    document.getElementById('page-title').innerText = titles[tabId] || 'Dashboard';
    if(window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        if(!sidebar.classList.contains('-translate-x-full')) toggleSidebar();
    }
    
    if(tabId === 'analytics') renderAnalytics();
    if(tabId === 'seating') { renderSeatingLayout(); renderBatchRequests(); }
}

function populateSettings() {
    if (!appData.settings) return;
    document.getElementById('set-upi').value = appData.settings.upiId || '';
    
    document.getElementById('set-reward-amt').value = appData.settings.rewardPerClick ?? 0;
    document.getElementById('set-allow-rewards').value = appData.settings.allowVideoRewards ? "true" : "false";
    
    const qrPreview = document.getElementById('set-qr-preview');
    const qrIcon = document.getElementById('set-qr-icon');
    if (appData.settings.qrCodeUrl && appData.settings.qrCodeUrl !== "") {
        qrPreview.src = appData.settings.qrCodeUrl;
        qrPreview.classList.remove('hidden');
        qrIcon.classList.add('hidden');
    } else {
        qrPreview.src = '';
        qrPreview.classList.add('hidden');
        qrIcon.classList.remove('hidden');
    }
}

function previewQRCode(event) {
    const file = event.target.files[0];
    if (!file) return;
    compressImage(file, function(base64Image) {
        pendingQRCodeBase64 = base64Image;
        const qrPreview = document.getElementById('set-qr-preview');
        const qrIcon = document.getElementById('set-qr-icon');
        qrPreview.src = base64Image;
        qrPreview.classList.remove('hidden');
        qrIcon.classList.add('hidden');
    });
}

function submitSettings(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-settings');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...';
    
    const upiId = document.getElementById('set-upi').value.trim();
    const rewardAmt = document.getElementById('set-reward-amt').value;
    const allowRewards = document.getElementById('set-allow-rewards').value === 'true';
    
    if (!appData.settings) appData.settings = {};
    
    appData.settings.upiId = upiId;
    appData.settings.rewardPerClick = parseFloat(rewardAmt);
    appData.settings.allowVideoRewards = allowRewards;
    
    if (pendingQRCodeBase64) {
        appData.settings.qrCodeUrl = pendingQRCodeBase64;
        pendingQRCodeBase64 = null;
    }
    
    // Pure Firebase Save with Graceful Wrapper
    safeWrite('settings', appData.settings).then(() => {
        btn.innerHTML = 'Save Configuration';
        alert("Settings Saved Successfully to Cloud!");
    });
}

function compressImage(file, callback) {
    if(!file) return callback(null);
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
            const MAX_SIZE = 200; let width = img.width, height = img.height;
            if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
            else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
            canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function generateComprehensivePrint() {
    let printDiv = document.getElementById('comprehensive-print-view');
    let now = new Date().toLocaleString('en-IN');
    let html = `
        <div style="text-align: center; margin-bottom: 20px; font-family: sans-serif;">
            <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: #1e293b;">EXCELLENT INSTITUTE</h1>
            <p style="margin: 0; font-size: 14px; color: #475569;">TEACHERS COLONY, SURADA, DIST - GANJAM, ODISHA - 761108</p>
            <h2 style="font-size: 20px; margin-top: 15px; border-bottom: 2px solid #1e293b; display: inline-block; padding-bottom: 5px;">Comprehensive Financial Statement</h2>
            <p style="font-size: 12px; text-align: right; margin-top: 10px; font-weight: bold;">Generated on: ${now}</p>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border: 2px solid #e2e8f0; padding: 15px; background: #f8fafc; border-radius: 10px; font-family: sans-serif;">
            <div><strong style="color: #64748b; text-transform: uppercase; font-size: 12px;">Total Revenue</strong><br><span style="font-size: 24px; font-weight: bold; color: #059669;">₹${appData.stats.income.toLocaleString('en-IN')}</span></div>
            <div><strong style="color: #64748b; text-transform: uppercase; font-size: 12px;">Total Expenditure</strong><br><span style="font-size: 24px; font-weight: bold; color: #e11d48;">₹${appData.stats.expense.toLocaleString('en-IN')}</span></div>
            <div><strong style="color: #64748b; text-transform: uppercase; font-size: 12px;">Net Balance</strong><br><span style="font-size: 24px; font-weight: bold; color: #4f46e5;">₹${appData.stats.balance.toLocaleString('en-IN')}</span></div>
        </div>
        <h3 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; font-family: sans-serif;">Complete Transaction Ledger</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; font-family: sans-serif;">
            <thead><tr style="border-bottom: 2px solid #1e293b;"><th style="padding: 8px 5px;">Date</th><th style="padding: 8px 5px;">Description / Title</th><th style="padding: 8px 5px;">Type</th><th style="padding: 8px 5px; text-align: right;">Amount</th></tr></thead>
            <tbody>
    `;
    appData.transactions.forEach(tx => {
        if (parseFloat(tx.amount) === 0) return;
        let isInc = tx.type === 'income'; let sign = isInc ? '+' : '-';
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 5px; color: #475569;">${tx.date}</td>
                <td style="padding: 8px 5px;"><strong>${String(tx.title || "").replace(/ \[STU.*\]/, '')}</strong> <br><small style="color:#64748b">${tx.description || ''}</small></td>
                <td style="padding: 8px 5px; font-weight: bold; color: ${isInc ? '#059669' : '#e11d48'}">${isInc ? 'INCOME' : 'EXPENSE'}</td>
                <td style="padding: 8px 5px; text-align: right; font-weight: bold;">${sign}₹${tx.amount.toLocaleString('en-IN')}</td>
            </tr>
        `;
    });
    html += `</tbody></table><div style="margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 10px; font-family: sans-serif;">-- End of Official Statement --</div>`;
    document.getElementById('comprehensive-print-view').innerHTML = html;
    window.print();
}

function toggleAssumptionMode() {
    assumptionMode = !assumptionMode;
    const panel = document.getElementById('assumption-panel');
    const btn = document.getElementById('btn-assumption');
    if(assumptionMode) {
        panel.classList.remove('hidden');
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2 text-indigo-500"></i> Assumption Mode: ON';
        btn.classList.add('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
    } else {
        panel.classList.add('hidden');
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-2"></i> Assumption Mode: OFF';
        btn.classList.remove('bg-indigo-100', 'text-indigo-700', 'border-indigo-300');
    }
    renderAnalytics();
}

function toggleAssumedCategory() {
    const type = document.getElementById('assumed-type').value;
    const catSelect = document.getElementById('assumed-category');
    if (type === 'income') {
        catSelect.innerHTML = '<option value="Course Tuition Fee">Course Tuition Fee</option><option value="Admission Fee">Admission Fee</option><option value="Print Desk">Print Desk</option><option value="Job Desk">Job Desk</option><option value="Custom">➕ Add Custom Category...</option>';
    } else {
        catSelect.innerHTML = '<option value="Electricity Bill">Electricity Bill</option><option value="Office Rent">Office Rent</option><option value="Staff Salary">Staff Salary</option><option value="Maintenance & Repair">Maintenance & Repair</option><option value="Paper & Ink Supplies">Paper & Ink Supplies</option><option value="Institute Promotion">Institute Promotion</option><option value="Water Can">Water Can</option><option value="Miscellaneous">Miscellaneous</option><option value="Custom">➕ Add Custom Category...</option>';
    }
    toggleCustomAssumedCategory();
}

function toggleCustomAssumedCategory() {
    const val = document.getElementById('assumed-category').value;
    const customInput = document.getElementById('assumed-custom-category');
    if (val === 'Custom') customInput.classList.remove('hidden');
    else customInput.classList.add('hidden');
}

function addAssumption() {
    const type = document.getElementById('assumed-type').value;
    let cat = document.getElementById('assumed-category').value;
    if (cat === 'Custom') {
        cat = document.getElementById('assumed-custom-category').value || 'Custom Record';
    }
    const amt = parseFloat(document.getElementById('assumed-amount').value);
    const dateStr = document.getElementById('assumed-date').value; 
    if(!amt || !dateStr) return alert('Please enter both amount and a Month/Year.');
    
    assumptionsData.push({
        id: 'ASSUM_' + Date.now(), type: type, amount: amt,
        date: dateStr + '-01', title: `[Assumed] ${cat}`
    });
    
    document.getElementById('assumed-amount').value = '';
    document.getElementById('assumed-custom-category').value = '';
    renderAssumedList();
    renderAnalytics();
}

function renderAssumedList() {
    const container = document.getElementById('assumed-list-container');
    const list = document.getElementById('assumed-list');
    list.innerHTML = '';
    if(assumptionsData.length > 0) {
        container.classList.remove('hidden');
        assumptionsData.forEach(a => {
            const sign = a.type === 'income' ? '+' : '-';
            const color = a.type === 'income' ? 'text-emerald-600' : 'text-rose-600';
            list.innerHTML += `<li class="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-100 shadow-sm"><span class="font-bold text-slate-700">${String(a.date || "").substring(0,7)} <span class="text-[10px] text-slate-400 ml-1 truncate">(${a.title})</span></span> <span class="font-black ${color}">${sign}₹${a.amount}</span></li>`;
        });
    } else {
        container.classList.add('hidden');
    }
}

function clearAssumptions() {
    assumptionsData = [];
    renderAssumedList();
    renderAnalytics();
}

function renderAnalytics() {
    const periodType = document.getElementById('analytics-period').value;
    const chartType = document.getElementById('analytics-chart-type').value;

    const grouped = {};
    
    appData.transactions.forEach(tx => {
        if(parseFloat(tx.amount) === 0) return;
        const dateParts = String(tx.date || "").split('-');
        if(dateParts.length < 2) return;
        const year = dateParts[0]; const month = dateParts[1];
        let key = ''; let sortVal = 0;
        
        if (periodType === 'month') {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            key = `${monthNames[parseInt(month)-1]} ${year}`; sortVal = parseInt(year) * 100 + parseInt(month);
        } else {
            key = `${year}`; sortVal = parseInt(year);
        }

        if(!grouped[key]) grouped[key] = { actualInc: 0, actualExp: 0, assumInc: 0, assumExp: 0, label: key, sortVal: sortVal };
        if(tx.type === 'income') grouped[key].actualInc += parseFloat(tx.amount);
        else if(tx.type === 'expense') grouped[key].actualExp += parseFloat(tx.amount);
    });

    if(assumptionMode && assumptionsData.length > 0) {
        assumptionsData.forEach(tx => {
            if(parseFloat(tx.amount) === 0) return;
            const dateParts = String(tx.date || "").split('-');
            const year = dateParts[0]; const month = dateParts[1];
            let key = ''; let sortVal = 0;
            
            if (periodType === 'month') {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                key = `${monthNames[parseInt(month)-1]} ${year}`; sortVal = parseInt(year) * 100 + parseInt(month);
            } else {
                key = `${year}`; sortVal = parseInt(year);
            }

            if(!grouped[key]) grouped[key] = { actualInc: 0, actualExp: 0, assumInc: 0, assumExp: 0, label: key, sortVal: sortVal };
            if(tx.type === 'income') grouped[key].assumInc += parseFloat(tx.amount);
            else if(tx.type === 'expense') grouped[key].assumExp += parseFloat(tx.amount);
        });
    }

    const sortedKeys = Object.keys(grouped).sort((a,b) => grouped[a].sortVal - grouped[b].sortVal);
    
    const actualIncomes = sortedKeys.map(k => grouped[k].actualInc);
    const assumIncomes = sortedKeys.map(k => grouped[k].assumInc);
    const actualExpenses = sortedKeys.map(k => grouped[k].actualExp);
    const assumExpenses = sortedKeys.map(k => grouped[k].assumExp);
    const profits = sortedKeys.map(k => (grouped[k].actualInc + grouped[k].assumInc) - (grouped[k].actualExp + grouped[k].assumExp));

    renderAnalyticsTable(sortedKeys, grouped);

    const ctx = document.getElementById('analyticsChartCanvas').getContext('2d');
    if(analyticsChart) analyticsChart.destroy();

    if(chartType === 'pie') {
        let totalInc = 0, totalExp = 0;
        sortedKeys.forEach(k => { totalInc += grouped[k].actualInc + grouped[k].assumInc; totalExp += grouped[k].actualExp + grouped[k].assumExp; });
        
        analyticsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Total Income', 'Total Expenses'],
                datasets: [{
                    data: [totalInc, totalExp],
                    backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(244, 63, 94, 0.8)'],
                    borderColor: ['#10b981', '#f43f5e'],
                    borderWidth: 2, hoverOffset: 10
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: {font: {family: 'Plus Jakarta Sans', weight: 'bold'}} } }, cutout: '60%' }
        });
    } else if (chartType === 'net-bar') {
        const colors = profits.map(p => p >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)');
        const borders = profits.map(p => p >= 0 ? '#10b981' : '#f43f5e');
        
        const negActualExp = actualExpenses.map(v => -v);
        const negAssumExp = assumExpenses.map(v => -v);

        analyticsChart = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels: sortedKeys, 
                datasets: [
                    { label: 'Actual Income', data: actualIncomes, backgroundColor: 'rgba(16, 185, 129, 0.8)', stack: 'Stack 0' },
                    { label: 'Assumed Income', data: assumIncomes, backgroundColor: 'rgba(16, 185, 129, 0.3)', stack: 'Stack 0' },
                    { label: 'Actual Expense', data: negActualExp, backgroundColor: 'rgba(244, 63, 94, 0.8)', stack: 'Stack 0' },
                    { label: 'Assumed Expense', data: negAssumExp, backgroundColor: 'rgba(244, 63, 94, 0.3)', stack: 'Stack 0' },
                    { label: 'Net Profit', data: profits, borderColor: '#6366f1', backgroundColor: '#6366f1', type: 'line', fill: false, tension: 0.3, borderWidth: 3 }
                ] 
            },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                plugins: { tooltip: { callbacks: { label: function(context) { return context.dataset.label + ': ₹' + Math.abs(context.raw).toLocaleString('en-IN'); } } } }, 
                scales: { y: { grid: { color: 'rgba(226, 232, 240, 0.6)' }, ticks: { callback: function(value) { return '₹' + value; } } }, x: { grid: { display: false } } } 
            }
        });
    } else if (chartType === 'line') {
        const totalIncomes = sortedKeys.map((k, i) => actualIncomes[i] + assumIncomes[i]);
        const totalExpenses = sortedKeys.map((k, i) => actualExpenses[i] + assumExpenses[i]);
        
        analyticsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedKeys,
                datasets: [
                    { label: 'Total Income', data: totalIncomes, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4, borderWidth: 3 },
                    { label: 'Total Expense', data: totalExpenses, borderColor: '#f43f5e', backgroundColor: 'rgba(244, 63, 94, 0.1)', fill: true, tension: 0.4, borderWidth: 3 },
                    { label: 'Net Profit', data: profits, borderColor: '#6366f1', backgroundColor: 'transparent', fill: false, tension: 0.4, borderWidth: 3, borderDash: [5, 5] }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { padding: 12, titleFont: { size: 14 }, bodyFont: { size: 13 } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' } }, x: { grid: { display: false } } } }
        });
    } else {
        analyticsChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: sortedKeys,
                datasets: [
                    { label: 'Actual Income', data: actualIncomes, backgroundColor: 'rgba(16, 185, 129, 0.8)', borderColor: '#10b981', borderWidth: 2, stack: 'Inc', borderRadius: 4 },
                    { label: 'Assumed Income', data: assumIncomes, backgroundColor: 'rgba(16, 185, 129, 0.3)', borderColor: '#10b981', borderWidth: 2, borderDash: [5, 5], stack: 'Inc', borderRadius: 4 },
                    { label: 'Actual Expense', data: actualExpenses, backgroundColor: 'rgba(244, 63, 94, 0.8)', borderColor: '#f43f5e', borderWidth: 2, stack: 'Exp', borderRadius: 4 },
                    { label: 'Assumed Expense', data: assumExpenses, backgroundColor: 'rgba(244, 63, 94, 0.3)', borderColor: '#f43f5e', borderWidth: 2, borderDash: [5, 5], stack: 'Exp', borderRadius: 4 },
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { padding: 12, titleFont: { size: 14 }, bodyFont: { size: 13 } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.6)' } }, x: { grid: { display: false } } } }
        });
    }
}

function renderAnalyticsTable(keys, grouped) {
    const tbody = document.getElementById('analytics-table-body');
    tbody.innerHTML = '';
    if(keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-slate-400 font-bold">No financial data available for analysis.</td></tr>';
        return;
    }
    [...keys].reverse().forEach(k => {
        const data = grouped[k];
        const actualNet = data.actualInc - data.actualExp;
        const assumNet = data.assumInc - data.assumExp;
        const finalNet = actualNet + assumNet;

        const finalClass = finalNet >= 0 ? 'text-emerald-600' : 'text-rose-600';
        const finalSign = finalNet >= 0 ? '+' : '';

        let assumHtml = `<span class="text-slate-300">-</span>`;
        if (data.assumInc > 0 || data.assumExp > 0) {
            assumHtml = `<span class="text-emerald-500">+₹${data.assumInc.toLocaleString('en-IN')}</span> / <span class="text-rose-500">-₹${data.assumExp.toLocaleString('en-IN')}</span>`;
        }

        tbody.innerHTML += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td class="py-4 px-5 font-bold text-slate-700">${k}</td>
                <td class="py-4 px-5 text-slate-600 font-medium whitespace-nowrap"><span class="text-emerald-600">₹${data.actualInc.toLocaleString('en-IN')}</span> / <span class="text-rose-600">₹${data.actualExp.toLocaleString('en-IN')}</span></td>
                <td class="py-4 px-5 font-bold whitespace-nowrap bg-indigo-50/30">${assumHtml}</td>
                <td class="py-4 px-5 ${finalClass} font-black text-right bg-slate-50">${finalSign}₹${finalNet.toLocaleString('en-IN')}</td>
            </tr>
        `;
    });
}

function showFeeBreakdown() {
    let admission = 0, tuition = 0, exam = 0, other = 0, totalAdDiscount = 0;
    appData.transactions.forEach(tx => {
        let title = String(tx.title || "").toLowerCase();
        if(tx.type === 'income' && !title.includes('job desk:') && !title.includes('print desk:')) {
            const amt = parseFloat(tx.amount) || 0;
            if(title.includes('admission')) admission += amt;
            else if(title.includes('tuition')) tuition += amt;
            else if(title.includes('exam') || title.includes('certificate')) exam += amt;
            else if(title.includes('other')) other += amt;
            else admission += amt; 
        }
    });
    appData.students.forEach(st => {
        totalAdDiscount += parseFloat(st.adWallet) || 0;
    });
    const total = admission + tuition + exam + other;
    alert(`📊 TOTAL STUDENT FEES: ₹${total.toLocaleString('en-IN')}\n\n🎟️ Admission Fees: ₹${admission.toLocaleString('en-IN')}\n📖 Course Tuitions: ₹${tuition.toLocaleString('en-IN')}\n📝 Exam/Certificates: ₹${exam.toLocaleString('en-IN')}\n💡 Other Fees: ₹${other.toLocaleString('en-IN')}\n🎁 Total Ad Discounts: ₹${totalAdDiscount.toFixed(2)}`);
}

function getDynamicPaidFee(student) {
    let total = 0;
    appData.transactions.forEach(tx => {
        let title = String(tx.title || "");
        if (tx.type === 'income' && !title.includes('Job Desk:') && !title.includes('Print Desk:')) {
            if (title.includes(`[${student.id}]`) || (title.includes(String(student.name || "UNNAMED")) && !title.includes('[STU'))) {
                total += parseFloat(tx.amount) || 0;
            }
        }
    });
    return Math.max(total, parseFloat(student.paidFee) || 0);
}

function addStudent(name, course, totalFee, paidNow, phone, dateStr, feeType, gender, imageBase64, durationStr, parentPhone, batchId) {
    const id = 'STU' + Math.floor(Math.random() * 90000 + 10000);
    const newStudent = { 
        id: id, name: name, course: course, totalFee: parseFloat(totalFee), paidFee: parseFloat(paidNow), 
        feeType: feeType, gender: gender, phone: phone, date: dateStr, image: imageBase64, 
        duration: parseInt(durationStr) || 0, adWallet: 0, status: 'Active', 
        customDueAmount: "", customDueDate: "",
        parentPhone: parentPhone || "", batch: batchId || "Unassigned"
    };
    appData.students.unshift(newStudent);
    safeWrite('students', appData.students);
    
    recordTransaction("income", `Admission Fee - ${name} [${id}]`, parseFloat(paidNow), dateStr);
    renderStudentList(); 
    return id;
}

function recordTransaction(type, title, amount, dateStr, desc = "") {
    const newTx = { id: 'TXN' + Math.floor(Math.random() * 9000 + 1000), type: type, title: title, amount: parseFloat(amount), date: dateStr, description: desc };
    appData.transactions.push(newTx);
    appData.transactions.sort((a,b) => new Date(b.date) - new Date(a.date));
    recalculateStats(); 
    
    safeWrite('transactions', appData.transactions);
    safeWrite('stats', appData.stats);
    
    refreshAllUI(); 
}

function submitRegistration(e) {
    e.preventDefault();
    const date = document.getElementById('reg-date').value; const name = document.getElementById('reg-name').value;
    const course = document.getElementById('reg-course').value; const feeType = document.getElementById('reg-feetype').value;
    const gender = document.getElementById('reg-gender').value; const phone = document.getElementById('reg-phone').value;
    const parentPhone = document.getElementById('reg-parent-phone').value; const batch = document.getElementById('reg-batch').value;
    const totalFee = document.getElementById('reg-totalfee').value; const paid = document.getElementById('reg-paid').value;
    const duration = document.getElementById('reg-duration').value;
    const fileInput = document.getElementById('reg-image');

    const finishReg = function(base64Image) {
        const stId = addStudent(name, course, totalFee, paid, phone, date, feeType, gender, base64Image, duration, parentPhone, batch);
        
        try {
            let secondaryApp;
            if (firebase.apps.length < 2) {
                secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
            } else {
                secondaryApp = firebase.app("SecondaryApp");
            }
            let email = `${phone}@ei.com`;
            let firstName = String(name || "").trim().split(/\s+/)[0];
            let regYear = date.length >= 4 ? date.substring(0, 4) : new Date().getFullYear().toString();
            let password = `EI${firstName}${regYear}`;
            secondaryApp.auth().createUserWithEmailAndPassword(email, password).then(() => {
                secondaryApp.auth().signOut();
            }).catch(err => console.error("Auto-Auth creation failed:", err));
        } catch(e) {
            console.error("Auto-Auth execution error:", e);
        }

        alert(`Success! ${name} registered securely.`); 
        e.target.reset(); setDefaultDates(); switchTab('tuition'); croppedImages.reg = null;
    };

    if(croppedImages.reg) { finishReg(croppedImages.reg); } else { 
        if(fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(evt) { finishReg(evt.target.result); };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            finishReg(null);
        }
    }
}

function renderStudentList() {
    let totalTuition = 0;
    appData.transactions.forEach(tx => {
        let title = String(tx.title || "");
        if(tx.type === 'income' && !title.includes('Job Desk:') && !title.includes('Print Desk:')) {
            totalTuition += parseFloat(tx.amount) || 0;
        }
    });
    const tuitionSpan = document.getElementById('total-tuition-collected');
    if (tuitionSpan) tuitionSpan.innerText = totalTuition.toLocaleString('en-IN');

    const listEl = document.getElementById('student-list');
    const searchQ = document.getElementById('filter-search') ? document.getElementById('filter-search').value.toLowerCase() : '';
    const dueF = document.getElementById('filter-due') ? document.getElementById('filter-due').value : 'all';
    const courseF = document.getElementById('filter-course') ? document.getElementById('filter-course').value : 'all';
    const statusF = document.getElementById('filter-status') ? document.getElementById('filter-status').value : 'Active';

    listEl.innerHTML = '';
    if(appData.students.length === 0) {
        listEl.innerHTML = '<div class="text-center text-slate-400 mt-10"><i class="fa-solid fa-folder-open text-4xl mb-4 text-slate-200 block"></i><p class="font-bold text-slate-500">No students yet</p></div>'; return;
    }

    const courseSelect = document.getElementById('filter-course');
    if (courseSelect) {
        const currentVal = courseSelect.value;
        const uniqueCourses = [...new Set(appData.students.map(s => String(s.course || "")))];
        let optionsHtml = '<option value="all">All Batches</option>';
        uniqueCourses.forEach(c => { if(c) optionsHtml += `<option value="${c}">${c}</option>`; });
        courseSelect.innerHTML = optionsHtml; courseSelect.value = uniqueCourses.includes(currentVal) ? currentVal : 'all';
    }

    const filteredStudents = appData.students.filter(st => {
        const metrics = calculateExactDues(st);
        let dues = metrics.totalOutstanding;
        if (st.customDueAmount && st.customDueAmount !== "") dues = parseFloat(st.customDueAmount);
        
        const matchSearch = String(st.name || "").toLowerCase().includes(searchQ) || String(st.id || "").toLowerCase().includes(searchQ);
        const matchDue = dueF === 'all' || (dueF === 'pending' && dues > 0) || (dueF === 'cleared' && dues <= 0);
        const matchCourse = courseF === 'all' || st.course === courseF;
        const matchStatus = statusF === 'all' || (st.status || 'Active') === statusF;
        
        return matchSearch && matchDue && matchCourse && matchStatus;
    });

    if(filteredStudents.length === 0) {
        listEl.innerHTML = '<div class="text-center text-slate-400 mt-10 text-sm font-bold"><i class="fa-solid fa-magnifying-glass text-3xl mb-3 block text-slate-300"></i>No matches found</div>'; return;
    }

    filteredStudents.forEach(st => {
        const metrics = calculateExactDues(st);
        let dues = metrics.totalOutstanding;
        if (st.customDueAmount && st.customDueAmount !== "") dues = parseFloat(st.customDueAmount);

        const avatar = st.image ? `<img src="${st.image}" class="w-full h-full object-cover">` : `<span class="font-bold text-lg">${String(st.name || "?").charAt(0)}</span>`;
        const card = document.createElement('div');
        card.className = "flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-indigo-400 hover:shadow-lg transition-all group transform hover:-translate-y-1 shadow-sm";
        card.onclick = () => selectStudent(st.id);
        card.innerHTML = `
            <div class="flex items-center space-x-4 overflow-hidden">
                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors overflow-hidden shadow-inner shrink-0">${avatar}</div>
                <div class="truncate"><p class="font-extrabold text-slate-800 text-sm truncate">${st.name}</p><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5 truncate">${st.id} •${st.course}</p></div>
            </div>
            <div class="text-right shrink-0 ml-2"><p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Due</p><p class="${dues > 0 ? 'text-rose-500' : 'text-emerald-500'} font-black text-sm drop-shadow-sm">₹${dues.toFixed(2)}</p></div>
        `;
        listEl.appendChild(card);
    });
}

function renderMiniLedger(student) {
    const miniLedger = document.getElementById('student-mini-ledger');
    miniLedger.innerHTML = '';
    
    const stTx = appData.transactions.filter(t => {
        let title = String(t.title || "");
        return !title.includes('Job Desk:') && !title.includes('Print Desk:') && (title.includes(`[${student.id}]`) || (title.includes(String(student.name || "UNNAMED")) && !title.includes('[STU')));
    });
    
    if(stTx.length === 0) {
        if (student.paidFee > 0) {
            miniLedger.innerHTML = `
                <tr class="hover:bg-slate-100 transition-colors border-b border-slate-100">
                    <td class="py-3 px-3 text-slate-500 font-bold">${student.date || '-'}</td>
                    <td class="py-3 px-3 text-slate-800 font-bold max-w-[120px] truncate" title="Recovered Advance Payment">Prior Advance Payment</td>
                    <td class="py-3 px-3 text-right font-black text-emerald-600">+₹${student.paidFee}</td>
                    <td class="py-3 px-2 text-center"><i class="fa-solid fa-check text-emerald-400"></i></td>
                </tr>
            `;
        } else {
            miniLedger.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-xs text-slate-400 font-bold">No payment history found.</td></tr>'; 
        }
        return;
    }
    
    stTx.forEach(tx => {
        const isInc = tx.type === 'income';
        const cleanTitle = String(tx.title || "").replace(` - ${student.name}`, '').replace(` [${student.id}]`, '');
        miniLedger.innerHTML += `
            <tr class="hover:bg-slate-100 transition-colors border-b border-slate-100">
                <td class="py-3 px-3 text-slate-500 font-bold">${tx.date}</td>
                <td class="py-3 px-3 text-slate-800 font-bold max-w-[120px] truncate" title="${tx.title}">${cleanTitle}</td>
                <td class="py-3 px-3 text-right font-black ${isInc ? 'text-emerald-600' : 'text-rose-600'}">${isInc ? '+' : '-'}₹${tx.amount}</td>
                <td class="py-3 px-2 text-center">
                    <button type="button" onclick="shareTransactionWA('${tx.id}')" class="text-emerald-400 hover:text-emerald-600 transition-colors p-1" title="Share via WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                    <button type="button" onclick="deleteTransaction('${tx.id}')" class="text-rose-300 hover:text-rose-600 transition-colors p-1" title="Delete Payment"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function selectStudent(id) {
    const student = appData.students.find(s => s.id === id);
    if(!student) return;

    const metrics = calculateExactDues(student);

    document.getElementById('tuition-placeholder').classList.add('hidden');
    document.getElementById('tuition-active').classList.remove('hidden');
    document.getElementById('active-student-name').innerText = student.name;
    document.getElementById('active-student-course').innerText = `${student.course} (${student.duration || '?'} Months)`;
    document.getElementById('active-student-gender').innerText = student.gender || "N/A";
    document.getElementById('active-student-feetype').innerText = student.feeType || "Monthly";
    document.getElementById('tuition-student-id').value = student.id;
    document.getElementById('active-student-avatar').innerHTML = student.image ? `<img src="${student.image}" class="w-full h-full object-cover">` : String(student.name || "?").charAt(0);
    document.getElementById('active-student-date').innerText = student.date || "-";
    document.getElementById('active-student-phone').innerText = student.phone || "-";
    document.getElementById('active-student-totalfee').innerText = `₹${student.totalFee}`;
    document.getElementById('active-student-paidfee').innerText = `₹${metrics.actualPaid}`;
    document.getElementById('active-student-adwallet').innerText = `₹${metrics.adDiscount.toFixed(2)}`;

    const badgeEl = document.getElementById('active-student-badge');
    if(badgeEl) {
        if ((student.status || "") === 'Graduated') badgeEl.classList.remove('hidden');
        else badgeEl.classList.add('hidden');
    }

    let displayDue = metrics.totalOutstanding;
    if (student.customDueAmount && student.customDueAmount !== "") {
        displayDue = parseFloat(student.customDueAmount);
    }

    const dueEl = document.getElementById('active-student-dues');
    dueEl.innerText = `₹${displayDue.toFixed(2)}`;
    dueEl.className = displayDue <= 0 ? "text-3xl md:text-4xl font-black text-emerald-400 drop-shadow-md" : "text-3xl md:text-4xl font-black text-rose-400 drop-shadow-md";
    if(displayDue <= 0) dueEl.innerText = "Cleared";

    const dueLabel = dueEl.previousElementSibling;
    if(dueLabel) {
        if (student.customDueDate && student.customDueDate !== "") {
            dueLabel.innerText = 'Due By: ' + student.customDueDate;
            dueLabel.classList.add('text-rose-500');
        } else {
            dueLabel.innerText = 'Pending Course Dues';
            dueLabel.classList.remove('text-rose-500');
        }
    }

    renderMiniLedger(student);
    renderStudentFiles(student.id);
    if(window.innerWidth < 1024) document.getElementById('tuition-active').scrollIntoView({behavior: 'smooth'});
}

function renderLedger() {
    const tbody = document.getElementById('transaction-ledger'); tbody.innerHTML = '';
    if(appData.transactions.length === 0) return;
    appData.transactions.slice(0, 15).forEach(tx => {
        const isInc = tx.type === 'income';
        const badge = isInc ? `<span class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black tracking-widest shadow-sm">IN</span>` : `<span class="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black tracking-widest shadow-sm">OUT</span>`;
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                <td class="py-4 px-4 text-slate-500 text-xs font-bold whitespace-nowrap">${tx.date}</td>
                <td class="py-4 px-4 font-extrabold text-slate-800 min-w-[200px]">${String(tx.title || "").replace(/ \[STU.*\]/, '')}</td>
                <td class="py-4 px-4 text-center">${badge}</td>
                <td class="py-4 px-4 text-right font-black text-base ${isInc ? 'text-emerald-600' : 'text-rose-600'}">${isInc ? '+' : '-'}₹${tx.amount.toLocaleString('en-IN')}</td>
                <td class="py-4 px-2 text-center">
                    <button type="button" onclick="shareTransactionWA('${tx.id}')" class="text-emerald-400 hover:text-emerald-600 transition-colors p-1 mr-1" title="Share via WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                    <button type="button" onclick="openEditTransactionModal('${tx.id}')" class="text-indigo-300 hover:text-indigo-600 transition-colors p-1" title="Edit Record"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" onclick="deleteTransaction('${tx.id}')" class="text-rose-300 hover:text-rose-600 transition-colors p-1 ml-1" title="Delete Record"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderList(containerId, itemsFilterFn, titleReplace, iconClass, colorClass, emptyMsg) {
    const listEl = document.getElementById(containerId); listEl.innerHTML = '';
    const items = appData.transactions.filter(itemsFilterFn);
    if(items.length === 0) { listEl.innerHTML = `<div class="text-center text-slate-400 mt-10"><i class="${iconClass} text-4xl mb-4 text-slate-200 block"></i><p class="font-bold text-slate-500">${emptyMsg}</p></div>`; return; }
    items.forEach(tx => {
        const isInc = tx.type === 'income';
        listEl.innerHTML += `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 mb-3 gap-4">
                <div class="flex items-center space-x-4">
                    <div class="w-14 h-14 rounded-2xl bg-${colorClass}-50 text-${colorClass}-600 flex items-center justify-center text-2xl shadow-inner border border-${colorClass}-100 shrink-0"><i class="${iconClass}"></i></div>
                    <div><h4 class="font-extrabold text-slate-800 text-sm md:text-base">${String(tx.title || "").replace(titleReplace, '').replace(/ \[STU.*\]/, '')}</h4><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${tx.date} ${tx.description ? '• ' + tx.description : ''}</p></div>
                </div>
                <div class="flex items-center gap-2 sm:gap-4 self-end sm:self-auto">
                    <h3 class="text-xl md:text-2xl font-black drop-shadow-sm ${isInc ? 'text-emerald-600' : 'text-rose-600'}">${isInc ? '+' : '-'}₹${tx.amount.toLocaleString('en-IN')}</h3>
                    <div class="flex space-x-1">
                        <button type="button" onclick="shareTransactionWA('${tx.id}')" class="text-emerald-400 hover:text-emerald-600 transition-colors p-2" title="Share via WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                        <button type="button" onclick="openEditTransactionModal('${tx.id}')" class="text-indigo-300 hover:text-indigo-600 transition-colors p-2" title="Edit Record"><i class="fa-solid fa-pen"></i></button>
                        <button type="button" onclick="deleteTransaction('${tx.id}')" class="text-rose-300 hover:text-rose-600 transition-colors p-2" title="Delete Record"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
}
function renderExpenseList() { renderList('expense-list', t => t.type === 'expense', '', 'fa-solid fa-receipt', 'rose', 'No expenditures recorded.'); }
function renderJobList() { renderList('job-list', t => String(t.title || "").includes('Job Desk:'), 'Job Desk: ', 'fa-solid fa-user-tie', 'blue', 'No job applications yet.'); }
function renderPrintList() { renderList('print-list', t => String(t.title || "").includes('Print Desk:'), 'Print Desk: ', 'fa-solid fa-print', 'purple', 'No print income yet.'); }

// =========================================================
// ✏️ EDIT STUDENT & TRANSACTION LOGIC
// =========================================================
function openEditModal() {
    const stId = document.getElementById('tuition-student-id').value;
    const student = appData.students.find(s => s.id === stId);
    if(!student) return;

    document.getElementById('edit-student-id').value = student.id; 
    document.getElementById('edit-name').value = student.name;
    document.getElementById('edit-date').value = student.date || new Date().toISOString().split('T')[0];
    document.getElementById('edit-phone').value = student.phone || ''; 
    document.getElementById('edit-parent-phone').value = student.parentPhone || ''; 
    document.getElementById('edit-gender').value = student.gender || 'Male';
    document.getElementById('edit-course').value = student.course; 
    document.getElementById('edit-batch').value = student.batch || 'Unassigned'; 
    document.getElementById('edit-feetype').value = student.feeType || 'Monthly';
    document.getElementById('edit-totalfee').value = student.totalFee; 
    document.getElementById('edit-paidfee').value = getDynamicPaidFee(student);
    document.getElementById('edit-adwallet').value = student.adWallet || 0;
    document.getElementById('edit-duration').value = student.duration || 0;
    
    document.getElementById('edit-custom-due').value = student.customDueAmount || '';
    document.getElementById('edit-custom-date').value = student.customDueDate || '';
    
    const statusSelect = document.getElementById('edit-status');
    if (statusSelect) {
        statusSelect.value = student.status || 'Active';
    }

    const modal = document.getElementById('edit-student-modal'); const content = document.getElementById('edit-modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
}

function closeEditModal() {
    const modal = document.getElementById('edit-student-modal'); const content = document.getElementById('edit-modal-content');
    modal.classList.add('opacity-0'); content.classList.add('scale-95');
    setTimeout(() => { 
        modal.classList.add('hidden'); document.getElementById('edit-image').value = ''; croppedImages.edit = null; 
    }, 300);
}

function submitEditStudent(e) {
    e.preventDefault();
    const id = document.getElementById('edit-student-id').value; let student = appData.students.find(s => s.id === id);
    if(!student) return;

    const oldName = student.name;
    const newName = document.getElementById('edit-name').value;
    student.name = newName; 
    student.date = document.getElementById('edit-date').value;
    student.phone = document.getElementById('edit-phone').value; 
    student.parentPhone = document.getElementById('edit-parent-phone').value; 
    student.gender = document.getElementById('edit-gender').value;
    student.course = document.getElementById('edit-course').value; 
    student.batch = document.getElementById('edit-batch').value; 
    student.feeType = document.getElementById('edit-feetype').value;
    student.totalFee = parseFloat(document.getElementById('edit-totalfee').value);
    student.duration = parseInt(document.getElementById('edit-duration').value) || 0;
    student.adWallet = parseFloat(document.getElementById('edit-adwallet').value) || 0;
    
    student.customDueAmount = document.getElementById('edit-custom-due').value;
    student.customDueDate = document.getElementById('edit-custom-date').value;
    
    const statusSelect = document.getElementById('edit-status');
    if (statusSelect) {
        student.status = statusSelect.value;
    }
    
    if (oldName !== newName) {
        appData.transactions.forEach(tx => {
            let title = String(tx.title || "");
            if (!title.includes('Job Desk:') && !title.includes('Print Desk:') && (title.includes(`[${student.id}]`) || (title.includes(oldName) && !title.includes('[STU')))) { 
                tx.title = title.replace(oldName, newName); 
            }
            if (tx.description && (!title.includes('Job Desk:') && !title.includes('Print Desk:') && (title.includes(`[${student.id}]`) || String(tx.description).includes(oldName)))) { 
                tx.description = String(tx.description).replace(oldName, newName); 
            }
        });
    }

    const oldPaid = getDynamicPaidFee(student);
    const newPaid = parseFloat(document.getElementById('edit-paidfee').value);
    student.paidFee = newPaid;

    if(newPaid !== oldPaid) {
        const diff = newPaid - oldPaid;
        let targetTx = appData.transactions.find(tx => {
            let title = String(tx.title || "");
            return tx.type === 'income' && !title.includes('Job Desk:') && !title.includes('Print Desk:') && (title.includes(`[${student.id}]`) || (title.includes(student.name) && !title.includes('[STU')));
        });
        if (targetTx) { targetTx.amount = parseFloat(targetTx.amount) + diff; if(targetTx.amount < 0) targetTx.amount = 0; }
    }

    const fileInput = document.getElementById('edit-image');
    if(croppedImages.edit) {
        student.image = croppedImages.edit; croppedImages.edit = null; finalizeEdit(student);
    } else if(fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) { student.image = evt.target.result; finalizeEdit(student); };
        reader.readAsDataURL(fileInput.files[0]);
    } else { finalizeEdit(student); }
}

function finalizeEdit(student) { 
    closeEditModal(); 
    recalculateStats(); 
    safeWrite('students', appData.students);
    safeWrite('transactions', appData.transactions);
    refreshAllUI(); 
    alert("Profile updated successfully!"); 
}

function submitTuitionFee(e) {
    e.preventDefault();
    const stId = document.getElementById('tuition-student-id').value; const date = document.getElementById('tuition-date').value;
    const feeCategory = document.getElementById('tuition-feetype-select').value; const desc = document.getElementById('tuition-desc').value;
    const amount = parseFloat(document.getElementById('tuition-amount').value);
    let student = appData.students.find(s => s.id === stId);
    if(student) {
        if(feeCategory === "Course Tuition Fee" || feeCategory === "Admission Fee") { student.paidFee += amount; }
        const finalDesc = desc ? `${feeCategory} (${desc})` : feeCategory;
        recordTransaction("income", `${finalDesc} - ${student.name} [${student.id}]`, amount, date);
        alert(`₹${amount} recorded for ${student.name}!`); e.target.reset(); setDefaultDates(); selectStudent(stId); 
    }
}

function submitJobApp(e) {
    e.preventDefault();
    const date = document.getElementById('job-date').value; const name = document.getElementById('job-name').value;
    const post = document.getElementById('job-post').value; const amount = document.getElementById('job-amount').value;
    recordTransaction("income", `Job Desk: ${name}`, amount, date, post);
    e.target.reset(); setDefaultDates();
}

function submitPrintIncome(e) {
    e.preventDefault();
    const date = document.getElementById('print-date').value; const service = document.getElementById('print-service').value;
    const desc = document.getElementById('print-desc').value; const amount = document.getElementById('print-amount').value;
    recordTransaction("income", `Print Desk: ${service}`, amount, date, desc);
    e.target.reset(); setDefaultDates();
}

function submitExpense(e) {
    e.preventDefault();
    const date = document.getElementById('exp-date').value; const category = document.getElementById('exp-category').value;
    const amount = document.getElementById('exp-amount').value; const desc = document.getElementById('exp-desc').value;
    if(parseFloat(amount) > appData.stats.balance && !confirm("Expense is greater than balance. Proceed?")) return;
    recordTransaction("expense", category, amount, date, desc);
    e.target.reset(); setDefaultDates();
}

function openEditTransactionModal(txId) {
    const tx = appData.transactions.find(t => t.id === txId);
    if(!tx) return;
    let title = String(tx.title || "");
    if(title.includes("Tuition Fee") || title.includes("Admission") || title.includes("Advance")) {
        alert("Please edit student payments directly from their profile in the Student Database."); return;
    }
    document.getElementById('edit-tx-id').value = tx.id; document.getElementById('edit-tx-date').value = tx.date;
    document.getElementById('edit-tx-title').value = tx.title; document.getElementById('edit-tx-amount').value = tx.amount;
    document.getElementById('edit-tx-desc').value = tx.description || '';
    const modal = document.getElementById('edit-transaction-modal');
    modal.classList.remove('hidden'); setTimeout(() => { modal.classList.remove('opacity-0'); modal.querySelector('div').classList.remove('scale-95'); }, 10);
}

function closeEditTransactionModal() {
    const modal = document.getElementById('edit-transaction-modal'); modal.classList.add('opacity-0'); modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function submitEditTransaction(e) {
    e.preventDefault();
    const txId = document.getElementById('edit-tx-id').value; const tx = appData.transactions.find(t => t.id === txId);
    if(!tx) return;
    tx.date = document.getElementById('edit-tx-date').value; tx.title = document.getElementById('edit-tx-title').value;
    tx.amount = parseFloat(document.getElementById('edit-tx-amount').value); tx.description = document.getElementById('edit-tx-desc').value;
    recalculateStats(); 
    safeWrite('transactions', appData.transactions);
    safeWrite('stats', appData.stats);
    refreshAllUI(); closeEditTransactionModal(); alert("Record updated successfully!");
}

function deleteTransaction(txId) { openDeleteModal(txId, false); }

function openDeleteModal(id = null, isStudent = true) {
    if(isStudent) {
        const stId = document.getElementById('tuition-student-id').value; const student = appData.students.find(s => s.id === stId);
        if(!student) return;
        document.getElementById('delete-student-name').innerText = student.name; document.getElementById('delete-student-flag').value = 'true';
    } else {
        document.getElementById('delete-student-name').innerText = "this record"; document.getElementById('delete-transaction-id').value = id;
        document.getElementById('delete-student-flag').value = 'false';
    }
    document.getElementById('delete-password-input').value = ''; document.getElementById('delete-error').classList.add('hidden');
    const modal = document.getElementById('delete-student-modal'); const content = document.getElementById('delete-modal-content');
    modal.classList.remove('hidden'); setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-student-modal'); const content = document.getElementById('delete-modal-content');
    modal.classList.add('opacity-0'); content.classList.add('scale-95'); setTimeout(() => modal.classList.add('hidden'), 300);
}

async function executeDelete() {
    const pass = document.getElementById('delete-password-input').value;
    const errorMsg = document.getElementById('delete-error');
    const btnText = document.getElementById('delete-btn-text');
    const isStudent = document.getElementById('delete-student-flag').value === 'true';

    if(!pass) return;
    
    try {
        errorMsg.classList.add('hidden'); 
        btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Verifying...';
        
        await firebase.auth().signInWithEmailAndPassword('admin@ei.com', pass);
        
        btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Deleting...';

        setTimeout(() => {
            if(isStudent) {
                const stId = document.getElementById('tuition-student-id').value; let student = appData.students.find(s => s.id === stId);
                if(student) {
                    appData.students = appData.students.filter(s => s.id !== stId);
                    appData.transactions = appData.transactions.filter(tx => {
                        let title = String(tx.title || "");
                        return !(!title.includes('Job Desk:') && !title.includes('Print Desk:') && (title.includes(`[${student.id}]`) || (title.includes(student.name) && !title.includes('[STU'))));
                    });
                    document.getElementById('tuition-placeholder').classList.remove('hidden'); document.getElementById('tuition-active').classList.add('hidden');
                    alert(`${student.name} deleted.`);
                }
            } else {
                const txId = document.getElementById('delete-transaction-id').value; const txIndex = appData.transactions.findIndex(t => t.id === txId);
                if(txIndex !== -1) {
                    const tx = appData.transactions[txIndex];
                    let title = String(tx.title || "");
                    if (title.includes('Tuition') || title.includes('Admission') || title.includes('Advance')) {
                        appData.students.forEach(student => { 
                            if (!title.includes('Job Desk:') && !title.includes('Print Desk:') && (title.includes(`[${student.id}]`) || (title.includes(student.name) && !title.includes('[STU')))) { 
                                student.paidFee -= tx.amount; if(student.paidFee < 0) student.paidFee = 0; 
                            } 
                        });
                    }
                    appData.transactions.splice(txIndex, 1);
                    alert("Record deleted successfully.");
                }
            }
            recalculateStats(); 
            safeWrite('students', appData.students);
            safeWrite('transactions', appData.transactions);
            safeWrite('stats', appData.stats);
            refreshAllUI(); 
            closeDeleteModal(); 
            btnText.innerHTML = 'Confirm Delete';
        }, 300);

    } catch (e) {
        errorMsg.innerHTML = '<i class="fa-solid fa-circle-xmark mr-1"></i> Incorrect Admin Password!';
        errorMsg.classList.remove('hidden');
        btnText.innerHTML = 'Confirm Delete';
    }
}

// =========================================
// 🗂️ THE SMART-SPLIT FILE UPLOADER
// =========================================
function saveFileToDatabase(name, category, target, url, path, size, folderName = "Certificates", callback = null) {
    const newFile = {
        id: "FL" + Date.now(), name: name, category: category, target: target.toUpperCase(), url: url, path: path, size: size,
        date: new Date().toISOString().split('T')[0], folder: folderName
    };
    
    const isPublicMaterial = (category === 'Material' || category === 'Assignment');
    
    if (isPublicMaterial) {
        if (!appData.materials) appData.materials = [];
        appData.materials.push(newFile);
        safeWrite('materials', appData.materials);
    } else {
        if (!appData.files) appData.files = [];
        appData.files.push(newFile);
        safeWrite('files', appData.files);
    }

    if(callback) {
        callback();
    } else {
        const stId = document.getElementById('tuition-student-id').value;
        renderStudentFiles(stId);
    }
}

function handleStudentFileUpload(event) {
    const fileToUpload = event.target.files[0];
    if (!fileToUpload) return;
    
    const stId = document.getElementById('tuition-student-id').value;
    const student = appData.students.find(s => s.id === stId);
    if (!student) return;

    const storageRef = firebase.storage().ref();
    const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filePath = `vault/${Date.now()}_${safeName}`;
    const fileRef = storageRef.child(filePath);

    const progressBar = document.getElementById('upload-progress-bar');
    const progressContainer = document.getElementById('upload-progress-container');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    const uploadTask = fileRef.put(fileToUpload);

    uploadTask.on('state_changed', 
        (snapshot) => { progressBar.style.width = (snapshot.bytesTransferred / snapshot.totalBytes) * 100 + '%'; }, 
        (error) => {
            alert("File upload to Vault failed!\n\nFirebase Error: " + error.code + "\nMessage: " + error.message);
            progressContainer.classList.add('hidden');
            document.getElementById('student-doc-upload').value = '';
        }, 
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                progressContainer.classList.add('hidden');
                const sizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2);
                const targetVal = (student.phone && student.phone.toString().trim() !== "") ? String(student.phone).trim() : student.id;
                const formattedFileName = "Certificate - " + student.name;
                
                saveFileToDatabase(formattedFileName, "Certificate", targetVal, downloadURL, filePath, sizeMB, "Certificates", () => {
                    renderStudentFiles(stId);
                    alert("Document saved securely to Private Vault!");
                });
                document.getElementById('student-doc-upload').value = '';
            });
        }
    );
}

function submitMaterialUpload(e) {
    e.preventDefault();
    const title = document.getElementById('hub-mat-title').value.trim();
    const folder = document.getElementById('hub-mat-folder').value.trim() || 'General';
    const target = document.getElementById('hub-mat-target').value.trim();
    const fileInput = document.getElementById('hub-mat-file');
    const fileToUpload = fileInput.files[0];
    
    if (!fileToUpload) return alert("Please select a file.");

    const btn = document.getElementById('btn-mat-upload');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Uploading...';
    btn.disabled = true;

    const storageRef = firebase.storage().ref();
    const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filePath = `vault/${Date.now()}_${safeName}`;
    const fileRef = storageRef.child(filePath);

    const progressBar = document.getElementById('mat-progress-bar');
    const progressContainer = document.getElementById('mat-progress-container');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    const uploadTask = fileRef.put(fileToUpload);

    uploadTask.on('state_changed', 
        (snapshot) => { progressBar.style.width = (snapshot.bytesTransferred / snapshot.totalBytes) * 100 + '%'; }, 
        (error) => {
            alert("Upload failed: " + error.message);
            progressContainer.classList.add('hidden');
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }, 
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                progressContainer.classList.add('hidden');
                const sizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2);
                // Target is automatically converted to uppercase here for easy mapping
                saveFileToDatabase(title, "Material", target, downloadURL, filePath, sizeMB, folder, () => {
                    e.target.reset();
                    btn.innerHTML = originalBtnText;
                    btn.disabled = false;
                    renderHubFiles();
                    alert("Material Published Successfully to Public Vault!");
                });
            });
        }
    );
}

function submitAssignmentUpload(e) {
    e.preventDefault();
    const title = document.getElementById('hub-ass-title').value.trim();
    const target = document.getElementById('hub-ass-target').value.trim();
    const fileInput = document.getElementById('hub-ass-file');
    const fileToUpload = fileInput.files[0];
    
    if (!fileToUpload) return alert("Please select a file.");

    const btn = document.getElementById('btn-ass-upload');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Uploading...';
    btn.disabled = true;

    const storageRef = firebase.storage().ref();
    const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filePath = `vault/${Date.now()}_${safeName}`;
    const fileRef = storageRef.child(filePath);

    const progressBar = document.getElementById('ass-progress-bar');
    const progressContainer = document.getElementById('ass-progress-container');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    const uploadTask = fileRef.put(fileToUpload);

    uploadTask.on('state_changed', 
        (snapshot) => { progressBar.style.width = (snapshot.bytesTransferred / snapshot.totalBytes) * 100 + '%'; }, 
        (error) => {
            alert("Upload failed: " + error.message);
            progressContainer.classList.add('hidden');
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }, 
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                progressContainer.classList.add('hidden');
                const sizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2);
                saveFileToDatabase(title, "Assignment", target, downloadURL, filePath, sizeMB, "Assignments", () => {
                    e.target.reset();
                    btn.innerHTML = originalBtnText;
                    btn.disabled = false;
                    renderHubFiles();
                    alert("Assignment Published Successfully to Public Vault!");
                });
            });
        }
    );
}

function renderStudentFiles(stId) {
    const listEl = document.getElementById('student-files-list');
    if(!listEl) return;
    listEl.innerHTML = '';
    
    const student = appData.students.find(s => s.id === stId);
    const stPhone = student ? String(student.phone).trim() : "NONE";

    if (!appData.files) appData.files = [];
    const stFiles = appData.files.filter(f => {
        const t = String(f.target).trim();
        return (t === stId || t === stPhone) && f.folder === "Certificates";
    });
    
    if (stFiles.length === 0) {
        listEl.innerHTML = '<tr><td colspan="3" class="text-center py-6 text-xs text-slate-400 font-bold"><i class="fa-solid fa-folder-open text-2xl mb-2 text-slate-300 block"></i>No documents stored yet.</td></tr>';
        return;
    }
    
    stFiles.forEach(f => {
        listEl.innerHTML += `
            <tr class="hover:bg-slate-100 transition-colors border-b border-slate-100">
                <td class="py-3 px-3 text-slate-500 font-bold text-[10px]">${f.date || '-'}</td>
                <td class="py-3 px-3 text-slate-800 font-bold max-w-[150px] truncate" title="${f.name || f.filename}">
                    <a href="${f.url || f.file}" target="_blank" class="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"><i class="fa-solid fa-file-pdf text-rose-500 mr-1.5"></i>${f.name || f.filename || 'Document'}</a>
                </td>
                <td class="py-3 px-2 text-center">
                    <button type="button" onclick="deleteStudentFile('${f.path}', '${f.id}')" class="text-rose-300 hover:text-rose-600 transition-colors p-1" title="Delete Document"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// 🆕 UPDATED: Integrated Filtering, Search, and Legacy Base64 Formatting with CHECKBOXES
function renderHubFiles() {
    const listEl = document.getElementById('hub-files-list');
    if(!listEl) return;
    
    const searchInput = document.getElementById('hub-search');
    const visibilityFilter = document.getElementById('hub-filter-visibility');
    
    const searchQ = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const vis = visibilityFilter ? visibilityFilter.value : 'all';

    listEl.innerHTML = '';
    
    if (!appData.materials) appData.materials = [];
    
    let displayList = [...appData.materials];
    if (appData.files && appData.files.length > 0) {
        appData.files.forEach(f => {
            if ((f.category === 'Material' || f.category === 'Assignment') && !displayList.some(m => m.id === f.id)) {
                displayList.push(f);
            }
        });
    }
    
    // Apply Live Filters
    displayList = displayList.filter(f => {
        const name = String(f.name || f.title || f.filename || '').toLowerCase();
        const folder = String(f.folder || f.course || '').toLowerCase();
        const target = String(f.target || '').toUpperCase();
        
        // Match Search Query
        const matchesSearch = name.includes(searchQ) || folder.includes(searchQ) || target.toLowerCase().includes(searchQ);
        if (!matchesSearch) return false;
        
        // Match Visibility Dropdown
        if (vis === 'guest') {
            if (!target.includes('ALL')) return false; // Guest mode only sees targets with 'ALL'
        } else if (vis === 'private') {
            if (target.includes('ALL')) return false;  // Private files are course-specific
        }
        
        return true;
    });

    if (displayList.length === 0) {
        listEl.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-xs text-slate-400 font-bold"><i class="fa-solid fa-folder-open text-2xl mb-2 text-slate-300 block"></i>No hub files match your filter.</td></tr>';
        return;
    }
    
    displayList.slice().reverse().forEach(f => {
        // Safely extract names to support legacy Base64 files
        const displayName = f.name || f.title || f.filename || 'Unnamed Document';
        const displayFolder = f.folder || f.course || 'Unassigned';
        const displayTarget = f.target || 'N/A';
        const displayUrl = f.url || f.file || '';
        
        listEl.innerHTML += `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
                <td class="py-3 px-4 text-center">
                    <input type="checkbox" class="hub-file-checkbox w-4 h-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" value="${f.id}">
                </td>
                <td class="py-3 px-2 text-slate-500 font-bold text-xs">${f.date || '-'}</td>
                <td class="py-3 px-4 text-indigo-600 font-bold text-xs">${f.category || 'Material'}</td>
                <td class="py-3 px-4 text-slate-600 font-bold text-xs">${displayTarget} / ${displayFolder}</td>
                <td class="py-3 px-4 text-slate-800 font-bold text-xs max-w-[150px] truncate" title="${displayName}">
                    <a href="${displayUrl}" target="_blank" class="hover:text-indigo-800 hover:underline transition-colors"><i class="fa-solid fa-file-pdf text-rose-500 mr-1.5"></i>${displayName}</a>
                </td>
                <td class="py-3 px-2 text-center whitespace-nowrap">
                    <button type="button" onclick="openEditFileModal('${f.id}')" class="text-indigo-400 hover:text-indigo-600 transition-colors p-1 mr-1" title="Edit File Data"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" onclick="deleteHubFile('${f.path || ''}', '${f.id}')" class="text-rose-300 hover:text-rose-600 transition-colors p-1" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// 🆕 NEW: Select/Deselect all checkboxes in the Hub Files table
function toggleAllHubFiles(source) {
    const checkboxes = document.querySelectorAll('.hub-file-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

// 🆕 NEW: Duplicates selected files to the opposite Database Node
async function duplicateSelectedFiles() {
    const checkboxes = document.querySelectorAll('.hub-file-checkbox:checked');
    if (checkboxes.length === 0) {
        alert("Please select at least one file to duplicate.");
        return;
    }

    if (!confirm(`Are you sure you want to duplicate ${checkboxes.length} selected file(s)?\n\nFiles will be cross-copied between the Public Vault (Materials) and Private Vault (Files) as reference links.`)) return;

    let filesUpdated = false;
    let materialsUpdated = false;

    checkboxes.forEach(cb => {
        const fileId = cb.value;
        let sourceFile = appData.materials.find(f => f.id === fileId);
        let isMaterial = true;
        
        if (!sourceFile) {
            sourceFile = appData.files.find(f => f.id === fileId);
            isMaterial = false;
        }

        if (sourceFile) {
            // Create a deep copy of the original object
            let clonedFile = JSON.parse(JSON.stringify(sourceFile));
            
            // Assign a completely unique ID to prevent overlap
            clonedFile.id = "FL" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
            
            // Append (Copy) to the name so the user knows which is which
            if (clonedFile.name) clonedFile.name += " (Copy)";
            if (clonedFile.title) clonedFile.title += " (Copy)";
            if (clonedFile.filename) clonedFile.filename += " (Copy)";
            
            // Update the generation date to today
            clonedFile.date = new Date().toISOString().split('T')[0];
            
            // Cross-copy logic
            if (isMaterial) {
                if (!appData.files) appData.files = [];
                appData.files.push(clonedFile);
                filesUpdated = true;
            } else {
                if (!appData.materials) appData.materials = [];
                appData.materials.push(clonedFile);
                materialsUpdated = true;
            }
        }
    });

    try {
        const promises = [];
        if (filesUpdated) promises.push(safeWrite('files', appData.files));
        if (materialsUpdated) promises.push(safeWrite('materials', appData.materials));
        
        await Promise.all(promises);
        
        alert("Files duplicated successfully! You can now edit the copies or delete the originals to rearrange them.");
        
        const masterCb = document.getElementById('selectAllHubFiles');
        if(masterCb) masterCb.checked = false;
        
        renderHubFiles();
    } catch (e) {
        alert("Error duplicating files: " + e.message);
    }
}

// =========================================
// ✏️ EDIT FILE METADATA MODAL LOGIC
// =========================================
function openEditFileModal(fileId) {
    let file = appData.materials.find(f => f.id === fileId);
    let isMaterial = true;
    
    if (!file) {
        file = appData.files.find(f => f.id === fileId);
        isMaterial = false;
    }
    if (!file) return;

    // Support for Legacy File Fields
    document.getElementById('edit-file-id').value = file.id;
    document.getElementById('edit-file-category').value = isMaterial ? 'materials' : 'files';
    document.getElementById('edit-file-name').value = file.name || file.title || file.filename || '';
    document.getElementById('edit-file-folder').value = file.folder || file.course || '';
    document.getElementById('edit-file-target').value = file.target || '';

    const modal = document.getElementById('edit-file-modal');
    const content = document.getElementById('edit-file-content');
    modal.classList.remove('hidden');
    setTimeout(() => { 
        modal.classList.remove('opacity-0'); 
        content.classList.remove('scale-95'); 
    }, 10);
}

function closeEditFileModal() {
    const modal = document.getElementById('edit-file-modal'); 
    const content = document.getElementById('edit-file-content');
    if(modal && content) {
        modal.classList.add('opacity-0'); 
        content.classList.add('scale-95');
        setTimeout(() => { 
            modal.classList.add('hidden'); 
            document.getElementById('edit-file-form').reset();
        }, 300);
    }
}

async function submitEditFile(e) {
    e.preventDefault();
    const id = document.getElementById('edit-file-id').value;
    const categoryNode = document.getElementById('edit-file-category').value;
    
    const newName = document.getElementById('edit-file-name').value.trim();
    const newFolder = document.getElementById('edit-file-folder').value.trim();
    const newTarget = document.getElementById('edit-file-target').value.trim().toUpperCase();

    let fileList = categoryNode === 'materials' ? appData.materials : appData.files;
    let file = fileList.find(f => f.id === id);
    
    if (file) {
        // Update Primary Engine Fields
        file.name = newName;
        file.folder = newFolder;
        file.target = newTarget;
        
        // Sync Legacy Engine Fields dynamically so old data doesn't break
        if(file.title !== undefined) file.title = newName;
        if(file.filename !== undefined) file.filename = newName;
        if(file.course !== undefined) file.course = newFolder;

        await safeWrite(categoryNode, fileList);
        alert("File details updated successfully!");
        closeEditFileModal();
        renderHubFiles();
    }
}

function deleteStudentFile(path, fileId) {
    if(!confirm("Are you sure you want to permanently delete this document?")) return;
    
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(path);
    
    fileRef.delete().then(() => {
        appData.files = appData.files.filter(f => f.id !== fileId);
        safeWrite('files', appData.files);
        
        const stId = document.getElementById('tuition-student-id').value;
        renderStudentFiles(stId);
    }).catch((error) => {
        console.error("Firebase deletion failed:", error);
        
        // Ensure database record is deleted even if file is missing in storage
        appData.files = appData.files.filter(f => f.id !== fileId);
        safeWrite('files', appData.files);
        
        const stId = document.getElementById('tuition-student-id').value;
        renderStudentFiles(stId);
    });
}

function deleteHubFile(path, fileId) {
    if(!confirm("Are you sure you want to delete this file from the hub?")) return;
    
    // Check if the path actually exists (prevents crash on old base64 files)
    if(path && path.trim() !== '' && path !== 'undefined') {
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(path);
        
        fileRef.delete().then(() => {
            _removeFileFromDatabase(fileId);
        }).catch((error) => {
            console.error("Firebase deletion failed:", error);
            _removeFileFromDatabase(fileId);
        });
    } else {
        // Handle Legacy Base64 files that do not have a Storage Path
        _removeFileFromDatabase(fileId);
    }
}

function _removeFileFromDatabase(fileId) {
    appData.materials = appData.materials.filter(f => f.id !== fileId);
    safeWrite('materials', appData.materials);
    
    appData.files = appData.files.filter(f => f.id !== fileId);
    safeWrite('files', appData.files);
    
    renderHubFiles();
}

// =========================================
// BROADCAST / ALERTS LOGIC
// =========================================
function submitBroadcast(e) {
    e.preventDefault();
    const target = document.getElementById('bc-target').value.trim();
    const title = document.getElementById('bc-title').value.trim();
    const message = document.getElementById('bc-message').value.trim();
    
    const now = new Date();
    const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    const dateString = now.toLocaleString('en-IN', options).replace(/am/i, 'AM').replace(/pm/i, 'PM');
    
    if (!appData.notices) appData.notices = [];
    
    const newNotice = {
        id: 'NOT' + Date.now(),
        title: '📢 ' + title,
        message: 'Target: ' + target.toUpperCase() + '\n\n' + message,
        date: dateString
    };

    appData.notices.unshift(newNotice);
    safeWrite('notices', appData.notices);
    
    renderBroadcastList();
    e.target.reset();
    alert("Broadcast Alert Sent!");
}

function renderBroadcastList() {
    const listEl = document.getElementById('broadcast-list');
    if(!listEl) return;
    listEl.innerHTML = '';
    
    if (!appData.notices || appData.notices.length === 0) {
        listEl.innerHTML = '<div class="text-center text-slate-400 mt-10"><i class="fa-solid fa-satellite-dish text-4xl mb-4 text-slate-200 block"></i><p class="font-bold text-slate-500">No broadcasts sent yet.</p></div>';
        return;
    }
    
    appData.notices.forEach((n, index) => {
        listEl.innerHTML += `
            <div class="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-3 shadow-sm flex justify-between items-start">
                <div class="flex-1 mr-4">
                    <h4 class="font-bold text-slate-800 text-base">${n.title}</h4>
                    <p class="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-2">${n.date}</p>
                    <p class="text-sm text-slate-600 whitespace-pre-wrap">${n.message}</p>
                </div>
                <button type="button" onclick="deleteBroadcast(${index})" class="text-rose-400 hover:text-rose-600 p-2 transition-colors"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
}

function deleteBroadcast(index) {
    if(!confirm("Are you sure you want to permanently delete this broadcast?")) return;
    appData.notices.splice(index, 1);
    safeWrite('notices', appData.notices);
    renderBroadcastList();
}

// =========================================
// 🪑 SEATING & BATCH MANAGEMENT ENGINE
// =========================================
function renderSeatingLayout() {
    const batch = document.getElementById('active-seating-batch').value;
    const theoryContainer = document.getElementById('theory-room-seats');
    const labContainer = document.getElementById('practical-room-seats');
    
    if(!theoryContainer || !labContainer) return;

    theoryContainer.innerHTML = '';
    labContainer.innerHTML = '';
    
    // Generate 10 Theory Dropzones
    for(let i=1; i<=10; i++) {
        theoryContainer.innerHTML += `
            <div id="theory-seat-${i}" class="h-20 bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center relative transition-colors" ondrop="dropSeat(event, 'theory-${i}')" ondragover="allowDrop(event)" ondragleave="dragLeave(event)">
                <span class="absolute top-1 left-2 text-[9px] font-bold text-indigo-300 pointer-events-none">T-${i}</span>
            </div>`;
    }

    // Generate 10 Lab Dropzones
    for(let i=1; i<=10; i++) {
        labContainer.innerHTML += `
            <div id="practical-seat-${i}" class="h-20 bg-emerald-50/50 border-2 border-dashed border-emerald-200 rounded-xl flex items-center justify-center relative transition-colors" ondrop="dropSeat(event, 'practical-${i}')" ondragover="allowDrop(event)" ondragleave="dragLeave(event)">
                <span class="absolute top-1 left-2 text-[9px] font-bold text-emerald-300 pointer-events-none">L-${i}</span>
            </div>`;
    }

    // Populate assigned seats
    if(appData.seating && appData.seating[batch]) {
        const bSeats = appData.seating[batch];
        for(let seatId in bSeats) {
            const stId = bSeats[seatId];
            if(stId) {
                const st = appData.students.find(s => s.id === stId);
                if(st) {
                    const seatEl = document.getElementById(seatId);
                    if(seatEl) {
                        seatEl.innerHTML = ''; // clear background text
                        seatEl.appendChild(createDraggableStudentCard(st, true));
                    }
                }
            }
        }
    }
    filterSeatingStudents(); // Refresh left panel
}

function filterSeatingStudents() {
    const q = document.getElementById('seating-search').value.toLowerCase();
    const list = document.getElementById('draggable-students-list');
    if(!list) return;
    list.innerHTML = '';

    // Find all currently seated students in the DOM
    const seatedIds = new Set();
    document.querySelectorAll('#theory-room-seats [id^="drag-"], #practical-room-seats [id^="drag-"]').forEach(el => {
        seatedIds.add(el.dataset.id);
    });

    // Filter active students who are NOT currently seated
    const activeSt = appData.students.filter(s => 
        (s.status || 'Active') === 'Active' && 
        !seatedIds.has(s.id) &&
        (String(s.name).toLowerCase().includes(q) || String(s.course).toLowerCase().includes(q))
    );

    // Sort: students belonging to the active batch float to top
    const batch = document.getElementById('active-seating-batch').value;
    activeSt.sort((a, b) => {
        if(a.batch === batch && b.batch !== batch) return -1;
        if(a.batch !== batch && b.batch === batch) return 1;
        return 0;
    });

    if(activeSt.length === 0) {
        list.innerHTML = '<p class="text-xs text-center text-slate-400 mt-10 font-bold"><i class="fa-solid fa-chair text-2xl mb-2 text-slate-300 block"></i>No available students found.</p>';
        return;
    }

    activeSt.forEach(st => {
        list.appendChild(createDraggableStudentCard(st, false));
    });
}

function createDraggableStudentCard(st, inSeat = false) {
    const el = document.createElement('div');
    el.id = `drag-${st.id}`;
    el.draggable = true;
    el.dataset.id = st.id;
    
    el.ondragstart = (e) => {
        e.dataTransfer.setData("text", e.target.id);
        setTimeout(() => e.target.classList.add('opacity-50'), 0);
    };
    el.ondragend = (e) => {
        e.target.classList.remove('opacity-50');
    };
    
    const avatar = st.image ? 
        `<img src="${st.image}" class="${inSeat ? 'w-8 h-8 rounded-full mb-1' : 'w-10 h-10 rounded-xl'} object-cover shrink-0 pointer-events-none">` : 
        `<div class="${inSeat ? 'w-8 h-8 rounded-full mb-1 text-xs' : 'w-10 h-10 rounded-xl text-lg'} bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 pointer-events-none">${st.name.charAt(0)}</div>`;

    if(inSeat) {
        el.className = "w-full h-full bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing relative group p-1 transition-all";
        el.innerHTML = `
            ${avatar}
            <p class="text-[9px] font-bold text-slate-700 truncate w-full text-center pointer-events-none">${st.name.split(' ')[0]}</p>
            <button type="button" onclick="removeStudentFromSeat(this, '${st.id}')" class="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-rose-600 shadow-sm"><i class="fa-solid fa-xmark"></i></button>
        `;
    } else {
        const batchBadge = (st.batch === document.getElementById('active-seating-batch').value) 
            ? `<span class="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] ml-1 shrink-0">THIS BATCH</span>` 
            : '';
            
        el.className = "bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-colors flex items-center gap-3";
        el.innerHTML = `
            ${avatar}
            <div class="flex-1 min-w-0 pointer-events-none flex flex-col justify-center">
                <p class="font-bold text-slate-800 text-sm truncate w-full">${st.name}</p>
                <div class="flex items-center w-full overflow-hidden mt-0.5">
                    <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate">${st.batch || 'Unassigned'} • ${st.course}</p>
                    ${batchBadge}
                </div>
            </div>
        `;
    }
    return el;
}

function allowDrop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50');
}

function dragLeave(ev) {
    ev.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
}

function dropSeat(ev, seatPrefix) {
    ev.preventDefault();
    const target = ev.currentTarget;
    target.classList.remove('border-indigo-500', 'bg-indigo-50');
    
    const dataId = ev.dataTransfer.getData("text");
    const draggedEl = document.getElementById(dataId);
    if(!draggedEl) return;
    
    const stId = draggedEl.dataset.id;
    const st = appData.students.find(s => s.id === stId);
    if(!st) return;

    // Clear seat if occupied
    if (target.querySelectorAll('[id^="drag-"]').length > 0) {
        target.innerHTML = '';
    }

    target.appendChild(createDraggableStudentCard(st, true));
    filterSeatingStudents(); // Removes them from left panel
}

function removeStudentFromSeat(btn, stId) {
    const card = btn.closest('[id^="drag-"]');
    if(card) {
        const seat = card.parentElement;
        const seatId = seat.id;
        card.remove();
        
        // Restore seat background text
        const prefix = seatId.includes('theory') ? 'T' : 'L';
        const num = seatId.split('-')[2];
        const color = seatId.includes('theory') ? 'text-indigo-300' : 'text-emerald-300';
        seat.innerHTML = `<span class="absolute top-1 left-2 text-[9px] font-bold ${color} pointer-events-none">${prefix}-${num}</span>`;
        
        filterSeatingStudents();
    }
}

async function saveSeatingArrangement() {
    const batch = document.getElementById('active-seating-batch').value;
    if(!appData.seating) appData.seating = {};
    appData.seating[batch] = {};

    const processRoom = (roomId) => {
        const seats = document.getElementById(roomId).children;
        for(let seat of seats) {
            const card = seat.querySelector('[id^="drag-"]');
            if(card) {
                appData.seating[batch][seat.id] = card.dataset.id;
                // Auto-update student's batch in their profile
                const st = appData.students.find(s => s.id === card.dataset.id);
                if(st && st.batch !== batch) { st.batch = batch; }
            }
        }
    };
    processRoom('theory-room-seats');
    processRoom('practical-room-seats');

    try {
        await Promise.all([
            safeWrite(`seating/${batch}`, appData.seating[batch]),
            safeWrite('students', appData.students)
        ]);
        alert(`Seating layout for ${batch} Batch saved successfully!`);
    } catch(e) {
        alert("Error saving seating layout: " + e.message);
    }
}

// =========================================
// 📥 BATCH CHANGE REQUEST INBOX
// =========================================
function renderBatchRequests() {
    const listEl = document.getElementById('batch-requests-list');
    const countEl = document.getElementById('batch-request-count');
    if(!listEl) return;
    
    if(!appData.batchRequests) appData.batchRequests = [];
    const pendingReqs = appData.batchRequests.filter(r => r.status === 'Pending');
    
    countEl.innerText = `${pendingReqs.length} Pending`;
    listEl.innerHTML = '';
    
    if(pendingReqs.length === 0) {
        listEl.innerHTML = '<div class="text-center text-slate-400 mt-8"><i class="fa-solid fa-check-circle text-3xl mb-2 text-emerald-400 block"></i><p class="font-bold text-xs">Inbox is empty!</p></div>';
        return;
    }

    pendingReqs.forEach(req => {
        const st = appData.students.find(s => s.id === req.studentId) || {name: 'Unknown', phone: ''};
        listEl.innerHTML += `
            <div class="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-slate-800 text-sm leading-tight">${st.name}</h4>
                        <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">${st.phone} • Curr: ${st.batch || 'Unassigned'}</p>
                    </div>
                    <span class="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-1 rounded tracking-widest shrink-0">PENDING</span>
                </div>
                <p class="text-xs text-slate-700 mb-2 mt-2 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <i class="fa-solid fa-arrow-right-arrow-left text-indigo-500 mr-1.5"></i>
                    Wants to switch to <strong class="text-indigo-700">${req.requestedBatch} Batch</strong>
                </p>
                <div class="flex gap-2 mt-auto pt-2">
                    <button type="button" onclick="approveBatchRequest('${req.id}')" class="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"><i class="fa-solid fa-check mr-1"></i> Approve</button>
                    <button type="button" onclick="rejectBatchRequest('${req.id}')" class="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"><i class="fa-solid fa-xmark mr-1"></i> Reject</button>
                </div>
            </div>
        `;
    });
}

async function approveBatchRequest(reqId) {
    const req = appData.batchRequests.find(r => r.id === reqId);
    if(!req) return;
    const st = appData.students.find(s => s.id === req.studentId);
    
    if(st) {
        st.batch = req.requestedBatch;
        await safeWrite('students', appData.students);
    }
    req.status = 'Approved';
    await safeWrite('batch_requests', appData.batchRequests);
    
    alert(`Approved! ${st ? st.name : 'Student'} has been assigned to ${req.requestedBatch} Batch.`);
    renderBatchRequests();
    filterSeatingStudents();
    if(document.getElementById('view-tuition').classList.contains('active')) renderStudentList();
}

async function rejectBatchRequest(reqId) {
    if(!confirm("Reject this batch change request?")) return;
    const req = appData.batchRequests.find(r => r.id === reqId);
    if(!req) return;
    req.status = 'Rejected';
    await safeWrite('batch_requests', appData.batchRequests);
    alert(`Request rejected.`);
    renderBatchRequests();
}
