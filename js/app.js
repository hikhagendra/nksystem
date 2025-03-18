// On page load
window.onload = function() {
    // Check login status and redirect accordingly
    const loggedIn = localStorage.getItem("loggedIn");
    const userRole = localStorage.getItem("userRole");
    const userName = localStorage.getItem("userName"); // This is pegasusName stored during login
    const currentPath = window.location.pathname;

    // Don't redirect if on login page
    if (currentPath.includes('index.html')) {
    if (loggedIn) {
            // If already logged in, redirect to appropriate dashboard
            window.location.href = userRole === 'admin' ? "dashboard-admin.html" : "dashboard-user.html";
        }
        return;
    }

    // Handle non-login pages
    if (!loggedIn) {
        window.location.href = "index.html"; // Redirect to login if not logged in
        return;
    }

    // Role-based routing
    if (currentPath.includes('manage-team.html')) {
        if (userRole !== 'admin') {
            window.location.href = "dashboard-user.html";
            return;
        }
        loadTeamMembers();
    } else if (currentPath.includes('dashboard-admin.html') || currentPath.includes('dashboard-user.html')) {
        // Set welcome message if on dashboard
        if (currentPath.includes('dashboard-admin.html') || currentPath.includes('dashboard-user.html')) {
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = userName || 'User';
            }
            
            // Check role and redirect if necessary
            if (currentPath.includes('dashboard-admin.html') && userRole !== 'admin') {
                window.location.href = "dashboard-user.html";
                return;
            } else if (currentPath.includes('dashboard-user.html') && userRole !== 'user') {
                window.location.href = "dashboard-admin.html";
                return;
            }
            
            // Load tasks for both admin and user dashboards
            loadAndDisplayTasks();
        }
    }
};

// Handle login form submission
document.getElementById("login-form")?.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Send login credentials to the server
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Store login status and user info
            localStorage.setItem("loggedIn", "true");
            localStorage.setItem("userRole", data.role);
            localStorage.setItem("userName", data.pegasusName); // Store pegasusName instead of name
            
            // Redirect based on role
            if (data.role === 'admin') {
                window.location.href = "dashboard-admin.html";
            } else {
                window.location.href = "dashboard-user.html";
            }
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error during login:', error);
        alert("Error logging in. Please try again later.");
    });
});

// Handle Add Member form submission
document.getElementById("add-member-form")?.addEventListener("submit", async function(event) {
    event.preventDefault();

    const pegasusName = document.getElementById("new-member-pegasus-name").value.trim();
    const username = document.getElementById("new-member-username").value.trim();
    const password = document.getElementById("new-member-password").value;
    const role = document.getElementById("new-member-role").value;

    // Validate inputs
    if (!pegasusName || !username || !password || !role) {
        alert('All fields are required');
        return;
    }

    try {
        const response = await fetch('/add-member', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
            body: JSON.stringify({ 
                pegasusName, 
                username, 
                password,
                role 
            })
        });

        const data = await response.json();
        
        if (data.success) {
            document.getElementById("add-member-form").reset();
            loadTeamMembers();
            alert('Member added successfully');
        } else {
            alert(data.message || 'Error adding member');
        }
    } catch (error) {
        console.error('Error adding member:', error);
        alert('Error adding member. Please try again.');
    }
    });

// Load all team members from the backend and display them
function loadTeamMembers() {
    fetch('/team-members')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
        const teamList = document.getElementById("team-members-list");
            teamList.innerHTML = '';

            data.teamMembers.forEach((member) => {
            const row = document.createElement("tr");
                row.classList.add("hover:bg-gray-50");
            row.innerHTML = `
                    <td class="p-2 border-t">${member.pegasusName}</td>
                    <td class="p-2 border-t">${member.username}</td>
                    <td class="p-2 border-t">
                        <span class="px-2 py-1 text-sm rounded-full ${
                            member.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }">
                            ${member.role}
                        </span>
                    </td>
                    <td class="p-2 border-t">
                        ${member.role !== 'admin' ? `
                            <button onclick="deleteMember(${member.id})" 
                                    class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                                Delete
                            </button>
                        ` : ''}
                </td>
            `;
            teamList.appendChild(row);
        });
        } else {
            alert(data.message || "Error loading team members");
        }
    })
    .catch(error => {
        console.error('Error loading team members:', error);
        alert("Error loading team members.");
    });
}

