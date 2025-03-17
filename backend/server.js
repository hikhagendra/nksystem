const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const axios = require('axios'); // We'll need axios for making HTTP requests
const cheerio = require('cheerio'); // Add cheerio for HTML parsing

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// Define the correct path to frontend files (project root)
const frontendPath = path.join(__dirname, '../'); // Moves one level up

// Serve static files (CSS, JS, images)
app.use(express.static(frontendPath));

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Read team members from JSON file
    const teamMembers = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'teamMembers.json'), 'utf8'));
    
    // Find user with matching credentials
    const user = teamMembers.find(member => member.username === username && member.password === password);
    
    if (user) {
        res.json({ 
            success: true, 
            message: 'Login successful',
            role: user.role,
            name: user.name
        });
    } else {
        res.json({ success: false, message: 'Invalid username or password' });
    }
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Serve dashboard.html
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

// Serve members.html
app.get('/members', (req, res) => {
    res.sendFile(path.join(frontendPath, 'members.html'));
});

// API Route: Fetch team members
app.get('/team-members', (req, res) => {
    try {
        const teamMembers = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'teamMembers.json'), 'utf8'));
        res.json({ success: true, teamMembers });
    } catch (error) {
        res.json({ success: false, message: 'Error loading team members' });
    }
});

// Delete team member
app.delete('/delete-member/:id', (req, res) => {
    try {
        const memberId = parseInt(req.params.id);
        const filePath = path.join(__dirname, 'db', 'teamMembers.json');
        const teamMembers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const updatedMembers = teamMembers.filter(member => member.id !== memberId);
        
        if (updatedMembers.length === teamMembers.length) {
            return res.json({ success: false, message: 'Member not found' });
        }
        
        fs.writeFileSync(filePath, JSON.stringify(updatedMembers, null, 4));
        res.json({ success: true, message: 'Member deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: 'Error deleting member' });
    }
});

// Add new team member
app.post('/add-member', (req, res) => {
    try {
        const { username, password } = req.body;
        const filePath = path.join(__dirname, 'db', 'teamMembers.json');
        const teamMembers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Check if username already exists
        if (teamMembers.find(member => member.username === username)) {
            return res.json({ success: false, message: 'Username already exists' });
        }

        // Add new member
        const newMember = {
            id: teamMembers.length > 0 ? Math.max(...teamMembers.map(m => m.id)) + 1 : 1,
            name: username, // Using username as name for simplicity
            username,
            password,
            role: 'user' // Default role is user
        };

        teamMembers.push(newMember);
        fs.writeFileSync(filePath, JSON.stringify(teamMembers, null, 4));
        res.json({ success: true, message: 'Member added successfully' });
    } catch (error) {
        res.json({ success: false, message: 'Error adding member' });
    }
});

// Get Pegasus accounts
app.get('/pegasus-accounts', (req, res) => {
    try {
        const accounts = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'pegasusAccounts.json'), 'utf8'));
        res.json({ success: true, accounts });
    } catch (error) {
        res.json({ success: false, message: 'Error loading Pegasus accounts' });
    }
});

// Add new Pegasus account
app.post('/add-pegasus-account', (req, res) => {
    try {
        const { username, password } = req.body;
        const filePath = path.join(__dirname, 'db', 'pegasusAccounts.json');
        const accounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Check if username already exists
        if (accounts.find(account => account.username === username)) {
            return res.json({ success: false, message: 'Account already exists' });
        }

        // Add new account
        const newAccount = {
            id: accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1,
            username,
            password
        };

        accounts.push(newAccount);
        fs.writeFileSync(filePath, JSON.stringify(accounts, null, 4));
        res.json({ success: true, message: 'Account added successfully' });
    } catch (error) {
        res.json({ success: false, message: 'Error adding account' });
    }
});

