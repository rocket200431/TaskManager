  document.addEventListener('DOMContentLoaded', () => {
            // Element References
            const taskForm = document.getElementById('task-form');
            const taskInput = document.getElementById('task-input');
            const dueDateInput = document.getElementById('due-date-input');
            const addTaskButton = document.getElementById('add-task-button');
            const taskList = document.getElementById('task-list');
            const taskDate = document.getElementById('task-date');
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            const filterBtns = document.querySelectorAll('.filter-btn');
            const deleteModal = document.getElementById('delete-modal');
            const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
            const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

            // App State
            let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
            let currentFilter = 'all';
            let taskToDeleteId = null;

            // ---- DATE HELPERS ----
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const formatDate = (dateString) => {
                if (!dateString) return null;
                if (dateString === todayStr) return 'Today';
                if (dateString === tomorrowStr) return 'Tomorrow';
                const date = new Date(dateString + 'T00:00:00'); // Avoid timezone issues
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            };

            // ---- CORE FUNCTIONS ----
            const saveTasks = () => {
                localStorage.setItem('tasks', JSON.stringify(tasks));
            };

            const renderTasks = () => {
                taskList.innerHTML = '';

                // 1. Filter tasks
                const filteredTasks = tasks.filter(task => {
                    if (currentFilter === 'active') return !task.completed;
                    if (currentFilter === 'completed') return task.completed;
                    return true;
                });

                // 2. Sort tasks: incomplete first, then by due date
                filteredTasks.sort((a, b) => {
                    if (a.completed !== b.completed) return a.completed - b.completed;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
                
                // 3. Group by date
                const groupedTasks = filteredTasks.reduce((groups, task) => {
                    const date = task.dueDate || 'No Date';
                    if (!groups[date]) {
                        groups[date] = [];
                    }
                    groups[date].push(task);
                    return groups;
                }, {});

                const sortedGroupKeys = Object.keys(groupedTasks).sort((a, b) => new Date(a) - new Date(b));

                if (filteredTasks.length === 0) {
                    taskList.innerHTML = `<li class="text-center text-gray-500 py-4">No tasks found.</li>`;
                } else {
                     sortedGroupKeys.forEach(dateKey => {
                        const groupTitle = document.createElement('h3');
                        groupTitle.className = 'text-md font-bold text-gray-500 mb-2 mt-4 first:mt-0 fade-in';
                        groupTitle.textContent = formatDate(dateKey) || 'No Date';
                        taskList.appendChild(groupTitle);
                        
                        groupedTasks[dateKey].forEach(task => {
                            const isOverdue = !task.completed && task.dueDate && task.dueDate < todayStr;
                            const taskItem = document.createElement('li');
                            taskItem.className = `task-item flex items-center justify-between bg-gray-50 p-3 rounded-lg transition hover:bg-gray-100 fade-in ${task.completed ? 'completed' : ''}`;
                            taskItem.dataset.id = task.id;

                            taskItem.innerHTML = `
                                <div class="flex items-center gap-3 cursor-pointer flex-grow" data-action="toggle">
                                    <div class="w-5 h-5 border-2 ${task.completed ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'} rounded-full flex items-center justify-center transition-all flex-shrink-0">
                                        ${task.completed ? '<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>' : ''}
                                    </div>
                                    <div class="flex-grow">
                                        <span class="task-text text-gray-800">${task.text}</span>
                                        ${task.dueDate ? `<div class="text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}">${formatDate(task.dueDate)} ${isOverdue ? '(Overdue)' : ''}</div>` : ''}
                                    </div>
                                </div>
                                <button class="text-gray-400 hover:text-red-500 transition ml-4" data-action="delete" title="Delete Task">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            `;
                            taskList.appendChild(taskItem);
                        });
                     });
                }
                updateProgress();
            };

            const updateProgress = () => {
                const totalTasks = tasks.length;
                if (totalTasks === 0) {
                    progressText.textContent = '0%';
                    progressBar.style.width = '0%';
                    return;
                }
                const completedTasks = tasks.filter(task => task.completed).length;
                const percentage = Math.round((completedTasks / totalTasks) * 100);
                progressText.textContent = `${percentage}%`;
                progressBar.style.width = `${percentage}%`;
            };

            // ---- EVENT HANDLERS ----
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const taskText = taskInput.value.trim();
                const dueDate = dueDateInput.value;
                if (taskText) {
                    tasks.push({
                        id: Date.now(),
                        text: taskText,
                        completed: false,
                        dueDate: dueDate || null,
                    });
                    saveTasks();
                    renderTasks();
                    taskInput.value = '';
                    dueDateInput.value = '';
                    taskInput.focus();
                }
                updateButtonState();
            });
            
            taskList.addEventListener('click', (e) => {
                const taskItem = e.target.closest('.task-item');
                if (!taskItem) return;

                const taskId = Number(taskItem.dataset.id);
                const action = e.target.closest('[data-action]')?.dataset.action;

                if (action === 'toggle') {
                    tasks = tasks.map(task => 
                        task.id === taskId ? { ...task, completed: !task.completed } : task
                    );
                    saveTasks();
                    renderTasks();
                } else if (action === 'delete') {
                    taskToDeleteId = taskId;
                    deleteModal.classList.remove('hidden');
                }
            });

            confirmDeleteBtn.addEventListener('click', () => {
                if (taskToDeleteId !== null) {
                    tasks = tasks.filter(task => task.id !== taskToDeleteId);
                    saveTasks();
                    renderTasks();
                    taskToDeleteId = null;
                }
                deleteModal.classList.add('hidden');
            });
            
            cancelDeleteBtn.addEventListener('click', () => {
                taskToDeleteId = null;
                deleteModal.classList.add('hidden');
            });
            
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    filterBtns.forEach(b => b.classList.remove('filter-btn-active'));
                    btn.classList.add('filter-btn-active');
                    currentFilter = btn.dataset.filter;
                    renderTasks();
                });
            });

            const updateButtonState = () => {
                addTaskButton.disabled = taskInput.value.trim() === '';
            };
            taskInput.addEventListener('input', updateButtonState);

            // ---- INITIALIZATION ----
            const init = () => {
                taskDate.textContent = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                dueDateInput.min = todayStr; // Prevent choosing past dates
                renderTasks();
                updateButtonState();
            };

            init();
        });