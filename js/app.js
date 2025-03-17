// On page load
window.onload = function() {
    // Check login status and redirect accordingly
    const loggedIn = localStorage.getItem("loggedIn");
    const userRole = localStorage.getItem("userRole");
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
            localStorage.setItem("userName", data.name);
            
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
            <td colspan="8" class="p-2 text-center text-gray-500 border">No tasks found</td>
        `;
        taskList.appendChild(row);
        return;
    }

    // First, get team members for the dropdown
    fetch('/team-members')
        .then(response => response.json())
        .then(teamData => {
            const teamMembers = teamData.success ? teamData.teamMembers : [];
            
            tasks.forEach((task, index) => {
                const row = document.createElement("tr");
                row.classList.add("hover:bg-gray-50");
                row.dataset.taskId = task.id;

                const assignedTo = task.user?.pegasusName || '';
                const memberOptions = teamMembers.map(member => 
                    `<option value="${member.pegasusName}" ${member.pegasusName === assignedTo ? 'selected' : ''}>
                        ${member.pegasusName}
                    </option>`
                ).join('');

                row.innerHTML = `
                    <td class="p-2 border text-center w-12">${index + 1}</td>
                    <td class="p-2 border w-96">${decodeHtmlEntities(task.projectName)}</td>
                    <td class="p-2 border w-48">${decodeHtmlEntities(task.taskName)}</td>
                    <td class="p-2 border w-40">
                        <select class="w-full bg-transparent assignee-select" onchange="updateTaskField(this, 'assignedTo')">
                            <option value="">Unassigned</option>
                            ${memberOptions}
                        </select>
                    </td>
                    <td class="p-2 border w-32">
                        <select class="w-full bg-transparent label-select" onchange="updateTaskField(this, 'status')">
                            <option value="No Label" ${task.status === 'No Label' ? 'selected' : ''}>No Label</option>
                            <option value="Confirmed" ${task.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        </select>
                    </td>
                    <td class="p-2 border w-24 estimation-cell" ondblclick="makeEditable(this, 'estimation')">
                        ${task.estimation || '-'}
                    </td>
                    <td class="p-2 border w-[21.6rem] notes-cell" ondblclick="makeEditable(this, 'notes')">
                        ${task.notes || '-'}
                    </td>
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
                    </td>
                `;
                taskList.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading team members:', error);
        });

    // Add this style tag to your HTML file
    const style = document.createElement('style');
    style.textContent = `
        .estimation-cell, .notes-cell {
            position: relative;
        }
        .estimation-cell input, .notes-cell input {
            background: white;
        }
        tr:last-child .estimation-cell .absolute,
        tr:last-child .notes-cell .absolute {
            bottom: auto;
            top: -8px;
        }
    `;
    document.head.appendChild(style);
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
            <input type="${isEstimation ? 'number' : 'text'}" 
                   class="w-full p-1 border rounded text-sm"
                   value="${currentValue === '-' ? '' : currentValue}"
                   placeholder="${isEstimation ? 'Hours' : 'Add notes'}"
                   step="${isEstimation ? '0.5' : ''}"
                   min="${isEstimation ? '0' : ''}"
                   onkeydown="handleEditKeydown(event, this, '${field}')" />
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
    
    const input = cell.querySelector('input');
    input.focus();
    
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

// Handle keydown events for editable cells
function handleEditKeydown(event, input, field) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveEdit(input, field);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEdit(input.closest('td'), input.defaultValue);
    }
}

// Update task field function
async function updateTaskField(element, field) {
    const row = element.closest('tr');
    const taskId = row.dataset.taskId;
    let newValue = element.value || element.textContent;
    const cell = element.closest('td');
    
    cell.classList.add('opacity-50');

    try {
        const response = await fetch('/tasks');
        const data = await response.json();
        if (!data.success) throw new Error('Failed to load tasks');

        const tasks = data.tasks;
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) throw new Error('Task not found');

        // Update the task with the new value
        if (field === 'assignedTo') {
            tasks[taskIndex].user = newValue ? { pegasusName: newValue } : null;
        } else {
            tasks[taskIndex][field] = newValue;
        }

        const updateResponse = await fetch('/update-tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: tasks })
        });

        const updateData = await updateResponse.json();
        if (!updateData.success) throw new Error('Failed to update task');

        cell.classList.remove('opacity-50');
        if (element.tagName === 'INPUT') {
            cell.textContent = newValue || '-';
        }
    } catch (error) {
        console.error('Error updating task:', error);
        alert('Failed to update task. Please try again.');
        cell.classList.remove('opacity-50');
        if (element.tagName === 'INPUT') {
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
