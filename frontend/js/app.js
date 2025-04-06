const backendUrl = "https://nksystem.onrender.com";

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
    } else if (currentPath.includes('settings.html')) {
        if (userRole !== 'admin') {
            window.location.href = "dashboard-user.html";
            return;
        }
        // Set welcome message
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = userName || 'Admin';
        }
    }
};

// Handle login form submission
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${backendUrl}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (data.success) {
                localStorage.setItem("loggedIn", true);
                localStorage.setItem("userRole", data.role);
                localStorage.setItem("userName", data.pegasusName);

                // Redirect based on role
                if (data.role === "admin") {
                    window.location.href = "dashboard-admin.html";
                } else {
                    window.location.href = "dashboard-user.html";
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error("Error logging in:", error);
            alert("An error occurred. Please try again.");
        }
    });
}

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
        const response = await fetch(`${backendUrl}/add-member`, {
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
    fetch(`${backendUrl}/team-members`)
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

    fetch(`${backendUrl}/delete-member/${id}`, {
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

        const response = await fetch(`${backendUrl}/update-tasks`, {
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
            const tasksResponse = await fetch(`${backendUrl}/tasks`);
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
        const response = await fetch(`${backendUrl}/team-members`);
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
        const totalElement = document.getElementById('total-estimation');
        if (totalElement) {
            // Format the number to 1 decimal place if it has decimals
            const formattedTotal = totalEstimation % 1 === 0 ? totalEstimation : totalEstimation.toFixed(1);
            totalElement.innerHTML = `
                <span class="text-3xl">${formattedTotal}</span>
                <span class="text-lg ml-1">hrs</span>
            `;

            // Add color coding based on total hours
            if (totalEstimation >= 40) {
                totalElement.classList.add('text-red-600');
                totalElement.classList.remove('text-blue-600', 'text-yellow-600');
            } else if (totalEstimation >= 30) {
                totalElement.classList.add('text-yellow-600');
                totalElement.classList.remove('text-blue-600', 'text-red-600');
            } else {
                totalElement.classList.add('text-blue-600');
                totalElement.classList.remove('text-yellow-600', 'text-red-600');
            }
        }
    }

    // First, get team members for the dropdown (only for admin)
    if (userRole === 'admin') {
        fetch(`${backendUrl}/team-members`)
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
        // Ensure we're parsing the estimation value correctly
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
    // Add console log to verify task data
    console.log('Task data being processed:', tasks.map(task => ({
        id: task.id,
        name: task.taskName,
        completed: task.completed
    })));

    const taskList = document.getElementById("task-list");
    const currentUser = localStorage.getItem('userName');
    
    // Filter tasks for current user
    if (userRole === 'user') {
        tasks = tasks.filter(task => task.user?.pegasusName === currentUser);
    }

    // Fetch tracked data
    fetch(`${backendUrl}/db/trackedData.json`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(trackedData => {
        // Calculate today's total tracked hours for the summary card
        const today = new Date().toISOString().split('T')[0];
        const todaysTrackedHours = trackedData.entries
            .filter(entry => entry.date === today && entry.person === currentUser)
            .reduce((total, entry) => total + (parseFloat(entry.trackedTime) || 0), 0);

        // Update total tracked hours display
        const totalTrackedElement = document.getElementById('total-tracked');
        if (totalTrackedElement) {
            totalTrackedElement.textContent = `${todaysTrackedHours.toFixed(2)} hrs`;
            totalTrackedElement.classList.toggle('text-green-600', todaysTrackedHours > 0);
            totalTrackedElement.classList.toggle('text-gray-600', todaysTrackedHours === 0);
        }

        // Create task rows with tracked data
        tasks.forEach((task, index) => {
            const row = document.createElement("tr");
            row.classList.add("hover:bg-gray-50");
            const taskId = String(task.id || task._id);
            row.dataset.taskId = taskId;

            // Calculate total tracked hours for this specific task
            const taskTrackedHours = trackedData.entries
                .filter(entry => String(entry.taskId) === taskId)
                .reduce((total, entry) => total + (parseFloat(entry.trackedTime) || 0), 0);

            const assignedTo = task.user?.pegasusName || '';
            const estimatedHours = parseFloat(task.estimation) || 0;
            const progressPercentage = Math.min((taskTrackedHours / estimatedHours) * 100, 100) || 0;
            
            // Determine progress bar color based on tracked vs estimated hours
            const progressBarColor = taskTrackedHours > estimatedHours ? 'bg-red-500' : 'bg-green-500';

            // Common row content for both admin and user
            let rowContent = `
                <td class="p-2 border text-center w-12">${index + 1}</td>
                <td class="p-2 border w-96">${decodeHtmlEntities(task.projectName)}</td>
                <td class="p-2 border w-48">${decodeHtmlEntities(task.taskName)}</td>`;

            // Admin-specific content
            if (userRole === 'admin') {
                rowContent += `
                    <td class="p-2 border w-40">
                        <select class="w-full bg-transparent assignee-select" onchange="updateTaskField(this, 'assignedTo')">
                            <option value="">Unassigned</option>
                            ${teamMembers.map(member => 
                                `<option value="${member.pegasusName}" ${member.pegasusName === assignedTo ? 'selected' : ''}>
                                    ${member.pegasusName}
                                </option>`
                            ).join('')}
                        </select>
                    </td>
                    <td class="p-2 border w-24 estimation-cell" 
                        ondblclick="this.setAttribute('data-editing', 'true'); makeEditable(this, 'estimation')"
                        data-estimation="${estimatedHours}">
                        <div class="text-xs space-y-1">
                            <div class="flex justify-between text-[10px] font-medium">
                                <span>Estimated</span>
                                <span class="estimation-value">${estimatedHours}hrs</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="bg-blue-500 h-1.5 rounded-full" style="width: 100%"></div>
                            </div>
                            <div class="flex justify-between text-[10px] font-medium">
                                <span>Tracked</span>
                                <span>${taskTrackedHours.toFixed(2)}hrs</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="${progressBarColor} h-1.5 rounded-full" 
                                     style="width: ${progressPercentage}%"
                                     title="${taskTrackedHours.toFixed(2)}hrs / ${estimatedHours}hrs"></div>
                            </div>
                        </div>
                    </td>
                    <td class="p-2 border w-[21.6rem] notes-cell text-left" 
                        ondblclick="this.setAttribute('data-editing', 'true'); makeEditable(this, 'notes')">
                        <div class="whitespace-pre-wrap">${task.notes || '-'}</div>
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
                    </td>`;
            } else {
                // User-specific content
                rowContent += `
                    <td class="p-2 border w-24">
                        <div class="text-xs space-y-1">
                            <div class="flex justify-between text-[10px] font-medium">
                                <span>Estimated</span>
                                <span>${estimatedHours}hrs</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="bg-blue-500 h-1.5 rounded-full" style="width: 100%"></div>
                            </div>
                            <div class="flex justify-between text-[10px] font-medium">
                                <span>Tracked</span>
                                <span>${taskTrackedHours.toFixed(2)}hrs</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-1.5">
                                <div class="${progressBarColor} h-1.5 rounded-full" 
                                     style="width: ${progressPercentage}%"
                                     title="${taskTrackedHours.toFixed(2)}hrs / ${estimatedHours}hrs"></div>
                            </div>
                        </div>
                    </td>
                    <td class="p-2 border w-[21.6rem] text-left">
                        <div class="whitespace-pre-wrap">${task.notes || '-'}</div>
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
                    </td>`;
            }

            // Update the checkbox HTML with more explicit checking and debugging
            const isCompleted = task.completed === true;
            console.log(`Task ${task.id} completion status:`, isCompleted);

            rowContent += `
                <td class="p-2 border text-center w-20">
                    <input type="checkbox" 
                           class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                           ${isCompleted ? 'checked' : ''}
                           onchange="updateTaskCompletion(this, '${taskId}')"
                           data-task-name="${task.taskName}"
                           title="Mark task as completed">
                </td>`;

            row.innerHTML = rowContent;
            taskList.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error loading tracked data:', error);
        displayTasksWithoutTracking(tasks, teamMembers, userRole);
    });
}

// Helper function to display tasks when tracked data fails to load
function displayTasksWithoutTracking(tasks, teamMembers, userRole) {
    const taskList = document.getElementById("task-list");
    if (!taskList) {
        console.error("Task list element not found in the DOM.");
        return;
    }

    const currentUser = localStorage.getItem('userName');
    
    // Filter tasks for current user
    if (userRole === 'user') {
        tasks = tasks.filter(task => task.user?.pegasusName === currentUser);
    }

    // Calculate and display total estimation
    const totalEstimation = tasks.reduce((total, task) => {
        return total + (parseFloat(task.estimation) || 0);
    }, 0);

    const totalEstimationElement = document.getElementById('total-estimation');
    if (totalEstimationElement) {
        const formattedEstimation = totalEstimation % 1 === 0 ? 
            totalEstimation : 
            totalEstimation.toFixed(1);
        totalEstimationElement.textContent = `${formattedEstimation} hrs`;
    }

    // Set tracked hours to 0 if data couldn't be loaded
    const totalTrackedElement = document.getElementById('total-tracked');
    if (totalTrackedElement) {
        totalTrackedElement.textContent = '0.00 hrs';
        totalTrackedElement.classList.add('text-gray-600');
    }

    // Create task rows without tracked data
    tasks.forEach((task, index) => {
        const row = document.createElement("tr");
        row.classList.add("hover:bg-gray-50");
        const taskId = String(task.id || task._id);
        row.dataset.taskId = taskId;

        const assignedTo = task.user?.pegasusName || '';
        const estimatedHours = task.estimation || 0;
        
        let rowContent = `
            <td class="p-2 border text-center w-12">${index + 1}</td>
            <td class="p-2 border w-96">${decodeHtmlEntities(task.projectName)}</td>
            <td class="p-2 border w-48">${decodeHtmlEntities(task.taskName)}</td>`;

        if (userRole === 'admin') {
            rowContent += `
                <td class="p-2 border w-40">
                    <select class="w-full bg-transparent assignee-select" onchange="updateTaskField(this, 'assignedTo')">
                        <option value="">Unassigned</option>
                        ${teamMembers.map(member => 
                            `<option value="${member.pegasusName}" ${member.pegasusName === assignedTo ? 'selected' : ''}>
                                ${member.pegasusName}
                            </option>`
                        ).join('')}
                    </select>
                </td>
                <td class="p-2 border w-24 estimation-cell" 
                    ondblclick="this.setAttribute('data-editing', 'true'); makeEditable(this, 'estimation')"
                    data-estimation="${estimatedHours}">
                    <div class="text-xs space-y-1">
                        <div class="flex justify-between text-[10px] font-medium">
                            <span>Estimated</span>
                            <span class="estimation-value">${estimatedHours}hrs</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5">
                            <div class="bg-blue-500 h-1.5 rounded-full" style="width: 100%"></div>
                        </div>
                    </div>
                </td>
                <td class="p-2 border w-[21.6rem] notes-cell text-left" 
                    ondblclick="this.setAttribute('data-editing', 'true'); makeEditable(this, 'notes')">
                    <div class="whitespace-pre-wrap">${task.notes || '-'}</div>
                </td>`;
        } else {
            rowContent += `
                <td class="p-2 border w-24">
                    <div class="text-xs space-y-1">
                        <div class="flex justify-between text-[10px] font-medium">
                            <span>Estimated</span>
                            <span>${estimatedHours}hrs</span>
                        </div>
                    </div>
                </td>
                <td class="p-2 border w-[21.6rem] text-left">
                    <div class="whitespace-pre-wrap">${task.notes || '-'}</div>
                </td>`;
        }

        // Add Link column for both admin and user
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

        // Update the checkbox HTML with more explicit checking and debugging
        const isCompleted = task.completed === true;
        
        rowContent += `
            <td class="p-2 border text-center w-20">
                <input type="checkbox" 
                       class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                       ${isCompleted ? 'checked' : ''}
                       onchange="updateTaskCompletion(this, '${taskId}')"
                       data-task-name="${task.taskName}"
                       title="Mark task as completed">
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
    if (field === 'estimation') {
        const currentValue = cell.dataset.estimation || '0';
        
        // First, make the cell position relative
        cell.style.position = 'relative';
        
        // Create popup element with absolute positioning
        const popup = document.createElement('div');
        popup.className = 'absolute z-50 bg-white rounded-lg shadow-xl p-4 border';
        popup.style.width = '300px';
        popup.style.top = '100%'; // Position right below the cell
        popup.style.left = '0';   // Align with left edge of cell
        
        popup.innerHTML = `
            <div class="flex flex-col gap-3">
                <div class="text-sm font-medium text-gray-700">Update Estimation</div>
                <input type="number" 
                       class="w-full p-2 border rounded text-sm"
                       value="${currentValue}"
                       placeholder="Hours (e.g., 0.15, 1.5, 2)"
                       step="0.01" 
                       min="0" />
                <div class="flex justify-end gap-2">
                    <button onclick="cancelEstimation()"
                            class="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200">
                        Cancel
                    </button>
                    <button onclick="saveEstimation(this.parentElement.previousElementSibling, '${field}')"
                            class="px-3 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600">
                        Save
                    </button>
                </div>
            </div>
        `;
        
        // Remove any existing popups
        const existingPopup = document.getElementById('estimation-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        popup.id = 'estimation-popup';
        
        // Add popup to the cell instead of body
        cell.appendChild(popup);
        
        const input = popup.querySelector('input');
        input.focus();
        input.select();
        
        // Add click outside listener
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !cell.contains(e.target)) {
                cancelEstimation();
                document.removeEventListener('click', closePopup);
            }
        });
        
        // Add keyboard listener
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEstimation(input, field);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEstimation();
            }
        });
    } else if (field === 'notes') {
        const currentValue = cell.textContent.trim();
        const notes = currentValue === '-' ? '' : currentValue;
        
        cell.style.position = 'relative';
        
        const popup = document.createElement('div');
        popup.className = 'absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200';
        popup.style.width = '400px';
        popup.style.top = 'calc(100% + 5px)';
        popup.style.left = '0';
        
        popup.innerHTML = `
            <div class="flex flex-col space-y-2">
                <div class="px-4 py-3 border-b border-gray-200">
                    <div class="text-sm font-medium text-gray-700">Update Notes</div>
                </div>
                <div class="px-4 pb-4">
                    <textarea
                        class="w-full p-3 border rounded-md text-sm min-h-[120px] resize-y focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Add notes here..."
                    >${notes}</textarea>
                </div>
                <div class="px-4 py-3 bg-gray-50 rounded-b-lg flex justify-end gap-2 border-t border-gray-200">
                    <button onclick="cancelNotes()"
                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Cancel
                    </button>
                    <button onclick="saveNotes(this.parentElement.previousElementSibling.querySelector('textarea'), 'notes')"
                            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Save
                    </button>
                </div>
            </div>
        `;
        
        // Remove any existing popups
        const existingPopup = document.getElementById('notes-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        popup.id = 'notes-popup';
        cell.appendChild(popup);
        
        // Focus and select the textarea content
        const textarea = popup.querySelector('textarea');
        textarea.focus();
        textarea.select();
        
        // Add click outside listener
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !cell.contains(e.target)) {
                cancelNotes();
                document.removeEventListener('click', closePopup);
            }
        });
        
        // Add keyboard listener
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelNotes();
            }
            // Allow Enter for new lines in textarea
        });
    }
}

// Updated save estimation function
async function saveEstimation(input, field) {
    if (!isValidEstimation(input.value)) {
        alert('Please enter a valid number');
        return;
    }

    const popup = document.getElementById('estimation-popup');
    const cell = popup.parentElement;
    const newValue = parseFloat(input.value);
    const row = cell.closest('tr');
    const taskId = row.dataset.taskId;

    try {
        const response = await fetch(`${backendUrl}/update-task`, {
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

        const data = await response.json();
        
        if (data.success) {
            // Remove the relative positioning from the cell
            cell.style.position = '';
            // Remove popup
            popup.remove();
            // Remove editing flag
            cell.removeAttribute('data-editing');

            // Safely get the tracked hours element
            const trackedHoursElement = cell.querySelector('.flex:nth-child(3) span:last-child');
            const trackedHours = trackedHoursElement ? parseFloat(trackedHoursElement.textContent) || 0 : 0;

            const progressPercentage = Math.min((trackedHours / newValue) * 100, 100) || 0;
            const progressBarColor = trackedHours > newValue ? 'bg-red-500' : 'bg-green-500';

            cell.innerHTML = `
                <div class="text-xs space-y-1">
                    <div class="flex justify-between text-[10px] font-medium">
                        <span>Estimated</span>
                        <span class="estimation-value">${newValue}hrs</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="bg-blue-500 h-1.5 rounded-full" style="width: 100%"></div>
                    </div>
                    <div class="flex justify-between text-[10px] font-medium">
                        <span>Tracked</span>
                        <span>${trackedHours.toFixed(2)}hrs</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-1.5">
                        <div class="${progressBarColor} h-1.5 rounded-full" 
                             style="width: ${progressPercentage}%"
                             title="${trackedHours.toFixed(2)}hrs / ${newValue}hrs"></div>
                    </div>
                </div>
            `;

            // Update the data-estimation attribute
            cell.dataset.estimation = newValue;

            // Reattach the double-click handler
            cell.ondblclick = () => {
                cell.setAttribute('data-editing', 'true');
                makeEditable(cell, 'estimation');
            };

            // If we need to update the total estimation
            if (localStorage.getItem("userRole") === "user") {
                updateTotalEstimation();
            }
        } else {
            throw new Error(data.message || 'Failed to update estimation');
        }
    } catch (error) {
        console.error('Error updating estimation:', error);
        alert(error.message || 'Failed to update estimation');
    }
}

// Add this new function to update total estimation without reloading
function updateTotalEstimation() {
    const taskList = document.getElementById("task-list");
    const rows = taskList.getElementsByTagName('tr');
    let total = 0;

    for (const row of rows) {
        const estimationCell = row.querySelector('.estimation-cell');
        if (estimationCell) {
            const estimation = parseFloat(estimationCell.dataset.estimation) || 0;
            total += estimation;
        }
    }

    const totalElement = document.getElementById('total-estimation');
    if (totalElement) {
        const formattedTotal = total % 1 === 0 ? total : total.toFixed(1);
        totalElement.innerHTML = `${formattedTotal} hrs`;

        // Update color coding
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

// Updated cancel estimation function
function cancelEstimation() {
    const popup = document.getElementById('estimation-popup');
    if (popup) {
        // Remove the relative positioning from the cell
        const cell = popup.parentElement;
        cell.style.position = '';
        popup.remove();
    }
    
    // Remove editing flag from cell
    const editingCell = document.querySelector('.estimation-cell[data-editing="true"]');
    if (editingCell) {
        editingCell.removeAttribute('data-editing');
    }
}

// Update the cancelNotes function
function cancelNotes() {
    const popup = document.getElementById('notes-popup');
    if (popup) {
        // Remove the relative positioning from the cell
        const cell = popup.parentElement;
        cell.style.position = '';
        popup.remove();
    }
    
    // Remove editing flag from cell
    const editingCell = document.querySelector('.notes-cell[data-editing="true"]');
    if (editingCell) {
        editingCell.removeAttribute('data-editing');
    }
}

// Update the saveNotes function to maintain the structure
async function saveNotes(textarea, field) {
    const popup = document.getElementById('notes-popup');
    const cell = popup.parentElement;
    const newValue = textarea.value.trim();
    const row = cell.closest('tr');
    const taskId = row.dataset.taskId;

    try {
        const response = await fetch(`${backendUrl}/update-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                taskId: taskId,
                field: field,
                value: newValue || null
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Remove the relative positioning from the cell
            cell.style.position = '';
            // Remove popup
            popup.remove();
            // Remove editing flag
            cell.removeAttribute('data-editing');
            
            // Update the cell content without refreshing
            cell.innerHTML = `<div class="whitespace-pre-wrap">${newValue || '-'}</div>`;
            
            // Reattach the double-click handler
            cell.ondblclick = () => {
                cell.setAttribute('data-editing', 'true');
                makeEditable(cell, 'notes');
            };
        } else {
            throw new Error(data.message || 'Failed to update notes');
        }
    } catch (error) {
        console.error('Error updating notes:', error);
        alert(error.message || 'Failed to update notes');
        cell.classList.remove('opacity-50');
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

        const updateResponse = await fetch(`${backendUrl}/update-task`, {
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
        const response = await fetch(`${backendUrl}/tasks`);
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

// Function to determine load status with new thresholds
function getLoadStatus(hours) {
    if (hours > 15) {
        return {
            text: 'Overloaded',
            class: 'bg-red-100 text-red-800'
        };
    } else if (hours > 8) {
        return {
            text: 'High Load',
            class: 'bg-yellow-100 text-yellow-800'
        };
    } else if (hours >= 7) {
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

// Modify the loadTeamStatus function to include admin's status
async function loadTeamStatus() {
    try {
        // Fetch both tasks and team members
        const [tasksResponse, teamResponse] = await Promise.all([
            fetch(`${backendUrl}/tasks`),
            fetch(`${backendUrl}/team-members`)
        ]);

        const tasksData = await tasksResponse.json();
        const teamData = await teamResponse.json();

        if (!tasksData.success || !teamData.success) {
            throw new Error('Failed to load data');
        }

        const tasks = tasksData.tasks;
        const teamMembers = teamData.teamMembers;
        
        // Get logged in admin's pegasus name
        const loggedInAdmin = localStorage.getItem("pegasusName");

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

        // First add the logged in admin's stats if they have any tasks
        const adminStats = stats.memberStats.find(member => member.pegasusName === loggedInAdmin);
        if (adminStats) {
            const adminRow = createStatusRow(adminStats, true);
            statusTable.appendChild(adminRow);
        }

        // Then add all other members
        stats.memberStats
            .filter(member => member.pegasusName !== loggedInAdmin)
            .forEach(member => {
                const row = createStatusRow(member, false);
                statusTable.appendChild(row);
            });

    } catch (error) {
        console.error('Error loading team status:', error);
        alert('Error loading team status');
    }
}

// Helper function to create status row
function createStatusRow(member, isAdmin) {
    const row = document.createElement('tr');
    row.classList.add('border-t', 'hover:bg-gray-50');
    
    const loadStatus = getLoadStatus(member.totalHours);
    
    row.innerHTML = `
        <td class="p-3">
            <div class="font-medium ${isAdmin ? 'text-blue-600' : ''}">
                ${member.pegasusName} ${isAdmin ? '(You)' : ''}
            </div>
        </td>
        <td class="p-3">${member.taskCount}</td>
        <td class="p-3">${member.totalHours.toFixed(2)}</td>
        <td class="p-3">
            <span class="px-2 py-1 rounded-full text-sm ${loadStatus.class}">
                ${loadStatus.text}
            </span>
        </td>
    `;
    return row;
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

// Function to calculate today's tracked hours for the current user
async function updateTodayTrackedHours() {
    try {
        const response = await fetch(`${backendUrl}/db/trackedData.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const trackedData = await response.json();

        // Get today's date in the format "YYYY-MM-DD"
        const today = new Date().toISOString().split('T')[0];

        // Get current user's name from localStorage
        const currentUser = localStorage.getItem('userName');

        // Filter entries for today and current user
        const todaysEntries = trackedData.entries.filter(entry =>
            entry.date === today && entry.person === currentUser
        );

        // Sum up all tracked time for today's entries
        const totalTrackedHours = todaysEntries.reduce((total, entry) => {
            return total + (parseFloat(entry.trackedTime) || 0);
        }, 0);

        // Update the display with proper formatting
        const totalTrackedElement = document.getElementById('total-tracked');
        if (totalTrackedElement) {
            totalTrackedElement.textContent = `${totalTrackedHours.toFixed(2)} hrs`;

            // Optional: Add some color coding based on hours tracked
            if (totalTrackedHours > 0) {
                totalTrackedElement.classList.add('text-green-600');
                totalTrackedElement.classList.remove('text-gray-600');
            } else {
                totalTrackedElement.classList.add('text-gray-600');
                totalTrackedElement.classList.remove('text-green-600');
            }
        }
    } catch (error) {
        console.error('Error calculating today\'s tracked hours:', error);

        // Handle missing or invalid data gracefully
        const totalTrackedElement = document.getElementById('total-tracked');
        if (totalTrackedElement) {
            totalTrackedElement.textContent = '0.00 hrs';
            totalTrackedElement.classList.add('text-gray-600');
        }
    }
}

// Make sure this function is called when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // ... other initialization code ...
    updateTodayTrackedHours();
});

// Update the uploadCSV function to refresh the tracked hours after successful upload
async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('userName', localStorage.getItem('userName'));

    const uploadButton = document.querySelector('button[onclick="document.getElementById(\'csvFile\').click()"]');
    
    try {
        uploadButton.textContent = 'Uploading...';
        uploadButton.disabled = true;

        const response = await fetch(`${backendUrl}/upload-csv`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            fileInput.value = '';
            // Refresh the tracked hours display after successful upload
            await updateTodayTrackedHours();
        } else {
            throw new Error(result.message || 'Failed to process CSV data');
        }
    } catch (error) {
        console.error('Error uploading CSV:', error);
        alert('Error uploading CSV: ' + (error.message || 'Unknown error'));
    } finally {
        uploadButton.textContent = 'Upload TD Report';
        uploadButton.disabled = false;
    }
}

// Add new function to handle task completion updates
async function updateTaskCompletion(checkbox, taskId) {
    const isCompleted = checkbox.checked;
    const row = checkbox.closest('tr');
    
    try {
        // Add loading state
        checkbox.disabled = true;
        
        // Log the taskId for debugging
        console.log('Updating task completion:', {
            taskId: taskId,
            isCompleted: isCompleted
        });

        const response = await fetch(`${backendUrl}/update-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                taskId: String(taskId), // Ensure taskId is a string
                field: 'completed',
                value: isCompleted
            })
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to update task completion status');
        }

        // Visual feedback for success
        const taskName = row.querySelector('td:nth-child(3)').textContent;
        console.log(`Successfully ${isCompleted ? 'completed' : 'uncompleted'} task: ${taskName}`);

    } catch (error) {
        console.error('Error updating task completion:', error);
        // More detailed error message
        alert(`Error updating task completion status: ${error.message}`);
        // Revert checkbox
        checkbox.checked = !isCompleted;
    } finally {
        // Re-enable checkbox
        checkbox.disabled = false;
    }
}

// Add this function to handle clearing completed tasks
async function clearCompletedTasks() {
    if (!confirm('Are you sure you want to clear all completed tasks? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/clear-completed-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            alert(`Successfully cleared ${data.clearedCount} completed tasks.`);
        } else {
            throw new Error(data.message || 'Failed to clear completed tasks');
        }
    } catch (error) {
        console.error('Error clearing completed tasks:', error);
        alert('Error clearing completed tasks: ' + error.message);
    }
}

let grid = document.getElementById('admin-tasks');
let tHead = grid.querySelector('thead');
let tBody = grid.querySelector('tbody');

tHead.addEventListener('click', function(event) {
    // let sortType = event.target.dataset.type;
    // let headings = event.target.closest('tr').getElementsByTagName('th');
    // let colNumber = 0;

    // for(let i = 0; i < headings.length; i++) {
    //     if(headings[i] == event.target) {
    //         colNumber = i;
    //         break;
    //     }
    // }
    
    new GridShort(tBody, 'string', 3);
});

class GridShort {
    constructor(grid, type, colNum) {
        this.rows = this.toArray(grid);
        this[type + 'Sort'](colNum);
    }

    // numberSort(colNum) {
    //     // Sort the number column data
    //     this.rows.sort(function(a, b) {
    //         return a.children[colNum].firstChild.data - b.children[colNum].firstChild.data;
    //     });
        
    //     // Clean the table
    //     tBody.innerHTML = '';

    //     // Append the sorted rows
    //     this.rows.forEach(row => tBody.append(row));
    // }

    stringSort(colNum) {
        // Sort the string column data
        this.rows.sort(function(a, b) {
            if(a.children[colNum].firstElementChild.value > b.children[colNum].firstElementChild.value) {
                return 1;
            }
            
            if(a.children[colNum].firstElementChild.value == b.children[colNum].firstElementChild.value) {
                return 0;
            }
            
            if(a.children[colNum].firstElementChild.value < b.children[colNum].firstElementChild.value) {
                return -1;
            }
        });

        // console.log(this.rows[1].children[3].firstElementChild.value);
        
        // Clean the table
        tBody.innerHTML = '';

        // Append the sorted rows
        this.rows.forEach(row => tBody.append(row));
    }

    toArray(data) {
        let nodeCollection = data.getElementsByTagName('tr');
        let arrData = [];

        for(let node of nodeCollection) {
            arrData.push(node);
        }

        return arrData;
    }
}

function filterTasks() {
    const searchInput = document.getElementById("taskSearch").value.toLowerCase();
    const table = document.getElementById("admin-tasks");
    const rows = table.getElementsByTagName("tr");

    for (let i = 1; i < rows.length; i++) { // Start from 1 to skip the header row
        const cells = rows[i].getElementsByTagName("td");
        let rowContainsSearchText = false;

        for (let j = 0; j < cells.length; j++) {
            const cell = cells[j];
            let cellText = "";

            // Check if the cell contains a <select> dropdown
            const selectElement = cell.querySelector("select");
            if (selectElement) {
                // Get the selected option's text
                cellText = selectElement.options[selectElement.selectedIndex].text.toLowerCase();
            } else {
                // Otherwise, use the cell's inner text
                cellText = cell.innerText.toLowerCase();
            }

            // Check if the cell text includes the search input
            if (cellText.includes(searchInput)) {
                rowContainsSearchText = true;
                break;
            }
        }

        // Show or hide the row based on the search result
        rows[i].style.display = rowContainsSearchText ? "" : "none";
    }
}