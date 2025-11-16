// Main Application Logic for Carbon Footprint Tracker

// Helper function to safely get CONFIG
function getConfig() {
    if (typeof CONFIG !== 'undefined') {
        return CONFIG;
    }
    if (typeof window !== 'undefined' && window.CONFIG) {
        return window.CONFIG;
    }
    // Fallback config if CONFIG is not loaded
    console.warn('CONFIG not found, using fallback');
    return {
        app: { demoMode: true },
        emissionFactors: {
            transport: { car: 0.41, flightShort: 0.158, publicTransport: 0.053 },
            energy: { electricity: 0.233, gas: 5.3 },
            food: { meatMeal: 7.19, dairyServing: 2.5 },
            waste: { wasteBag: 2.5, recyclingOffset: -1.2 },
            shopping: { general: 0.005, electronics: 50 }
        },
        conversions: { kgToTonnes: 0.001, treesPerTonne: 20 },
        ui: { chartColors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'] },
        stripe: { priceId: 'price_premium_monthly' },
        chatbot: { mockMode: true, apiBase: 'http://localhost:5000' }
    };
}

// Initialize app on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure CONFIG is loaded
    setTimeout(() => {
        initializeApp();
    }, 100);
});

// Global app state
const appState = {
    currentCalculation: null,
    userData: null,
    isPremium: false,
};

// Initialize application
async function initializeApp() {
    // Setup event listeners
    setupThemeToggle();
    setupNavigation();
    setupFloatingChat();
    setupCalculator();
    setupDashboard();
    setupInsights();
    setupGoals();
    setupPremium();
    setupProfile();
    setupAuth();

    // Load user data
    await loadUserData();

    // Initialize dashboard with demo data
    const config = getConfig();
    if (config && config.app && config.app.demoMode) {
        loadDemoData();
    }

    // Update dashboard on load
    updateDashboard();

    // Update UI based on user state
    updateUI();
    
    console.log('App initialized successfully');
}

// Theme Toggle
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = document.documentElement.getAttribute('data-theme');

    themeToggle.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

// Navigation
function setupNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking a link (except chat link which opens modal)
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.id !== 'chatLink') {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        }
    });
    
    // Close mobile menu when chat link opens modal
    const chatLink = document.getElementById('chatLink');
    if (chatLink) {
        chatLink.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Scroll to section helper
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Floating Chat Modal Setup
function setupFloatingChat() {
    const chatLink = document.getElementById('chatLink');
    const floatingChatModal = document.getElementById('floatingChatModal');
    const floatingChatClose = document.getElementById('floatingChatClose');

    // Open modal when chat link is clicked
    if (chatLink) {
        chatLink.addEventListener('click', (e) => {
            e.preventDefault();
            openFloatingChat();
        });
    }

    // Close modal when close button is clicked
    if (floatingChatClose) {
        floatingChatClose.addEventListener('click', () => {
            closeFloatingChat();
        });
    }

    // Close modal when clicking outside the container
    if (floatingChatModal) {
        floatingChatModal.addEventListener('click', (e) => {
            if (e.target === floatingChatModal) {
                closeFloatingChat();
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && floatingChatModal && !floatingChatModal.classList.contains('hidden')) {
            closeFloatingChat();
        }
    });
}

// Open floating chat modal
function openFloatingChat() {
    const floatingChatModal = document.getElementById('floatingChatModal');
    const floatingChatIframe = document.getElementById('floatingChatIframe');
    
    if (floatingChatModal) {
        floatingChatModal.style.display = 'flex';
        floatingChatModal.classList.remove('hidden');
        
        // Reload iframe to ensure fresh content
        if (floatingChatIframe) {
            floatingChatIframe.src = floatingChatIframe.src;
        }
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
}

// Close floating chat modal
function closeFloatingChat() {
    const floatingChatModal = document.getElementById('floatingChatModal');
    
    if (floatingChatModal) {
        floatingChatModal.classList.add('hidden');
        setTimeout(() => {
            floatingChatModal.style.display = 'none';
        }, 300); // Wait for animation to complete
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Calculator Setup
function setupCalculator() {
    const calcTabs = document.querySelectorAll('.calc-tab');
    const calcPanels = document.querySelectorAll('.calc-panel');
    const calculateBtn = document.getElementById('calculateBtn');
    const saveCalculationBtn = document.getElementById('saveCalculationBtn');

    if (!calculateBtn) {
        console.error('Calculate button not found');
        return;
    }

    // Tab switching
    calcTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.getAttribute('data-category');
            
            // Update active tab
            calcTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active panel
            calcPanels.forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(`${category}-panel`);
            if (panel) {
                panel.classList.add('active');
            }
        });
    });

    // Calculate button
    calculateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Show loading state
        const btnText = document.getElementById('calculateBtnText');
        const btnLoading = document.getElementById('calculateBtnLoading');
        if (btnText && btnLoading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
        }
        calculateBtn.disabled = true;
        
        // Small delay to show loading state, then calculate
        setTimeout(() => {
            try {
                const result = calculateFootprint();
                // If calculation returns false or undefined, there was an error
                if (result === false) {
                    console.error('Calculation returned false');
                }
            } catch (error) {
                console.error('Error calculating footprint:', error);
                // Still show result even if there's an error, as long as we have a value
                if (appState.currentCalculation && appState.currentCalculation.co2e !== undefined) {
                    displayCalculationResult(appState.currentCalculation.co2e);
                } else {
                    alert('Error calculating footprint. Please check your inputs and try again. Error: ' + (error.message || error));
                }
            } finally {
                // Hide loading state
                if (btnText && btnLoading) {
                    btnText.style.display = 'inline';
                    btnLoading.style.display = 'none';
                }
                calculateBtn.disabled = false;
            }
        }, 100);
    });

    // Allow Enter key to trigger calculation
    document.querySelectorAll('.calculator-content .input-field').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                calculateBtn.click();
            }
        });
    });

    // Save calculation button
    if (saveCalculationBtn) {
        saveCalculationBtn.addEventListener('click', () => {
            saveCalculation();
        });
    }
}