// Delete a team member
function deleteMember(id) {
    if (!confirm('Are you sure you want to delete this member?')) {
        return;
    }

    fetch(`/delete-member/${id}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadTeamMembers(); // Reload team members after successful deletion
        } else {
            alert(data.message || "Error deleting member");
        }
    })
    .catch(error => {
        console.error('Error deleting member:', error);
        alert("Error deleting member.");
    });
}

// Logout function
function logout() {
    // Clear all localStorage items
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    window.location.href = "index.html"; // Redirect to login page after logout
}

// Update tasks data
async function updateTasksData() {
    document.getElementById('jsonModal').classList.remove('hidden');
}

// Close JSON modal
function closeJsonModal() {
    document.getElementById('jsonModal').classList.add('hidden');
    document.getElementById('jsonInput').value = '';
}

// Submit JSON data from modal
async function submitJsonData() {
    try {
        const jsonInput = document.getElementById('jsonInput').value;
        if (!jsonInput.trim()) {
            alert('Please enter JSON data');
            return;
        }

        let tasks;
        try {
            tasks = JSON.parse(jsonInput);
            if (Array.isArray(tasks)) {
                tasks = {
                    data: tasks,
                    disableOrdering: false
                };
            } else if (!tasks.data || !Array.isArray(tasks.data)) {
                throw new Error('Input must be either an array of tasks or an object with a data array');
            }
        } catch (error) {
            alert('Invalid JSON format: ' + error.message);
            return;
        }

        const response = await fetch('/update-tasks', {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tasks)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            closeJsonModal();
            // Get the updated tasks immediately
            const tasksResponse = await fetch('/tasks');
            const tasksData = await tasksResponse.json();
            
            if (tasksData.success) {
                displayTasks(tasksData.tasks);
                alert('Tasks updated successfully. Existing estimations and notes have been preserved.');
            } else {
                throw new Error(tasksData.message || 'Error loading updated tasks');
            }
        } else {
            alert(data.message || 'Error updating tasks');
        }
    } catch (error) {
        console.error('Error updating tasks:', error);
        alert('Error updating tasks: ' + error.message);
    }
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

// Function to get team members options
async function getTeamMembersOptions(selectedUser) {
    let optionsHtml = '<option value="">Unassigned</option>';
    
    try {
        const response = await fetch('/team-members');
        const data = await response.json();
        
        if (data.success && data.teamMembers) {
            const memberOptions = data.teamMembers.map(member => 
                `<option value="${member.pegasusName}" ${member.pegasusName === selectedUser ? 'selected' : ''}>
                    ${member.pegasusName}
                </option>`
            ).join('');
            optionsHtml += memberOptions;
        }
    } catch (error) {
        console.error('Error loading team members:', error);
    }
    
    return optionsHtml;
}

// Display tasks function
function displayTasks(tasks) {
    const taskList = document.getElementById("task-list");
    if (!taskList) return;

    taskList.innerHTML = '';

    if (!Array.isArray(tasks) || tasks.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="7" class="p-2 text-center text-gray-500 border">No tasks found</td>
        `;
        taskList.appendChild(row);
        updateTotalEstimation(0);
        return;
    }

    const userRole = localStorage.getItem("userRole");
    const userName = localStorage.getItem("userName");

    // Filter tasks for user role
    if (userRole === 'user') {
        tasks = tasks.filter(task => task.user?.pegasusName === userName);
        // Calculate and display total estimation
        const totalEstimation = calculateTotalEstimation(tasks);
        updateTotalEstimation(totalEstimation);
    }

    // First, get team members for the dropdown (only for admin)
    if (userRole === 'admin') {
        fetch('/team-members')
            .then(response => response.json())
            .then(teamData => {
                const teamMembers = teamData.success ? teamData.teamMembers : [];
                displayTaskRows(tasks, teamMembers, userRole);
    })
    .catch(error => {
                console.error('Error loading team members:', error);
                displayTaskRows(tasks, [], userRole);
            });
    } else {
        displayTaskRows(tasks, [], userRole);
    }
}

// Function to calculate total estimation
function calculateTotalEstimation(tasks) {
    return tasks.reduce((total, task) => {
        const estimation = parseFloat(task.estimation) || 0;
        return total + estimation;
    }, 0);
}

