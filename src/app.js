import { auth } from './lib/firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { login, logout } from './auth/login.js';
import { register } from './auth/register.js';
import { sendOTP, verifyOTP } from './auth/otp.js';
import { getUserDocuments, getDocument } from './docs/fetch.js';
import { uploadDocument } from './docs/upload.js';
import { deleteDocument as deleteDocAction } from './docs/delete.js';
import { shareDocument } from './docs/share.js';
import { getProfile, updateProfile } from './profile/profile.js';
import { components } from './ui/components.js';
import { toasts } from './ui/toasts.js';
import logger from './lib/logger.js';

const contentDiv = document.getElementById('content');
const nav = document.getElementById('main-nav');

const CATEGORY_LABELS = {
    identity: 'Identity (PAN, Passport)',
    education: 'Education (Mark sheets)',
    medical: 'Medical Records',
    other: 'Other'
};

// Diagnostic check to help you troubleshoot
async function runDiagnostics() {
    console.log("Running Firebase Diagnostics...");
    try {
        if (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY.includes("YOUR_")) {
            throw new Error("Firebase API Key is missing or using placeholder in .env file.");
        }
        console.log("✅ Configuration loaded.");
    } catch (err) {
        contentDiv.innerHTML = `
            <div class="card error">
                <h3>Configuration Error</h3>
                <p>${err.message}</p>
                <p>Please check your <code>.env</code> file and restart the server.</p>
            </div>
        `;
        return false;
    }
    return true;
}

let currentUser = null;

// Initialize app after diagnostics
runDiagnostics().then(ok => {
    if (!ok) return;

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            logger.info('Auth state changed: logged in', { uid: user.uid });
            renderDashboard(user);
        } else {
            logger.info('Auth state changed: logged out');
            renderLogin();
        }
    });
});

function renderLogin() {
    nav.innerHTML = '';
    contentDiv.innerHTML = `
        <div class="card" style="max-width: 440px; margin: 4rem auto;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2 style="margin-bottom: 0.5rem;">Welcome Back</h2>
                <p style="color: var(--text-muted); font-size: 0.875rem;">Access your secure government documents</p>
            </div>
            <div id="auth-tabs" style="display: flex; gap: 4px; padding: 4px; background: #f1f5f9; border-radius: 0.6rem;">
                <button id="show-login" style="flex: 1; padding: 0.5rem;" class="active">Login</button>
                <button id="show-register" style="flex: 1; padding: 0.5rem;">Register</button>
            </div>
            <div id="form-container" style="margin-top: 1.5rem;"></div>
            <div id="auth-error" style="margin-top: 1rem;"></div>
        </div>
    `;
    
    const loginBtn = document.getElementById('show-login');
    const registerBtn = document.getElementById('show-register');

    loginBtn.onclick = () => {
        loginBtn.classList.add('active');
        registerBtn.classList.remove('active');
        loadAuthForm('login');
    };
    registerBtn.onclick = () => {
        registerBtn.classList.add('active');
        loginBtn.classList.remove('active');
        loadAuthForm('register');
    };
    
    loadAuthForm('login');
}