// Delete Pegasus account
app.delete('/delete-pegasus-account/:id', (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const filePath = path.join(__dirname, 'db', 'pegasusAccounts.json');
        const accounts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const updatedAccounts = accounts.filter(account => account.id !== accountId);
        
        if (updatedAccounts.length === accounts.length) {
            return res.json({ success: false, message: 'Account not found' });
        }
        
        fs.writeFileSync(filePath, JSON.stringify(updatedAccounts, null, 4));
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: 'Error deleting account' });
    }
});

// Remove old team endpoint as it's replaced by team-members
app.get('/team', (req, res) => {
    res.redirect('/team-members');
});

// Fetch tasks from Pegasus
async function fetchPegasusTasks(username, password) {
    try {
        const axiosInstance = axios.create({
            withCredentials: true,
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 500;  // Accept all status codes to handle redirects
            }
        });

        // Step 1: Generate PKCE code verifier and challenge
        const codeVerifier = generateRandomString(128);
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // Step 2: Start OAuth flow by visiting /ploauth
        console.log('Starting OAuth flow...');
        const authInitResponse = await axiosInstance.get('https://pegasus.pairlab.ai/ploauth', {
            maxRedirects: 0,  // Don't follow redirects automatically
            validateStatus: status => status >= 200 && status < 400
        });

        // Step 3: Visit auth.pairlab.ai login page
        console.log('Getting auth login page...');
        const loginPageUrl = 'https://auth.pairlab.ai/login';
        const loginPageResponse = await axiosInstance.get(loginPageUrl);

        // Extract CSRF token
        const $ = cheerio.load(loginPageResponse.data);
        const csrfToken = $('meta[name="csrf-token"]').attr('content');

        console.log('CSRF Token:', csrfToken);

        // Step 4: Submit login credentials
        console.log('Submitting login credentials...');
        const loginFormData = new URLSearchParams();
        loginFormData.append('username', username);
        loginFormData.append('password', password);
        loginFormData.append('_token', csrfToken);

        const loginResponse = await axiosInstance.post(loginPageUrl, loginFormData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRF-TOKEN': csrfToken,
                'Origin': 'https://auth.pairlab.ai',
                'Referer': loginPageUrl
            }
        });

        // Step 5: Handle OAuth authorization
        console.log('Handling OAuth authorization...');
        const authorizeUrl = 'https://auth.pairlab.ai/oauth/authorize';
        const authorizeParams = new URLSearchParams({
            client_id: '967fc3f0-9d21-4437-b7fd-7d09252997f5',  // Pegasus client ID
            redirect_uri: 'https://pegasus.pairlab.ai/ploauth-callback',
            response_type: 'code',
            scope: '',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });

        const authorizeResponse = await axiosInstance.get(`${authorizeUrl}?${authorizeParams}`);

        // Step 6: Access Pegasus dashboard
        console.log('Accessing Pegasus dashboard...');
        const dashboardResponse = await axiosInstance.get('https://pegasus.pairlab.ai/dashboard');

        // Step 7: Fetch tasks
        console.log('Fetching tasks...');
        const tasksResponse = await axiosInstance.get(
            'https://pegasus.pairlab.ai/xapp/group-tasks-data',
            {
                params: {
                    draw: 1,
                    start: 0,
                    length: 50
                },
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://pegasus.pairlab.ai/dashboard'
                }
            }
        );

        console.log('Tasks response received');
        console.log('Response status:', tasksResponse.status);
        console.log('Response type:', typeof tasksResponse.data);
        
        // Debug the response structure
        if (typeof tasksResponse.data === 'object') {
            console.log('Response keys:', Object.keys(tasksResponse.data));
            
            // Check if data is in a different format
            if (tasksResponse.data.recordsTotal !== undefined) {
                console.log('Found recordsTotal:', tasksResponse.data.recordsTotal);
                console.log('Data format appears to be DataTables format');
                
                // If it's in DataTables format, the data might be in a different property
                if (Array.isArray(tasksResponse.data.data)) {
                    console.log('Found data array with length:', tasksResponse.data.data.length);
                    
                    // Create a sample of the first item if available
                    if (tasksResponse.data.data.length > 0) {
                        console.log('Sample data item:', JSON.stringify(tasksResponse.data.data[0]).substring(0, 200) + '...');
                    }
                }
            }
        } else {
            console.log('Response is not an object, it is:', typeof tasksResponse.data);
        }

        return tasksResponse.data;
    } catch (error) {
        console.error('Error details:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
}

// Helper functions for PKCE
function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Endpoint to fetch and save Pegasus tasks
app.post('/fetch-pegasus-tasks', async (req, res) => {
    try {
        // Get Pegasus credentials for the user
        const pegasusAccounts = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'pegasusAccounts.json'), 'utf8'));
        
        if (pegasusAccounts.length === 0) {
            return res.json({ success: false, message: 'No Pegasus accounts configured' });
        }

        // Use the first account (you might want to modify this logic)
        const account = pegasusAccounts[0];
        
        // Fetch tasks from Pegasus
        const tasksData = await fetchPegasusTasks(account.username, account.password);
        
        if (!tasksData || !tasksData.data) {
            throw new Error('Invalid response from Pegasus');
        }

        // Transform the data to match our schema
        const transformedTasks = tasksData.data.map(task => ({
            projectName: task.project || 'N/A',
            taskName: task.name || 'N/A',
            assignedTo: task.user || 'Unassigned',
            estimation: task.due_on_system || 'Not specified',
            notes: task.status || 'No status',
            link: task.permalink || '#'
        }));

        // Save to scrapedTasks.json
        fs.writeFileSync(
            path.join(__dirname, 'db', 'scrapedTasks.json'),
            JSON.stringify(transformedTasks, null, 2)
        );

        res.json({ 
            success: true, 
            message: 'Tasks fetched successfully',
            tasks: transformedTasks
        });
    } catch (error) {
        console.error('Error in fetch-pegasus-tasks:', error);
        res.json({ 
            success: false, 
            message: 'Error fetching tasks from Pegasus: ' + error.message
        });
    }
});