// Calculate Carbon Footprint
function calculateFootprint() {
    console.log('Starting calculation...');
    
    // Get CONFIG safely
    const CONFIG_TO_USE = getConfig();
    
    if (!CONFIG_TO_USE || !CONFIG_TO_USE.emissionFactors) {
        console.error('CONFIG not loaded');
        alert('Configuration not loaded. Please refresh the page and ensure config.js loads before app.js.');
        return false;
    }

    const factors = CONFIG_TO_USE.emissionFactors;
    let totalCo2e = 0; // kg CO2e

    // Helper function to safely parse float with default 0
    const safeParseFloat = (elementId) => {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element ${elementId} not found, defaulting to 0`);
            return 0;
        }
        const value = parseFloat(element.value);
        return isNaN(value) || value < 0 ? 0 : value;
    };

    try {
        // Transport - All values default to 0 if not provided
        const carMiles = safeParseFloat('car-miles');
        const flights = safeParseFloat('flights');
        const publicTransport = safeParseFloat('public-transport');
        
        const transportCarCo2e = carMiles * factors.transport.car * 12; // Annual
        const transportFlightsCo2e = flights * 1000 * factors.transport.flightShort; // Annual (1000km per flight)
        const transportPublicCo2e = publicTransport * factors.transport.publicTransport * 12; // Annual
        
        totalCo2e += transportCarCo2e;
        totalCo2e += transportFlightsCo2e;
        totalCo2e += transportPublicCo2e;

        console.log('Transport calculation:', {
            carMiles,
            flights,
            publicTransport,
            carCo2e: transportCarCo2e.toFixed(2),
            flightsCo2e: transportFlightsCo2e.toFixed(2),
            publicCo2e: transportPublicCo2e.toFixed(2)
        });

        // Energy - All values default to 0 if not provided
        const electricity = safeParseFloat('electricity');
        const gas = safeParseFloat('gas');
        const renewablePercent = Math.min(100, Math.max(0, safeParseFloat('renewable-percent'))); // Clamp 0-100
        
        const electricityEmissions = electricity * factors.energy.electricity * (1 - renewablePercent / 100) * 12;
        const gasCo2e = gas * factors.energy.gas * 12; // Annual
        
        totalCo2e += electricityEmissions;
        totalCo2e += gasCo2e;

        console.log('Energy calculation:', {
            electricity,
            gas,
            renewablePercent,
            electricityEmissions: electricityEmissions.toFixed(2),
            gasCo2e: gasCo2e.toFixed(2)
        });

        // Food - All values default to 0 if not provided
        const meatMeals = safeParseFloat('meat-meals');
        const dairyProducts = safeParseFloat('dairy-products');
        const localFoodPercent = Math.min(100, Math.max(0, safeParseFloat('local-food'))); // Clamp 0-100
        
        const meatReduction = Math.max(0.8, 1 - (localFoodPercent / 100) * 0.2); // 20% reduction max for local
        const foodMeatCo2e = meatMeals * factors.food.meatMeal * 52 * meatReduction; // Annual
        const foodDairyCo2e = dairyProducts * factors.food.dairyServing * 52; // Annual
        
        totalCo2e += foodMeatCo2e;
        totalCo2e += foodDairyCo2e;

        console.log('Food calculation:', {
            meatMeals,
            dairyProducts,
            localFoodPercent,
            meatCo2e: foodMeatCo2e.toFixed(2),
            dairyCo2e: foodDairyCo2e.toFixed(2)
        });

        // Waste - All values default to 0 if not provided
        const wasteBags = safeParseFloat('waste-bags');
        const recyclingPercent = Math.min(100, Math.max(0, safeParseFloat('recycling-percent'))); // Clamp 0-100
        
        const wasteEmissions = wasteBags * factors.waste.wasteBag * 52; // Annual
        const recyclingOffset = wasteEmissions * (recyclingPercent / 100) * Math.abs(factors.waste.recyclingOffset);
        const wasteCo2e = wasteEmissions - recyclingOffset;
        
        totalCo2e += wasteCo2e;

        console.log('Waste calculation:', {
            wasteBags,
            recyclingPercent,
            wasteEmissions: wasteEmissions.toFixed(2),
            recyclingOffset: recyclingOffset.toFixed(2),
            netWasteCo2e: wasteCo2e.toFixed(2)
        });

        // Shopping - All values default to 0 if not provided
        const shoppingSpend = safeParseFloat('shopping-spend');
        const electronics = safeParseFloat('electronics');
        
        const shoppingCo2e = shoppingSpend * factors.shopping.general * 12; // Annual
        const electronicsCo2e = electronics * factors.shopping.electronics; // Annual
        
        totalCo2e += shoppingCo2e;
        totalCo2e += electronicsCo2e;

        console.log('Shopping calculation:', {
            shoppingSpend,
            electronics,
            shoppingCo2e: shoppingCo2e.toFixed(2),
            electronicsCo2e: electronicsCo2e.toFixed(2)
        });

        // Convert to tonnes and store
        const totalTonnes = totalCo2e * CONFIG_TO_USE.conversions.kgToTonnes;
        
        console.log('Total calculation:', {
            totalKgCo2e: totalCo2e.toFixed(2),
            totalTonnesCo2e: totalTonnes.toFixed(2)
        });
        
        appState.currentCalculation = {
            co2e: totalTonnes,
            category: 'mixed', // Mixed category since it includes all
            timestamp: new Date().toISOString(),
            breakdown: {
                transport: transportCarCo2e + transportFlightsCo2e + transportPublicCo2e,
                energy: electricityEmissions + gasCo2e,
                food: foodMeatCo2e + foodDairyCo2e,
                waste: wasteCo2e,
                shopping: shoppingCo2e + electronicsCo2e
            }
        };

        // Get previous calculation for comparison
        const previousCalculation = getPreviousCalculation();
        
        // Display result with comparison
        console.log('About to display result:', totalTonnes);
        displayCalculationResult(totalTonnes, previousCalculation);
        
    } catch (error) {
        console.error('Error in calculateFootprint:', error);
        // Don't throw error, instead show a default result of 0
        console.warn('Calculation error, defaulting to 0:', error);
        const totalTonnes = 0;
        
        appState.currentCalculation = {
            co2e: totalTonnes,
            category: 'mixed',
            timestamp: new Date().toISOString(),
        };
        
        displayCalculationResult(totalTonnes);
        return false; // Return false to indicate error but don't throw
    }
    
    return true; // Success
}

// Get Previous Calculation for Comparison
function getPreviousCalculation() {
    const logs = api.getCarbonLogs();
    if (logs.length === 0) return null;
    
    // Get the most recent calculation
    const sortedLogs = logs.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date || 0);
        const dateB = new Date(b.timestamp || b.date || 0);
        return dateB - dateA;
    });
    
    return sortedLogs[0];
}

// Display Calculation Result
function displayCalculationResult(tonnes, previousCalculation = null) {
    console.log('Displaying result:', tonnes, 'Previous:', previousCalculation);
    
    const resultDiv = document.getElementById('calculationResult');
    const resultValue = document.getElementById('resultValue');
    const resultDescription = document.getElementById('resultDescription');
    
    if (!resultDiv || !resultValue) {
        console.error('Result display elements not found', {
            resultDiv: !!resultDiv,
            resultValue: !!resultValue
        });
        alert(`Your annual carbon footprint is ${tonnes.toFixed(2)} tCO₂e`);
        return;
    }
    
    // Ensure tonnes is a valid number
    const displayValue = isNaN(tonnes) || tonnes < 0 ? 0 : tonnes;
    
    console.log('Setting result value to:', displayValue.toFixed(2));
    resultValue.textContent = displayValue.toFixed(2);
    
    // Build description with comparison
    if (resultDescription) {
        let description = '';
        
        if (displayValue === 0) {
            description = 'Enter values in any category above to calculate your footprint. Empty fields default to 0.';
        } else {
            // Base description
            if (displayValue < 4) {
                description = 'Great! This is below the global average of ~4.8 tCO₂e per person per year.';
            } else if (displayValue < 8) {
                description = 'This is close to the global average. Consider ways to reduce further.';
            } else {
                description = 'This is above average. Explore our insights for reduction tips!';
            }
            
            // Add comparison if previous calculation exists
            if (previousCalculation && previousCalculation.co2e) {
                const previousValue = parseFloat(previousCalculation.co2e) || 0;
                const difference = displayValue - previousValue;
                const percentChange = previousValue > 0 ? ((difference / previousValue) * 100) : 0;
                
                if (Math.abs(difference) > 0.01) { // Only show if significant difference
                    if (difference < 0) {
                        description += ` 🎉 This is ${Math.abs(difference).toFixed(2)} tCO₂e less (${Math.abs(percentChange).toFixed(1)}% reduction) than your last calculation!`;
                    } else {
                        description += ` 📈 This is ${difference.toFixed(2)} tCO₂e more (${percentChange.toFixed(1)}% increase) than your last calculation.`;
                    }
                } else {
                    description += ' This matches your previous calculation.';
                }
            }
        }
        
        resultDescription.textContent = description;
        resultDescription.style.display = 'block';
    }
    
    // Force display styles
    resultDiv.style.display = 'block';
    resultDiv.style.visibility = 'visible';
    resultDiv.style.opacity = '1';
    
    console.log('Result div display style:', resultDiv.style.display);
    
    // Scroll to result smoothly
    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);
}

// Get Current Category
function getCurrentCategory() {
    const activeTab = document.querySelector('.calc-tab.active');
    return activeTab ? activeTab.getAttribute('data-category') : 'transport';
}

// Save Calculation
async function saveCalculation() {
    if (!appState.currentCalculation) {
        alert('No calculation to save. Please calculate your footprint first.');
        return;
    }

    const saveBtn = document.getElementById('saveCalculationBtn');
    const originalText = saveBtn ? saveBtn.textContent : 'Save to Dashboard';
    
    try {
        // Show loading state
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        // Get previous calculation for notes
        const previousCalculation = getPreviousCalculation();
        let notes = `Calculated footprint: ${appState.currentCalculation.co2e.toFixed(2)} tCO₂e/year`;
        
        if (previousCalculation && previousCalculation.co2e) {
            const previousValue = parseFloat(previousCalculation.co2e) || 0;
            const difference = appState.currentCalculation.co2e - previousValue;
            if (Math.abs(difference) > 0.01) {
                if (difference < 0) {
                    notes += ` (${Math.abs(difference).toFixed(2)} tCO₂e reduction from previous)`;
                } else {
                    notes += ` (${difference.toFixed(2)} tCO₂e increase from previous)`;
                }
            }
        }

        const logData = {
            category: appState.currentCalculation.category || 'mixed',
            co2e: appState.currentCalculation.co2e,
            value: appState.currentCalculation.co2e,
            notes: notes,
            timestamp: appState.currentCalculation.timestamp || new Date().toISOString(),
        };

        console.log('Saving calculation:', logData);
        const savedLog = await api.saveCarbonLog(logData);
        console.log('Calculation saved:', savedLog);
        
        // Update dashboard immediately
        updateDashboard();
        
        // Show success message
        if (saveBtn) {
            saveBtn.textContent = '✓ Saved!';
            saveBtn.style.background = 'var(--accent-primary)';
            saveBtn.style.color = 'white';
            
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
                saveBtn.style.background = '';
                saveBtn.style.color = '';
            }, 2000);
        }
        
        // Show notification with link to dashboard
        showNotification('Calculation saved to dashboard! Click here to view.', 'success', () => {
            scrollToSection('dashboard');
        });
        
    } catch (error) {
        console.error('Error saving calculation:', error);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
        alert('Error saving calculation. Please try again. Error: ' + (error.message || error));
    }
}

// Show Notification
function showNotification(message, type = 'info', onClick = null) {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--accent-primary)' : 'var(--accent-danger)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        cursor: ${onClick ? 'pointer' : 'default'};
    `;
    
    if (onClick) {
        notification.addEventListener('click', onClick);
        notification.style.cursor = 'pointer';
    }
    
    // Add animation style if not exists
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Dashboard Setup
function setupDashboard() {
    const exportBtn = document.getElementById('exportBtn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            handleExport();
        });
    }

    // Initialize charts
    initializeCharts();
}

