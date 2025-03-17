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
    if (currentPath.includes('manage-team.html') || currentPath.includes('pegasus.html')) {
        if (userRole !== 'admin') {
            window.location.href = "dashboard-user.html";
            return;
        }
        if (currentPath.includes('manage-team.html')) {
            loadTeamMembers();
        } else if (currentPath.includes('pegasus.html')) {
            loadPegasusAccounts();
        }
    } else if (currentPath.includes('dashboard-admin.html')) {
        if (userRole !== 'admin') {
            window.location.href = "dashboard-user.html";
        } else {
            // Load tasks automatically for admin dashboard
            syncTasks();
        }
    } else if (currentPath.includes('dashboard-user.html')) {
        if (userRole !== 'user') {
            window.location.href = "dashboard-admin.html";
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
document.getElementById("add-member-form")?.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("new-member-username").value;
    const password = document.getElementById("new-member-password").value;

    // Validate inputs
    if (username && password) {
        addMember(username, password); // Add new member to team
        document.getElementById("add-member-form").reset(); // Reset the form
    }
});

// Add new member (Send data to backend)
function addMember(username, password) {
    // Send member data to the backend
    fetch('/add-member', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadTeamMembers(); // Reload the team members list from the server
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error adding member:', error);
        alert("Error adding member. Please try again.");
    });
}

// Load all team members from the backend and display them
function loadTeamMembers() {
    fetch('/team-members')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const teamList = document.getElementById("team-members-list");
            teamList.innerHTML = ''; // Clear existing list

            data.teamMembers.forEach((member, index) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="p-2">${member.name}</td>
                    <td class="p-2">${member.username}</td>
                    <td class="p-2">${member.role}</td>
                    <td class="p-2">
                        <button onclick="deleteMember(${member.id})" class="bg-red-500 text-white px-4 py-1 rounded">Delete</button>
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

// Handle Add Pegasus Account form submission
document.getElementById("add-pegasus-form")?.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("pegasus-username").value;
    const password = document.getElementById("pegasus-password").value;

    // Validate inputs
    if (username && password) {
        addPegasusAccount(username, password); // Add new account to Pegasus accounts
        document.getElementById("add-pegasus-form").reset(); // Reset the form
    }
});

// Add a new Pegasus account (Send data to backend)
function addPegasusAccount(username, password) {
    fetch('/add-pegasus-account', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadPegasusAccounts(); // Reload the list of accounts
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error adding Pegasus account:', error);
        alert("Error adding Pegasus account. Please try again.");
    });
}

// Load all Pegasus accounts from the backend and display them
function loadPegasusAccounts() {
    fetch('/pegasus-accounts')
    .then(response => response.json())
    .then(data => {
        const accountsList = document.getElementById("pegasus-accounts-list");
        accountsList.innerHTML = ''; // Clear existing list

        data.accounts.forEach((account, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="p-2">${account.username}</td>
                <td class="p-2">
                    <button onclick="deletePegasusAccount(${index})" class="bg-red-500 text-white px-4 py-1 rounded">Delete</button>
                </td>
            `;
            accountsList.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error loading Pegasus accounts:', error);
        alert("Error loading Pegasus accounts.");
    });
}

// Delete a Pegasus account (Send delete request to backend)
function deletePegasusAccount(index) {
    fetch(`/delete-pegasus-account/${index}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadPegasusAccounts(); // Reload the list of accounts
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Error deleting Pegasus account:', error);
        alert("Error deleting Pegasus account.");
    });
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
            // Accept either the full response object or just the data array
            if (Array.isArray(tasks)) {
                // If it's an array, wrap it in the expected format
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
            alert('Tasks updated successfully');
            syncTasks(); // Refresh the display
        } else {
            alert(data.message || 'Error updating tasks');
        }
    } catch (error) {
        console.error('Error updating tasks:', error);
        alert('Error updating tasks: ' + error.message);
    }
}

// Sync and display tasks
async function syncTasks() {
    try {
        const response = await fetch('/tasks');
        const data = await response.json();

        if (data.success) {
            displayTasks(data.tasks);
        } else {
            alert(data.message || 'Error syncing tasks');
        }
    } catch (error) {
        console.error('Error syncing tasks:', error);
        alert('Error syncing tasks');
    }
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

// Display tasks in the table
function displayTasks(tasks) {
    const taskList = document.getElementById("task-list");
    if (!taskList) return;

    taskList.innerHTML = ''; // Clear previous data

    if (!Array.isArray(tasks) || tasks.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="8" class="p-2 text-center text-gray-500 border">No tasks found</td>
        `;
        taskList.appendChild(row);
        return;
    }

    tasks.forEach((task, index) => {
        const row = document.createElement("tr");
        row.classList.add("hover:bg-gray-50");

        row.innerHTML = `
            <td class="p-2 border text-center">${index + 1}</td>
            <td class="p-2 border">${decodeHtmlEntities(task.projectName)}</td>
            <td class="p-2 border">${decodeHtmlEntities(task.taskName)}</td>
            <td class="p-2 border">${task.assignedTo}</td>
            <td class="p-2 border">
                <span class="px-2 py-1 text-sm rounded-full ${getStatusClass(task.status)}">
                    ${task.status}
                </span>
            </td>
            <td class="p-2 border">${task.estimation}</td>
            <td class="p-2 border">${task.notes}</td>
            <td class="p-2 border text-center">
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
}

// Helper function to get status label styling
function getStatusClass(status) {
    const statusMap = {
        'In Progress': 'bg-blue-100 text-blue-800',
        'Completed': 'bg-green-100 text-green-800',
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Blocked': 'bg-red-100 text-red-800',
        'Review': 'bg-purple-100 text-purple-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
}