// Get scraped tasks
app.get('/scraped-tasks', (req, res) => {
    try {
        const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'scrapedTasks.json'), 'utf8'));
        res.json({ success: true, tasks });
    } catch (error) {
        res.json({ success: false, message: 'Error loading tasks' });
    }
});

// Get tasks from pegasusTask.json
app.get('/tasks', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'db', 'pegasusTask.json');
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.json({ success: false, message: 'No tasks data found' });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const tasks = JSON.parse(fileContent);

        if (!tasks || !tasks.data) {
            return res.json({ success: false, message: 'Invalid tasks data format' });
        }

        const transformedTasks = tasks.data.map(task => ({
            projectName: task.project || 'N/A',
            taskName: task.name || 'N/A',
            assignedTo: task.user?.name || 'Unassigned',
            status: task.primary_label || 'No status',
            estimation: task.estimation || 'Not set',
            notes: task.notes || '-',
            link: task.permalink || '#'
        }));

        console.log('Successfully transformed tasks:', transformedTasks.length);
        res.json({ success: true, tasks: transformedTasks });
    } catch (error) {
        console.error('Error in /tasks endpoint:', error);
        res.json({ success: false, message: 'Error loading tasks' });
    }
});

// Update tasks data
app.post('/update-tasks', (req, res) => {
    try {
        const tasks = req.body;

        // Validate if tasks exists and is an array
        if (!tasks || !tasks.data || !Array.isArray(tasks.data)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid data format. Expected an object with data array.' 
            });
        }

        const filePath = path.join(__dirname, 'db', 'pegasusTask.json');
        fs.writeFileSync(
            filePath,
            JSON.stringify(tasks, null, 2)
        );
        console.log('Tasks saved successfully to:', filePath);
        res.json({ success: true, message: 'Tasks updated successfully' });
    } catch (error) {
        console.error('Error updating tasks:', error);
        res.json({ success: false, message: 'Error updating tasks' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/`);
});