const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const multer = require('multer');
const csv = require('csv-parser');
const he = require('he'); // Use 'he' library for HTML entity decoding

const app = express();
const port = 3000;
const host = '0.0.0.0';  // Listen on all network interfaces
const upload = multer({ dest: 'uploads/' });

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
            pegasusName: user.pegasusName
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
        // Get the pegasusName from the form input
        const pegasusName = req.body.pegasusName || req.body.name; // Fallback for backward compatibility
        const { username, password, role } = req.body;
        
        const filePath = path.join(__dirname, 'db', 'teamMembers.json');
        const teamMembers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Validate required fields
        if (!username || !password || !pegasusName || !role) {
            return res.json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Check if username already exists
        if (teamMembers.find(member => member.username === username)) {
            return res.json({ 
                success: false, 
                message: 'Username already exists' 
            });
        }

        // Check if pegasusName already exists
        if (teamMembers.find(member => member.pegasusName === pegasusName)) {
            return res.json({ 
                success: false, 
                message: 'Pegasus name already exists' 
            });
        }

        // Create new member object with pegasusName property
        const newMember = {
            id: teamMembers.length > 0 ? Math.max(...teamMembers.map(m => m.id)) + 1 : 1,
            pegasusName,  // Using pegasusName consistently
            username,
            password,
            role
        };

        // Remove name property if it exists
        delete newMember.name;

        teamMembers.push(newMember);
        fs.writeFileSync(filePath, JSON.stringify(teamMembers, null, 4));

        res.json({ 
            success: true, 
            message: 'Member added successfully' 
        });
    } catch (error) {
        console.error('Error adding member:', error);
        res.json({ 
            success: false, 
            message: 'Error adding member' 
        });
    }
});

// Get tasks from pegasusTask.json
app.get('/tasks', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'db', 'pegasusTask.json');
        
        if (!fs.existsSync(filePath)) {
            return res.json({ success: false, message: 'No tasks data found' });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const tasks = JSON.parse(fileContent);

        if (!tasks || !tasks.data) {
            return res.json({ success: false, message: 'Invalid tasks data format' });
        }

        const transformedTasks = tasks.data.map(task => ({
            id: task.id,
            projectName: task.project || 'N/A',
            taskName: task.name || 'N/A',
            user: task.user ? { pegasusName: task.user.pegasusName || task.user.name } : null,
            status: task.primary_label || 'No Label',
            estimation: task.estimation || '',
            notes: task.notes || '',
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
        const newTasks = req.body;
        const filePath = path.join(__dirname, 'db', 'pegasusTask.json');

        // Validate new tasks format
        if (!newTasks || !newTasks.data || !Array.isArray(newTasks.data)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid data format. Expected an object with data array.' 
            });
        }

        // Read existing tasks
        let existingTasks = { data: [] };
        if (fs.existsSync(filePath)) {
            existingTasks = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        // Create a map of existing tasks using task ID
        const existingTasksMap = new Map(
            existingTasks.data.map(task => [task.id, task])
        );

        // Merge new tasks with existing ones
        newTasks.data.forEach(newTask => {
            if (existingTasksMap.has(newTask.id)) {
                // Update specific fields while preserving others
                const existingTask = existingTasksMap.get(newTask.id);
                existingTasksMap.set(newTask.id, {
                    ...existingTask,
                    ...newTask
                });
            } else {
                existingTasksMap.set(newTask.id, newTask);
            }
        });

        // Convert map back to array
        const mergedTasks = {
            data: Array.from(existingTasksMap.values()),
            disableOrdering: false
        };

        fs.writeFileSync(filePath, JSON.stringify(mergedTasks, null, 2));
        res.json({ success: true, message: 'Tasks updated successfully' });
    } catch (error) {
        console.error('Error updating tasks:', error);
        res.json({ success: false, message: 'Error updating tasks' });
    }
});

// Update individual task field
app.post('/update-task', (req, res) => {
    try {
        const { taskId, field, value } = req.body;
        
        // Read the tasks file
        const tasksPath = path.join(__dirname, 'db', 'pegasusTask.json');
        const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
        
        // Find the task to update
        const taskIndex = tasks.data.findIndex(t => String(t.id) === String(taskId));
        
        if (taskIndex === -1) {
            console.log('Task not found:', { 
                receivedId: taskId, 
                availableIds: tasks.data.map(t => t.id)
            });
            return res.json({ 
                success: false, 
                message: 'Task not found' 
            });
        }

        // Update the specific field
        switch (field) {
            case 'estimation':
                tasks.data[taskIndex].estimation = value;
                // Save to estimation history
                saveEstimationHistory(taskId, value, tasks.data[taskIndex]);
                break;
            case 'notes':
                tasks.data[taskIndex].notes = value;
                // Save to notes history
                saveNotesHistory(taskId, value, tasks.data[taskIndex]);
                break;
            case 'assignedTo':
                tasks.data[taskIndex].user = value ? { pegasusName: value } : null;
                break;
            default:
                return res.json({ 
                    success: false, 
                    message: 'Invalid field' 
                });
        }

        // Save the updated tasks
        fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2));

        res.json({ 
            success: true, 
            message: 'Task updated successfully',
            updatedTask: tasks.data[taskIndex]
        });
    } catch (error) {
        console.error('Error updating task:', error);
        res.json({ 
            success: false, 
            message: 'Error updating task: ' + error.message 
        });
    }
});