async function loadAuthForm(type) {
    const formContainer = document.getElementById('form-container');
    const errorDiv = document.getElementById('auth-error');
    errorDiv.innerHTML = '';

    if (type === 'login') {
        formContainer.innerHTML = `
            <form id="login-form">
                <div class="form-group">
                    <label for="login-email">Email Address</label>
                    <input type="email" id="login-email" placeholder="name@example.com" required>
                </div>
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" placeholder="••••••••" required>
                </div>
                <button type="submit" style="width: 100%; margin-top: 1rem;">Sign In</button>
            </form>
        `;
        document.getElementById('login-form').onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                // Phase 1: OTP Step
                formContainer.innerHTML = `
                    <div style="text-align: center;">
                        <p style="margin-bottom: 1rem;">A verification code has been sent to <strong>${email}</strong></p>
                        <form id="otp-verify-form">
                            <div class="form-group">
                                <label for="otp-code">Enter 6-digit OTP</label>
                                <input type="text" id="otp-code" placeholder="123456" required pattern="[0-9]{6}" maxlength="6" style="text-align: center; letter-spacing: 0.5rem; font-size: 1.25rem;">
                            </div>
                            <button type="submit" style="width: 100%; margin-top: 1rem;">Verify & Sign In</button>
                            <button type="button" id="btn-back-login" class="secondary" style="width: 100%; margin-top: 0.5rem;">Back</button>
                        </form>
                    </div>
                `;

                const generatedOtp = await sendOTP(email);
                toasts.show(`OTP sent! Code: ${generatedOtp}`, 'info', 10000);

                document.getElementById('btn-back-login').onclick = () => loadAuthForm('login');

                document.getElementById('otp-verify-form').onsubmit = async (e) => {
                    e.preventDefault();
                    const otp = document.getElementById('otp-code').value;
                    try {
                        await verifyOTP(otp);
                        
                        await login(email, password);
                        toasts.show('Welcome back!', 'success');
                    } catch (err) {
                        toasts.show(err.message, 'error');
                    }
                };
            } catch (err) {
                errorDiv.innerHTML = components.errorCard(err.message);
            }
        };
    } else {
        formContainer.innerHTML = `
            <form id="register-form">
                <div class="form-group">
                    <label for="reg-name">Full Name</label>
                    <input type="text" id="reg-name" placeholder="John Doe" required>
                </div>
                <div class="form-group">
                    <label for="reg-email">Email Address</label>
                    <input type="email" id="reg-email" placeholder="name@example.com" required>
                </div>
                <div class="form-group">
                    <label for="reg-password">Password</label>
                    <input type="password" id="reg-password" placeholder="••••••••" required>
                </div>
                <div class="form-group">
                    <label for="reg-aadhaar">Aadhaar Number</label>
                    <input type="text" id="reg-aadhaar" placeholder="123456789012" required pattern="[0-9]{12}">
                </div>
                <button type="submit" style="width: 100%; margin-top: 1rem;">Create Account</button>
            </form>
        `;
        document.getElementById('register-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const aadhaar = document.getElementById('reg-aadhaar').value;
            
            try {
                // Phase 1: OTP Step for Aadhaar/Email verification
                formContainer.innerHTML = `
                    <div style="text-align: center;">
                        <p style="margin-bottom: 1rem;">Verification code sent to <strong>${email}</strong> for Aadhaar <strong>XXXX-XXXX-${aadhaar.slice(-4)}</strong></p>
                        <form id="otp-reg-form">
                            <div class="form-group">
                                <label for="otp-reg-code">Enter 6-digit OTP</label>
                                <input type="text" id="otp-reg-code" placeholder="123456" required pattern="[0-9]{6}" maxlength="6" style="text-align: center; letter-spacing: 0.5rem; font-size: 1.25rem;">
                            </div>
                            <button type="submit" style="width: 100%; margin-top: 1rem;">Verify & Register</button>
                            <button type="button" id="btn-back-reg" class="secondary" style="width: 100%; margin-top: 0.5rem;">Back</button>
                        </form>
                    </div>
                `;

                const generatedOtp = await sendOTP(email);
                toasts.show(`Verification code sent! Code: ${generatedOtp}`, 'info', 10000);

                document.getElementById('btn-back-reg').onclick = () => loadAuthForm('register');

                document.getElementById('otp-reg-form').onsubmit = async (e) => {
                    e.preventDefault();
                    const otp = document.getElementById('otp-reg-code').value;
                    try {
                        await verifyOTP(otp);
                        
                        await register(email, password, name, aadhaar);
                        toasts.show('Account created successfully!', 'success');
                    } catch (err) {
                        toasts.show(err.message, 'error');
                    }
                };
            } catch (err) {
                errorDiv.innerHTML = components.errorCard(err.message);
            }
        };
    }
}