// Initialize Charts
function initializeCharts() {
    // Trend Chart
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
        drawTrendChart(trendCtx);
    }

    // Category Chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        drawCategoryChart(categoryCtx);
    }
}

// Draw Trend Chart (simple canvas-based chart)
function drawTrendChart(canvas) {
    const ctx = canvas.getContext('2d');
    const logs = api.getCarbonLogs();
    
    if (logs.length === 0) {
        // Draw placeholder
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary');
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Simple line chart implementation
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Get last 12 months of data
    const months = 12;
    const data = generateMonthlyData(logs, months);

    // Draw axes
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw line
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
    ctx.lineWidth = 2;
    ctx.beginPath();

    const maxValue = Math.max(...data.map(d => d.co2e), 1);
    data.forEach((point, index) => {
        const x = padding + (index / (months - 1)) * chartWidth;
        const y = height - padding - (point.co2e / maxValue) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw points
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
    data.forEach((point, index) => {
        const x = padding + (index / (months - 1)) * chartWidth;
        const y = height - padding - (point.co2e / maxValue) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
}

// Draw Category Chart (simple donut chart)
function drawCategoryChart(canvas) {
    const ctx = canvas.getContext('2d');
    const logs = api.getCarbonLogs();
    
    if (logs.length === 0) {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary');
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Group by category
    const categoryData = {};
    logs.forEach(log => {
        const category = log.category || 'other';
        categoryData[category] = (categoryData[category] || 0) + log.co2e;
    });

    const categories = Object.keys(categoryData);
    const values = Object.values(categoryData);
    const total = values.reduce((a, b) => a + b, 0);

    if (total === 0) return;

    // Draw donut chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 3;
    const innerRadius = radius * 0.6;

    let currentAngle = -Math.PI / 2;
    const colors = getConfig().ui.chartColors;

    categories.forEach((category, index) => {
        const sliceAngle = (values[index] / total) * 2 * Math.PI;

        // Draw slice
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();

        currentAngle += sliceAngle;
    });
}

// Generate Monthly Data
function generateMonthlyData(logs, months) {
    const data = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLogs = logs.filter(log => {
            const logDate = new Date(log.timestamp || log.date);
            return logDate.getMonth() === month.getMonth() && 
                   logDate.getFullYear() === month.getFullYear();
        });
        
        const monthlyCo2e = monthLogs.reduce((sum, log) => sum + (log.co2e || 0), 0);
        data.push({
            month: month.toLocaleDateString('en-US', { month: 'short' }),
            co2e: monthlyCo2e || 0,
        });
    }
    
    return data;
}

// Update Dashboard
function updateDashboard() {
    console.log('Updating dashboard...');
    const logs = api.getCarbonLogs();
    console.log('Carbon logs:', logs);
    
    // Calculate total CO2e (all time or monthly - using all logs for now)
    const totalCo2e = logs.reduce((sum, log) => sum + (parseFloat(log.co2e) || 0), 0);
    
    // Calculate monthly CO2e
    const now = new Date();
    const thisMonthLogs = logs.filter(log => {
        if (!log.timestamp && !log.date) return false;
        const logDate = new Date(log.timestamp || log.date);
        return logDate.getMonth() === now.getMonth() && 
               logDate.getFullYear() === now.getFullYear();
    });
    
    const monthlyCo2e = thisMonthLogs.reduce((sum, log) => sum + (parseFloat(log.co2e) || 0), 0);
    console.log('Monthly CO2e:', monthlyCo2e);
    
    // Update KPI cards - use monthly or total
    const monthlyCo2El = document.getElementById('monthlyCo2');
    if (monthlyCo2El) {
        monthlyCo2El.textContent = monthlyCo2e > 0 ? monthlyCo2e.toFixed(2) : totalCo2e.toFixed(2);
    }

    // Calculate trees equivalent based on what we're displaying
    const displayCo2e = monthlyCo2e > 0 ? monthlyCo2e : totalCo2e;
    const treesEquivalent = Math.ceil(displayCo2e * getConfig().conversions.treesPerTonne);
    const treesEl = document.getElementById('treesEquivalent');
    if (treesEl) {
        treesEl.textContent = treesEquivalent;
    }

    // Calculate weekly change
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekLogs = logs.filter(log => {
        if (!log.timestamp && !log.date) return false;
        const logDate = new Date(log.timestamp || log.date);
        return logDate >= lastWeek && logDate < now;
    });
    const lastWeekCo2e = lastWeekLogs.reduce((sum, log) => sum + (parseFloat(log.co2e) || 0), 0);
    const weeklyChange = monthlyCo2e > 0 ? ((lastWeekCo2e / monthlyCo2e) * 100) : 0;
    const weeklyChangeEl = document.getElementById('weeklyChange');
    if (weeklyChangeEl) {
        weeklyChangeEl.textContent = `${weeklyChange >= 0 ? '+' : ''}${weeklyChange.toFixed(1)}%`;
        weeklyChangeEl.className = weeklyChange >= 0 ? 'kpi-change positive' : 'kpi-change negative';
    }

    // Update goal progress if there's a goal
    const goal = JSON.parse(localStorage.getItem('currentGoal') || 'null');
    if (goal) {
        const goalProgress = Math.min(100, (monthlyCo2e / (goal.percent / 100)) * 100);
        const goalProgressEl = document.getElementById('goalProgress');
        if (goalProgressEl) {
            goalProgressEl.textContent = `${goalProgress.toFixed(1)}%`;
        }
    }

    // Redraw charts
    initializeCharts();
    
    console.log('Dashboard updated successfully');
}

// Load Demo Data
function loadDemoData() {
    const demoLogs = [
        {
            id: 'demo-1',
            category: 'transport',
            co2e: 2.5,
            timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'demo-2',
            category: 'energy',
            co2e: 1.8,
            timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'demo-3',
            category: 'food',
            co2e: 1.2,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ];

    if (api.getCarbonLogs().length === 0) {
        localStorage.setItem('carbonLogs', JSON.stringify(demoLogs));
    }

    updateDashboard();
}

// Insights Setup
function setupInsights() {
    generateInsights();
}

// Generate Insights
function generateInsights() {
    const logs = api.getCarbonLogs();
    const insightsGrid = document.getElementById('insightsGrid');
    if (!insightsGrid) return;

    insightsGrid.innerHTML = '';

    const insights = [
        {
            icon: '🚗',
            title: 'Reduce Car Travel',
            text: 'Consider carpooling, public transport, or cycling for shorter trips. This could reduce your transport emissions by up to 30%.',
            type: 'warning',
        },
        {
            icon: '⚡',
            title: 'Switch to Renewable Energy',
            text: 'Consider switching to a renewable energy provider. Even a 50% renewable mix can significantly reduce your energy footprint.',
            type: 'info',
        },
        {
            icon: '🍽️',
            title: 'Eat Less Meat',
            text: 'Reducing meat consumption by even one meal per week can make a significant difference in your carbon footprint.',
            type: 'info',
        },
        {
            icon: '♻️',
            title: 'Improve Recycling',
            text: 'Increase your recycling rate to reduce waste emissions. Aim for 80%+ recycling to maximize impact.',
            type: 'warning',
        },
    ];

    insights.forEach(insight => {
        const insightCard = document.createElement('div');
        insightCard.className = `insight-card ${insight.type || ''}`;
        insightCard.innerHTML = `
            <div class="insight-icon">${insight.icon}</div>
            <h3 class="insight-title">${insight.title}</h3>
            <p class="insight-text">${insight.text}</p>
            <a href="#calculator" class="insight-action">Learn More →</a>
        `;
        insightsGrid.appendChild(insightCard);
    });
}

// Goals Setup
function setupGoals() {
    const setGoalBtn = document.getElementById('setGoalBtn');
    
    if (setGoalBtn) {
        setGoalBtn.addEventListener('click', () => {
            setGoal();
        });
    }

    loadChallenges();
}

// Set Goal
function setGoal() {
    const goalPercent = parseFloat(document.getElementById('goal-percent').value);
    const goalDeadline = document.getElementById('goal-deadline').value;

    if (!goalPercent || !goalDeadline) {
        alert('Please fill in all fields');
        return;
    }

    const goal = {
        id: 'goal-' + Date.now(),
        percent: goalPercent,
        deadline: goalDeadline,
        createdAt: new Date().toISOString(),
    };

    localStorage.setItem('currentGoal', JSON.stringify(goal));
    updateDashboard();
    loadChallenges();
    alert('Goal set successfully!');
}

// Load Challenges
function loadChallenges() {
    const challengesContainer = document.getElementById('challengesContainer');
    if (!challengesContainer) return;

    const goal = JSON.parse(localStorage.getItem('currentGoal') || 'null');
    
    if (!goal) {
        challengesContainer.innerHTML = '<p>Set a goal to start tracking challenges!</p>';
        return;
    }

    const progress = calculateGoalProgress(goal);
    
    const challengeHTML = `
        <div class="challenge-item">
            <div class="challenge-title">Reduce emissions by ${goal.percent}%</div>
            <div class="challenge-progress">
                <div class="challenge-progress-bar" style="width: ${progress}%"></div>
            </div>
            <div style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                ${progress.toFixed(1)}% complete
            </div>
        </div>
    `;
    
    challengesContainer.innerHTML = challengeHTML;
}

// Calculate Goal Progress
function calculateGoalProgress(goal) {
    // Simplified progress calculation
    const logs = api.getCarbonLogs();
    // This would compare current vs baseline emissions
    return Math.min(50, Math.random() * 100); // Placeholder
}

// Premium Setup
function setupPremium() {
    const subscribeBtn = document.getElementById('subscribeBtn');
    
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', () => {
            handleSubscribe();
        });
    }
}

// Handle Subscribe
async function handleSubscribe() {
    try {
        const config = getConfig();
        const session = await api.createCheckoutSession(config.stripe.priceId);
        
        if (config.app.demoMode) {
            // In demo mode, simulate redirect
            setTimeout(() => {
                alert('Demo: Subscription successful! You now have premium access.');
                updateUI();
            }, 2000);
        } else {
            // Redirect to Stripe Checkout
            window.location.href = session.url;
        }
    } catch (error) {
        console.error('Subscription error:', error);
        alert('Error initiating subscription. Please try again.');
    }
}

// Profile Setup
function setupProfile() {
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const manageSubscriptionBtn = document.getElementById('manageSubscriptionBtn');
    
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            saveProfile();
        });
    }

    if (manageSubscriptionBtn) {
        manageSubscriptionBtn.addEventListener('click', () => {
            manageSubscription();
        });
    }

    loadProfile();
}