// Function to save estimation history
function saveEstimationHistory(taskId, estimation, taskData) {
    if (estimation === null) return; // Don't save if no estimation

    const historyPath = path.join(__dirname, 'db', 'estimationHistory.json');
    let history = { entries: [] };

    // Read existing history if it exists
    if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }

    // Add new entry
    history.entries.push({
        taskId: String(taskId),
        estimation,
        projectName: taskData.project || taskData.projectName,
        taskName: taskData.name || taskData.taskName,
        timestamp: new Date().toISOString(),
        updatedBy: 'admin' // You might want to pass the user info from the client
    });

    // Save updated history
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

// Function to save notes history
function saveNotesHistory(taskId, notes, taskData) {
    if (notes === null) return; // Don't save if no notes

    const historyPath = path.join(__dirname, 'db', 'notesHistory.json');
    let history = { entries: [] };

    // Read existing history if it exists
    if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }

    // Add new entry
    history.entries.push({
        taskId: String(taskId),
        notes,
        projectName: taskData.project || taskData.projectName,
        taskName: taskData.name || taskData.taskName,
        timestamp: new Date().toISOString(),
        updatedBy: 'admin' // You might want to pass the user info from the client
    });

    // Save updated history
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

// Endpoint to handle CSV file upload
app.post('/upload-csv', upload.single('csvFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, req.file.path);
    const results = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            try {
                // Process CSV data and store in JSON
                storeTrackedData(results);
                fs.unlinkSync(filePath); // Remove the uploaded file
                res.json({ success: true, message: 'CSV data processed and stored successfully' });
            } catch (error) {
                console.error('Error processing CSV data:', error);
                res.status(500).json({ success: false, message: 'Error processing CSV data' });
            }
        })
        .on('error', (error) => {
            console.error('Error reading CSV file:', error);
            res.status(500).json({ success: false, message: 'Error reading CSV file' });
        });
});

// Function to store tracked data in JSON
function storeTrackedData(csvData) {
    const tasksFilePath = path.join(__dirname, 'db', 'pegasusTask.json');
    const trackedDataFilePath = path.join(__dirname, 'db', 'trackedData.json');

    // Read existing tasks
    const tasks = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8')).data;

    // Prepare tracked data structure
    const trackedData = csvData.map(row => {
        const csvTaskName = row['Task Name'].split(': ')[1]; // Extract task name after the colon
        const decodedCsvTaskName = he.decode(csvTaskName); // Decode HTML entities

        const trackedTime = parseFloat(row['Total Time (Decimal)']) || 0;

        // Find the corresponding task by name
        const task = tasks.find(t => he.decode(t.taskName) === decodedCsvTaskName);

        return {
            taskId: task ? task.id : null,
            taskName: csvTaskName,
            trackedTime,
            date: row['Date'],
            project: row['Project'],
            person: row['Person']
        };
    });

    // Write tracked data to JSON file
    fs.writeFileSync(trackedDataFilePath, JSON.stringify(trackedData, null, 2));
}

function generateDailyReport() {
    const tasksFilePath = path.join(__dirname, 'db', 'tasks.json');
    const reportFilePath = path.join(__dirname, 'db', 'dailyReports.json');
    const tasks = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));

    const report = {
        date: new Date().toISOString().split('T')[0],
        tasks: tasks.map(task => ({
            name: task.name,
            estimation: task.estimation,
            trackedTime: task.trackedTime,
            remainingTime: (task.estimation || 0) - (task.trackedTime || 0)
        }))
    };

    let reports = [];
    if (fs.existsSync(reportFilePath)) {
        reports = JSON.parse(fs.readFileSync(reportFilePath, 'utf8'));
    }
    reports.push(report);

    fs.writeFileSync(reportFilePath, JSON.stringify(reports, null, 2));
}

// Start the server
app.listen(port, host, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Local access: http://localhost:${port}`);
    console.log(`Network access: http://${require('os').networkInterfaces()['eth0']?.[0]?.address || 'YOUR_IP'}:${port}`);
});