// Function to update the estimation display
function updateTotalEstimation(total) {
    const totalElement = document.getElementById('total-estimation');
    if (totalElement) {
        // Format the number to 1 decimal place if it has decimals
        const formattedTotal = total % 1 === 0 ? total : total.toFixed(1);
        totalElement.innerHTML = `
            <span class="text-3xl">${formattedTotal}</span>
            <span class="text-lg ml-1">hrs</span>
        `;

        // Add color coding based on total hours
        if (total >= 40) {
            totalElement.classList.add('text-red-600');
            totalElement.classList.remove('text-blue-600', 'text-yellow-600');
        } else if (total >= 30) {
            totalElement.classList.add('text-yellow-600');
            totalElement.classList.remove('text-blue-600', 'text-red-600');
        } else {
            totalElement.classList.add('text-blue-600');
            totalElement.classList.remove('text-yellow-600', 'text-red-600');
        }
    }
}

function displayTaskRows(tasks, teamMembers, userRole) {
    const taskList = document.getElementById("task-list");
    
    if (userRole === 'user') {
        // Calculate and display total estimation when rows are displayed
        const totalEstimation = calculateTotalEstimation(tasks);
        updateTotalEstimation(totalEstimation);
    }

    tasks.forEach((task, index) => {
        const row = document.createElement("tr");
        row.classList.add("hover:bg-gray-50");
        row.dataset.taskId = String(task.id || task._id);

        const assignedTo = task.user?.pegasusName || '';
        
        let rowContent = `
            <td class="p-2 border text-center w-12">${index + 1}</td>
            <td class="p-2 border w-96">${decodeHtmlEntities(task.projectName)}</td>
            <td class="p-2 border w-48">${decodeHtmlEntities(task.taskName)}</td>`;

        if (userRole === 'admin') {
            const memberOptions = teamMembers.map(member => 
                `<option value="${member.pegasusName}" ${member.pegasusName === assignedTo ? 'selected' : ''}>
                    ${member.pegasusName}
                </option>`
            ).join('');

            rowContent += `
                <td class="p-2 border w-40">
                    <select class="w-full bg-transparent assignee-select" onchange="updateTaskField(this, 'assignedTo')">
                        <option value="">Unassigned</option>
                        ${memberOptions}
                    </select>
                </td>
                <td class="p-2 border w-24 estimation-cell" ondblclick="makeEditable(this, 'estimation')">
                    ${task.estimation || '-'}
                </td>
                <td class="p-2 border w-[21.6rem] notes-cell" ondblclick="makeEditable(this, 'notes')">
                    ${task.notes || '-'}
                </td>`;
        } else {
            rowContent += `
                <td class="p-2 border w-24">${task.estimation || '-'}</td>
                <td class="p-2 border w-[21.6rem] whitespace-pre-wrap">${task.notes || '-'}</td>`;
        }

        rowContent += `
            <td class="p-2 border text-center w-12">
                <a href="${task.link}" 
                   class="inline-block text-blue-500 hover:text-blue-700" 
                   target="_blank" 
                   title="Open task">
                    <svg xmlns="http://www.w3.org/2000/svg" 
                         class="h-5 w-5" 
                         fill="none" 
                         viewBox="0 0 24 24" 
                         stroke="currentColor">
                        <path stroke-linecap="round" 
                              stroke-linejoin="round" 
                              stroke-width="2" 
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
            </td>`;

        row.innerHTML = rowContent;
        taskList.appendChild(row);
    });
}

// Function to validate estimation value
function isValidEstimation(value) {
    if (value === '') return true;
    const num = parseFloat(value);
    // Only check if it's a valid positive number
    return !isNaN(num) && num >= 0;
}