// Load Profile
async function loadProfile() {
    try {
        const user = await api.getUserProfile();
        
        if (user) {
            document.getElementById('household-size').value = user.householdSize || 1;
            document.getElementById('location').value = user.location || '';
            document.getElementById('units').value = user.units || 'imperial';
            
            if (document.getElementById('currentPlan')) {
                document.getElementById('currentPlan').textContent = user.isPremium ? 'Premium' : 'Free';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Save Profile
async function saveProfile() {
    const profileData = {
        householdSize: parseInt(document.getElementById('household-size').value) || 1,
        location: document.getElementById('location').value,
        units: document.getElementById('units').value,
    };

    try {
        await api.updateUserProfile(profileData);
        alert('Profile updated successfully!');
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile. Please try again.');
    }
}

// Manage Subscription
function manageSubscription() {
    if (getConfig().app.demoMode) {
        alert('Demo: Redirect to Stripe Customer Portal');
    } else {
        window.location.href = api.getStripeCustomerPortalUrl();
    }
}

// Export Handler
async function handleExport() {
    if (!appState.isPremium && !getConfig().app.demoMode) {
        alert('Premium subscription required for export. Please upgrade to premium.');
        return;
    }

    try {
        const csv = await api.exportToCSV();
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `carbon-footprint-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('CSV exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting data. Please try again.');
    }
}

// Auth Setup
function setupAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const loginModalClose = document.getElementById('loginModalClose');
    const signupModalClose = document.getElementById('signupModalClose');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');

    // Open login modal
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('login');
        });
    }

    // Open signup modal
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('signup');
        });
    }

    // Close modals
    if (loginModalClose) {
        loginModalClose.addEventListener('click', () => {
            closeModal('login');
        });
    }

    if (signupModalClose) {
        signupModalClose.addEventListener('click', () => {
            closeModal('signup');
        });
    }

    // Close modal when clicking outside
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                closeModal('login');
            }
        });
    }

    if (signupModal) {
        signupModal.addEventListener('click', (e) => {
            if (e.target === signupModal) {
                closeModal('signup');
            }
        });
    }

    // Switch between login and signup
    if (switchToSignup) {
        switchToSignup.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal('login');
            setTimeout(() => openModal('signup'), 200);
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal('signup');
            setTimeout(() => openModal('login'), 200);
        });
    }

    // Handle form submissions
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await handleLogin(email, password);
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const name = document.getElementById('signupName').value;
            const password = document.getElementById('signupPassword').value;
            await handleSignup(email, password, name);
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (loginModal && loginModal.style.display !== 'none') {
                closeModal('login');
            }
            if (signupModal && signupModal.style.display !== 'none') {
                closeModal('signup');
            }
        }
    });

    // Check if user is logged in
    if (api.user) {
        updateAuthUI();
    }
}

// Open Modal
function openModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = modal.querySelector('.input-field');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
}

// Close Modal
function closeModal(type) {
    const modal = document.getElementById(`${type}Modal`);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Clear form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// Handle Login
async function handleLogin(email, password) {
    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const submitBtn = loginForm?.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Login';

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
        }

        const result = await api.login(email, password);
        appState.userData = result.user;
        appState.isPremium = result.user.isPremium || false;
        updateUI();
        updateAuthUI();
        
        closeModal('login');
        showNotification('Login successful! Welcome back!', 'success');
        
        // Load user's data
        updateDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please check your credentials and try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// Handle Signup
async function handleSignup(email, password, name) {
    if (!email || !name || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    const signupForm = document.getElementById('signupForm');
    const submitBtn = signupForm?.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Sign Up';

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';
        }

        const result = await api.signup(email, password, name);
        appState.userData = result.user;
        appState.isPremium = result.user.isPremium || false;
        updateUI();
        updateAuthUI();
        
        closeModal('signup');
        showNotification('Signup successful! Welcome to Carbon Tracker!', 'success');
        
        // Load user's data
        updateDashboard();
        
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Signup failed. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// Update Auth UI
function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');

    if (api.user) {
        // User is logged in
        if (loginBtn) {
            loginBtn.textContent = api.user.email || api.user.name || 'Account';
            loginBtn.style.display = 'inline-block';
        }
        if (signupBtn) {
            signupBtn.textContent = 'Logout';
            signupBtn.onclick = async (e) => {
                e.preventDefault();
                await handleLogout();
            };
            signupBtn.className = 'btn-secondary'; // Change to secondary button style
        }
    } else {
        // User is not logged in
        if (loginBtn) {
            loginBtn.textContent = 'Login';
            loginBtn.onclick = (e) => {
                e.preventDefault();
                openModal('login');
            };
        }
        if (signupBtn) {
            signupBtn.textContent = 'Sign Up';
            signupBtn.onclick = (e) => {
                e.preventDefault();
                openModal('signup');
            };
            signupBtn.className = 'btn-primary'; // Primary button style
        }
    }
}

// Handle Logout
async function handleLogout() {
    try {
        await api.logout();
        appState.userData = null;
        appState.isPremium = false;
        updateUI();
        updateAuthUI();
        showNotification('Logged out successfully', 'info');
        
        // Clear dashboard (or keep data, depending on your preference)
        // updateDashboard();
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error during logout', 'error');
    }
}

// Load User Data
async function loadUserData() {
    try {
        const user = await api.getUserProfile();
        if (user) {
            appState.userData = user;
            appState.isPremium = user.isPremium || false;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update UI
function updateUI() {
    // Update premium badges and gating
    const premiumElements = document.querySelectorAll('.premium-badge');
    premiumElements.forEach(el => {
        if (appState.isPremium || CONFIG.app.demoMode) {
            el.style.display = 'none';
        }
    });

    // Enable/disable premium features
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.disabled = !appState.isPremium && !getConfig().app.demoMode;
    }
}

// Listen for subscription updates
window.addEventListener('subscription-updated', (event) => {
    appState.isPremium = event.detail.isPremium || false;
    updateUI();
});