function renderDashboard(user) {
    nav.innerHTML = `
        <a href="#" id="nav-docs" class="active">Documents</a>
        <a href="#" id="nav-profile">Profile</a>
        <button id="nav-logout" class="link">Logout</button>
    `;
    
    contentDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2 id="view-title" style="margin: 0;">My Documents</h2>
            <button id="btn-upload-view">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Upload New
            </button>
        </div>
        <div id="doc-action-container"></div>
        <div id="main-view-content">
            <div class="card" style="text-align: center; padding: 4rem 2rem;">
                <p style="color: var(--text-muted);">Loading your documents...</p>
            </div>
        </div>
    `;
    
    document.getElementById('nav-logout').onclick = (e) => {
        e.preventDefault();
        logout();
        toasts.show('Logged out safely', 'info');
    };

    document.getElementById('btn-upload-view').onclick = () => showUploadForm();
    document.getElementById('nav-docs').onclick = (e) => {
        e.preventDefault();
        document.getElementById('nav-docs').classList.add('active');
        document.getElementById('nav-profile').classList.remove('active');
        renderDashboard(currentUser);
    };
    document.getElementById('nav-profile').onclick = (e) => {
        e.preventDefault();
        document.getElementById('nav-profile').classList.add('active');
        document.getElementById('nav-docs').classList.remove('active');
        renderProfile();
    };

    loadDocuments();
}

function showUploadForm() {
    const container = document.getElementById('doc-action-container');
    container.innerHTML = `
        <div class="card" style="border: 2px dashed var(--border); background: var(--background);">
            <h3 style="margin-bottom: 1rem;">Upload Document</h3>
            <form id="upload-form">
                <div class="form-group">
                    <label>Select File</label>
                    <input type="file" id="doc-file" required>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="doc-category" style="padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border); font-family: inherit;">
                        <option value="identity">Identity (PAN, Passport)</option>
                        <option value="education">Education (Mark sheets)</option>
                        <option value="medical">Medical Records</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="submit" style="flex: 1;">Start Upload</button>
                    <button type="button" id="btn-cancel-upload" class="secondary" style="flex: 1;">Cancel</button>
                </div>
            </form>
            <div id="upload-status" style="margin-top: 1rem;"></div>
        </div>
    `;

    document.getElementById('btn-cancel-upload').onclick = () => {
        container.innerHTML = '';
    };

    document.getElementById('upload-form').onsubmit = async (e) => {
        e.preventDefault();
        const file = document.getElementById('doc-file').files[0];
        const category = document.getElementById('doc-category').value;
        const status = document.getElementById('upload-status');
        
        status.innerHTML = components.loader();
        try {
            await uploadDocument(currentUser.uid, file, { category });
            toasts.show(`Document uploaded to ${CATEGORY_LABELS[category]}!`, 'success');
            status.innerHTML = `<div class="success">Document uploaded successfully to <b>${CATEGORY_LABELS[category]}</b>!</div>`;
            setTimeout(() => {
                container.innerHTML = '';
                loadDocuments();
            }, 1500);
        } catch (err) {
            status.innerHTML = `<div class="error">${err.message}</div>`;
        }
    };
}

async function loadDocuments() {
    const listDiv = document.getElementById('main-view-content');
    try {
        const docs = await getUserDocuments(currentUser.uid);
        if (docs.length === 0) {
            listDiv.innerHTML = components.emptyState('No documents found in your account.');
            return;
        }

        listDiv.innerHTML = `
            <div class="card" style="padding: 0;">
                ${docs.map(doc => `
                    <div class="doc-item">
                        <div class="doc-info">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <h4>${doc.name}</h4>
                                ${doc.isShared ? '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 600;">Shared</span>' : ''}
                            </div>
                            <p>
                                <span style="font-weight: 500; color: var(--text-main);">${CATEGORY_LABELS[doc.category] || 'Other'}</span> • 
                                ${new Date(doc.createdAt?.toDate()).toLocaleDateString()}
                                ${doc.isShared ? ' • Received from family member' : ''}
                            </p>
                        </div>
                        <div class="doc-actions">
                            <button class="secondary" onclick="viewDocument('${doc.id}')">View</button>
                            ${!doc.isShared ? `
                                <button class="btn-share" data-id="${doc.id}">Share</button>
                                <button class="danger btn-delete" data-id="${doc.id}">Delete</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.querySelectorAll('.btn-share').forEach(btn => {
            btn.onclick = () => showShareForm(btn.dataset.id);
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = () => deleteDocument(btn.dataset.id);
        });

    } catch (err) {
        listDiv.innerHTML = `<div class="error">${err.message}</div>`;
    }
}

async function renderProfile() {
    document.getElementById('view-title').innerText = 'My Profile';
    document.getElementById('btn-upload-view').style.display = 'none';
    const mainContent = document.getElementById('main-view-content');
    
    try {
        const profile = await getProfile(currentUser.uid);
        mainContent.innerHTML = `
            <div class="card" style="max-width: 600px;">
                <form id="profile-form">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="prof-name" value="${profile.fullName}" required>
                    </div>
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" value="${profile.email}" disabled>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">Email cannot be changed for security reasons.</p>
                    </div>
                    <div class="form-group">
                        <label>Aadhaar (Last 4 digits)</label>
                        <input type="text" value="XXXX-XXXX-${profile.aadhaarLast4}" disabled>
                    </div>
                    <button type="submit" style="margin-top: 1rem;">Update Profile Information</button>
                </form>
                <div id="profile-status" style="margin-top: 1rem;"></div>
            </div>
        `;

        document.getElementById('profile-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('prof-name').value;
            const status = document.getElementById('profile-status');
            status.innerHTML = components.loader();
            try {
                await updateProfile(currentUser.uid, { fullName: name });
                toasts.show('Profile updated!', 'success');
                status.innerHTML = '<div class="success">Profile updated successfully!</div>';
            } catch (err) {
                status.innerHTML = components.errorCard(err.message);
            }
        };
    } catch (err) {
        mainContent.innerHTML = components.errorCard(err.message);
    }
}

function showShareForm(docId) {
    const container = document.getElementById('doc-action-container');
    container.innerHTML = `
        <div class="card" style="border: 1px solid #fcd34d; background: #fffbeb;">
            <h3 style="margin-bottom: 0.5rem;">Share Document</h3>
            <p style="font-size: 0.875rem; color: #92400e; margin-bottom: 1.5rem;">Enter the email of the person you want to grant access to this document.</p>
            <form id="share-form">
                <div class="form-group">
                    <label>Recipient's Email</label>
                    <input type="email" id="share-email" placeholder="family@example.com" required style="border-color: #fcd34d;">
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="submit" style="flex: 1; background: #d97706;">Grant Access</button>
                    <button type="button" id="btn-cancel-share" class="secondary" style="flex: 1;">Cancel</button>
                </div>
            </form>
            <div id="share-status" style="margin-top: 1rem;"></div>
        </div>
    `;

    document.getElementById('btn-cancel-share').onclick = () => {
        container.innerHTML = '';
    };

    document.getElementById('share-form').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('share-email').value;
        const status = document.getElementById('share-status');
        
        status.innerHTML = components.loader();
        try {
            await shareDocument(currentUser.uid, docId, email);
            toasts.show('Access granted!', 'success');
            status.innerHTML = '<div class="success" style="background: #d1fae5; border-color: #10b981; color: #065f46;">Access granted successfully!</div>';
            setTimeout(() => {
                container.innerHTML = '';
            }, 1500);
        } catch (err) {
            status.innerHTML = components.errorCard(err.message);
        }
    };
}

async function deleteDocument(docId) {
    if (confirm('Are you sure you want to delete this document?')) {
        try {
            await deleteDocAction(currentUser.uid, docId);
            toasts.show('Document deleted', 'info');
            loadDocuments();
        } catch (err) {
            toasts.show('Failed to delete: ' + err.message, 'error');
        }
    }
}

async function viewDocument(docId) {
    try {
        const doc = await getDocument(docId);
        const win = window.open();
        win.document.write(`
            <html>
                <body style="margin:0; display:flex; justify-content:center; align-items:center; background:#333;">
                    ${doc.type.startsWith('image/') 
                        ? `<img src="${doc.fileData}" style="max-width:100%; max-height:100vh;">`
                        : `<iframe src="${doc.fileData}" style="width:100%; height:100vh; border:none;"></iframe>`
                    }
                </body>
            </html>
        `);
    } catch (err) {
        alert('Failed to view document: ' + err.message);
    }
}

// Make globally accessible for the onclick handlers
window.viewDocument = viewDocument;
window.showUploadForm = showUploadForm;