// Function to make cells editable
function makeEditable(cell, field) {
    // Close any other open editors first
    closeAllEditors(cell);
    
    const currentValue = cell.textContent.trim();
    const isEstimation = field === 'estimation';
    const width = cell.offsetWidth;
    
    cell.innerHTML = `
        <div class="relative" style="width: ${width}px">
            ${isEstimation ? `
                <input type="number" 
                       class="w-full p-1 border rounded text-sm"
                       value="${currentValue === '-' ? '' : currentValue}"
                       placeholder="Hours (e.g., 0.15, 1.5, 2)"
                       step="0.01" 
                       min="0"
                       onkeydown="handleEditKeydown(event, this, '${field}')" />
            ` : `
                <textarea
                    class="w-full p-1 border rounded text-sm min-h-[60px] resize-y"
                    placeholder="Add notes here..."
                    onkeydown="handleEditKeydown(event, this, '${field}')"
                >${currentValue === '-' ? '' : currentValue}</textarea>
            `}
            <div class="absolute -bottom-8 right-0 flex gap-1 bg-white shadow-md rounded border p-1 z-10">
                <button onclick="saveEdit(this.parentElement.previousElementSibling, '${field}')" 
                        class="px-2 py-0.5 text-xs text-white bg-green-500 rounded hover:bg-green-600" 
                        title="Save">
                    Save
                </button>
                <button onclick="cancelEdit(this.closest('td'), '${currentValue}')" 
                        class="px-2 py-0.5 text-xs text-white bg-gray-500 rounded hover:bg-gray-600" 
                        title="Cancel">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    const input = cell.querySelector(isEstimation ? 'input' : 'textarea');
    input.focus();
    
    // For textarea, place cursor at the end
    if (!isEstimation) {
        input.setSelectionRange(input.value.length, input.value.length);
    }
    
    // Add click event listener to document to close editor when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeEditor(e) {
            if (!cell.contains(e.target)) {
                cancelEdit(cell, currentValue);
                document.removeEventListener('click', closeEditor);
            }
        });
    }, 0);
}

// Function to close all open editors except the current one
function closeAllEditors(currentCell) {
    const editors = document.querySelectorAll('.estimation-cell, .notes-cell');
    editors.forEach(cell => {
        if (cell !== currentCell && cell.querySelector('input')) {
            const originalValue = cell.querySelector('input').defaultValue;
            cancelEdit(cell, originalValue);
        }
    });
}

// Handle keydown events for editable cells
function handleEditKeydown(event, input, field) {
    if (field === 'notes') {
        // For notes, only handle Escape key
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelEdit(input.closest('td'), input.defaultValue);
        }
        // Allow Enter key for new lines in notes
        return;
    }
    
    // For estimation, handle both Enter and Escape
    if (event.key === 'Enter') {
        event.preventDefault();
        saveEdit(input, field);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEdit(input.closest('td'), input.defaultValue);
    }
}

// Function to save edit
function saveEdit(input, field) {
    if (field === 'estimation' && !isValidEstimation(input.value)) {
        alert('Please enter a valid number');
        return;
    }
    updateTaskField(input, field);
}

// Function to cancel edit
function cancelEdit(cell, originalValue) {
    if (!cell.contains(document.activeElement)) return; // Prevent duplicate cancellations
    cell.textContent = originalValue === '' ? '-' : originalValue;
}

// Update task field function
async function updateTaskField(element, field) {
    const row = element.closest('tr');
    const taskId = row.dataset.taskId;
    let newValue = element.value || element.textContent;
    const cell = element.closest('td');
    
    cell.classList.add('opacity-50');

    try {
        // For estimation, validate and format the number
        if (field === 'estimation') {
            newValue = newValue.trim();
            if (newValue && !isValidEstimation(newValue)) {
                throw new Error('Please enter a valid number of hours');
            }
            newValue = newValue ? parseFloat(parseFloat(newValue).toFixed(2)) : null;
        }
        
        // For notes, trim and handle empty value
        if (field === 'notes') {
            newValue = newValue.trim();
            if (newValue === '') newValue = null;
        }

        const updateResponse = await fetch('/update-task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                taskId: taskId,
                field: field,
                value: newValue
            })
        });

        const updateData = await updateResponse.json();
        if (!updateData.success) throw new Error(updateData.message || 'Failed to update task');

        // Update the display
        cell.classList.remove('opacity-50');
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            if (field === 'estimation' && newValue !== null) {
                cell.textContent = newValue % 1 === 0 ? newValue : newValue.toFixed(2);
            } else {
                cell.textContent = newValue || '-';
            }
        }

        // If we're in user dashboard, update the total estimation
        if (localStorage.getItem("userRole") === "user") {
            loadAndDisplayTasks();
        }
    } catch (error) {
        console.error('Error updating task:', error);
        alert(error.message || 'Failed to update task. Please try again.');
        cell.classList.remove('opacity-50');
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            cancelEdit(cell, element.defaultValue);
        }
    }
}

// Function to load and display tasks
async function loadAndDisplayTasks() {
    try {
        const response = await fetch('/tasks');
        const data = await response.json();
        
        if (data.success) {
            displayTasks(data.tasks);
        } else {
            console.error('Error loading tasks:', data.message);
            // Show a more user-friendly message in the table
            const taskList = document.getElementById("task-list");
            if (taskList) {
                taskList.innerHTML = `
                    <tr>
                        <td colspan="8" class="p-2 text-center text-gray-500 border">
                            No tasks available. ${data.message}
                        </td>
                    </tr>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        // Show error message in the table
        const taskList = document.getElementById("task-list");
        if (taskList) {
            taskList.innerHTML = `
                <tr>
                    <td colspan="8" class="p-2 text-center text-red-500 border">
                        Error loading tasks. Please try again later.
                    </td>
                </tr>
            `;
        }
    }
}

// Function to load team status
async function loadTeamStatus() {
    try {
        // Fetch both tasks and team members
        const [tasksResponse, teamResponse] = await Promise.all([
            fetch('/tasks'),
            fetch('/team-members')
        ]);

        const tasksData = await tasksResponse.json();
        const teamData = await teamResponse.json();

        if (!tasksData.success || !teamData.success) {
            throw new Error('Failed to load data');
        }

        const tasks = tasksData.tasks;
        const teamMembers = teamData.teamMembers;

        // Calculate statistics
        const stats = calculateTeamStats(tasks, teamMembers);
        
        // Update overall statistics
        document.getElementById('total-tasks').textContent = stats.totalTasks;
        document.getElementById('assigned-tasks').textContent = stats.assignedTasks;
        document.getElementById('unassigned-tasks').textContent = stats.unassignedTasks;
        document.getElementById('total-hours').textContent = stats.totalHours.toFixed(2);
        document.getElementById('avg-hours').textContent = 
            (stats.totalHours / (stats.activeMembers || 1)).toFixed(2);

        // Update individual status table
        const statusTable = document.getElementById('team-status-table');
        statusTable.innerHTML = '';

        stats.memberStats.forEach(member => {
            const row = document.createElement('tr');
            row.classList.add('border-t', 'hover:bg-gray-50');
            
            const loadStatus = getLoadStatus(member.totalHours);
            
            row.innerHTML = `
                <td class="p-3">
                    <div class="font-medium">${member.pegasusName}</div>
                </td>
                <td class="p-3">${member.taskCount}</td>
                <td class="p-3">${member.totalHours.toFixed(2)}</td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded-full text-sm ${loadStatus.class}">
                        ${loadStatus.text}
                    </span>
                </td>
            `;
            statusTable.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading team status:', error);
        alert('Error loading team status');
    }
}

// Function to calculate team statistics
function calculateTeamStats(tasks, teamMembers) {
    const stats = {
        totalTasks: tasks.length,
        assignedTasks: 0,
        unassignedTasks: 0,
        totalHours: 0,
        activeMembers: 0,
        memberStats: []
    };

    // Initialize member stats
    const memberMap = new Map(teamMembers.map(member => [
        member.pegasusName,
        {
            pegasusName: member.pegasusName,
            taskCount: 0,
            totalHours: 0
        }
    ]));

    // Calculate task statistics
    tasks.forEach(task => {
        const estimation = parseFloat(task.estimation) || 0;
        stats.totalHours += estimation;

        if (task.user?.pegasusName) {
            stats.assignedTasks++;
            const memberStat = memberMap.get(task.user.pegasusName);
            if (memberStat) {
                memberStat.taskCount++;
                memberStat.totalHours += estimation;
            }
        } else {
            stats.unassignedTasks++;
        }
    });

    // Convert member stats to array and count active members
    stats.memberStats = Array.from(memberMap.values())
        .filter(member => member.taskCount > 0);
    stats.activeMembers = stats.memberStats.length;

    // Sort members by total hours (descending)
    stats.memberStats.sort((a, b) => b.totalHours - a.totalHours);

    return stats;
}

// Function to determine load status
function getLoadStatus(hours) {
    if (hours >= 40) {
        return {
            text: 'Overloaded',
            class: 'bg-red-100 text-red-800'
        };
    } else if (hours >= 30) {
        return {
            text: 'High Load',
            class: 'bg-yellow-100 text-yellow-800'
        };
    } else if (hours >= 20) {
        return {
            text: 'Normal Load',
            class: 'bg-green-100 text-green-800'
        };
    } else {
        return {
            text: 'Light Load',
            class: 'bg-blue-100 text-blue-800'
        };
    }
}
