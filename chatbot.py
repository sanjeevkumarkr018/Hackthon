"""
Carbon Footprint Chatbot - Backend API Module

This module provides a Flask-based REST API for the chatbot functionality.
It can be integrated with NLU services, databases, and external APIs.
"""

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
import json
from datetime import datetime
from typing import Dict, List, Optional
import google.generativeai as genai  # Optional: for Gemini API integration

# Get the directory where the script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Note: Static file routes are defined at the end after all API routes

# Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
USE_GEMINI = os.getenv('USE_GEMINI', 'false').lower() == 'true'
MOCK_MODE = os.getenv('MOCK_MODE', 'true').lower() == 'true'

if GEMINI_API_KEY and USE_GEMINI:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')

# Mock user data storage (in production, use a database)
users_db = {}
conversations_db = {}

# Intent patterns for rule-based NLU
INTENT_PATTERNS = {
    'calculate_emission': [
        'calculate', 'emission', 'footprint', 'carbon', 'tracking', 'measure'
    ],
    'suggest_reduction': [
        'reduce', 'lower', 'decrease', 'less', 'minimize', 'cut down'
    ],
    'explain_category': [
        'explain', 'what is', 'tell me about', 'how does', 'category', 'transport', 'energy', 'food', 'waste'
    ],
    'subscribe_premium': [
        'premium', 'subscribe', 'upgrade', 'paid', 'subscription'
    ],
    'export_report': [
        'export', 'report', 'download', 'pdf', 'csv', 'data'
    ],
    'connect_device': [
        'connect', 'device', 'integration', 'smart meter', 'app', 'sync'
    ],
    'set_goal': [
        'goal', 'target', 'reduce by', 'aim for', 'challenge'
    ],
    'view_dashboard': [
        'dashboard', 'summary', 'overview', 'stats', 'statistics'
    ],
}


def detect_intent(message: str) -> str:
    """Detect user intent from message using rule-based patterns."""
    message_lower = message.lower()
    
    # Score each intent
    intent_scores = {}
    for intent, patterns in INTENT_PATTERNS.items():
        score = sum(1 for pattern in patterns if pattern in message_lower)
        if score > 0:
            intent_scores[intent] = score
    
    # Return intent with highest score
    if intent_scores:
        return max(intent_scores, key=intent_scores.get)
    
    return 'general_inquiry'


def generate_response(intent: str, message: str, context: Dict, is_premium: bool = False) -> Dict:
    """Generate response based on detected intent."""
    
    responses = {
        'calculate_emission': {
            'text': "To calculate your carbon footprint, use the calculator on the website! I can help explain what each category means. What would you like to know more about?",
            'quick_replies': ['Transport', 'Energy', 'Food', 'Waste'],
            'tips': [{
                'title': 'Use the Calculator',
                'description': 'Navigate to the calculator section',
                'action': 'navigate:calculator'
            }]
        },
        'suggest_reduction': {
            'text': "Great question! Here are top tips to reduce your carbon footprint:\n\n1. 🚗 Reduce car travel by 20%\n2. ⚡ Switch to renewable energy\n3. 🍽️ Eat less meat\n4. ♻️ Improve recycling\n\nWould you like specific tips for any category?",
            'quick_replies': ['Transport Tips', 'Energy Tips', 'Food Tips'],
            'tips': [{
                'title': 'View Insights',
                'description': 'Check personalized insights',
                'action': 'navigate:insights'
            }]
        },
        'explain_category': {
            'text': "I can explain different emission categories:\n\n• **Transport**: Cars, flights, public transport\n• **Energy**: Electricity, heating, renewable sources\n• **Food**: Meat, dairy, local/organic choices\n• **Waste**: Recycling, composting, waste reduction\n\nWhich category interests you?",
            'quick_replies': ['Transport', 'Energy', 'Food', 'Waste'],
        },
        'subscribe_premium': {
            'text': "Premium features include:\n• Advanced analytics\n• PDF/CSV export\n• Device integrations\n• Personalized reduction plans\n• Priority support\n\nWould you like to learn more?",
            'quick_replies': ['View Premium', 'Subscribe'],
            'tips': [{
                'title': 'Premium Features',
                'description': 'Check out premium features',
                'action': 'navigate:premium'
            }]
        },
        'export_report': {
            'text': "Export features are available in premium. You can export your data as CSV or PDF for detailed analysis." + (
                " I can help you export your data now!" if is_premium 
                else " Would you like to upgrade to premium?"
            ),
            'quick_replies': ['Export CSV', 'Export PDF'] if is_premium else ['View Premium', 'Subscribe'],
            'tips': [{
                'title': 'Export Data',
                'description': 'Use export in dashboard',
                'action': 'navigate:dashboard'
            }] if is_premium else []
        },
        'connect_device': {
            'text': "Device integration is a premium feature. You can connect smart meters, mobility apps, and other devices to automatically track emissions." + (
                " I can help you set up device integration!" if is_premium
                else " Upgrade to premium to access this feature."
            ),
            'quick_replies': ['View Devices', 'Connect Device'] if is_premium else ['View Premium'],
        },
        'set_goal': {
            'text': "Setting goals is a great way to track progress! You can set reduction goals in the Goals section. I can help you create a personalized plan." + (
                " Let me create a custom plan for you!" if is_premium
                else " Premium users get personalized reduction plans."
            ),
            'quick_replies': ['Set Goal', 'View Goals'],
            'tips': [{
                'title': 'Set Your Goal',
                'description': 'Navigate to goals section',
                'action': 'navigate:goals'
            }]
        },
        'view_dashboard': {
            'text': "Your dashboard shows:\n• Monthly CO₂e emissions\n• Category breakdown\n• Trend charts\n• Progress toward goals\n\nNavigate to the dashboard to see your data!",
            'quick_replies': ['View Dashboard', 'Calculate Footprint'],
            'tips': [{
                'title': 'Go to Dashboard',
                'description': 'View your emissions data',
                'action': 'navigate:dashboard'
            }]
        },
        'general_inquiry': {
            'text': "I'm here to help with your carbon footprint questions! I can help you:\n\n• Calculate emissions\n• Get reduction tips\n• Understand your dashboard\n• Set goals\n\nWhat would you like to explore?",
            'quick_replies': ['Calculate Footprint', 'Reduction Tips', 'Dashboard', 'Help'],
        }
    }
    
    return responses.get(intent, responses['general_inquiry'])


def generate_gemini_response(message: str, conversation_history: List[Dict], context: Dict) -> str:
    """Generate response using Google Gemini API."""
    try:
        prompt = f"""You are a helpful carbon footprint assistant. Help users understand and reduce their environmental impact.

Context about the user:
- Premium user: {context.get('is_premium', False)}
- Current emissions: {context.get('monthly_co2e', 'Unknown')} tCO₂e/month

Conversation history:
{json.dumps(conversation_history[-5:], indent=2) if conversation_history else 'No history'}

User message: {message}

Provide a helpful, encouraging, and informative response. Keep it concise and actionable."""
        
        response = model.generate_content(prompt)
        return response.text if response.text else "I'm sorry, I couldn't generate a response."
    except Exception as e:
        print(f"Gemini API error: {e}")
        return None


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'carbon-footprint-chatbot',
        'mock_mode': MOCK_MODE,
        'gemini_enabled': USE_GEMINI and bool(GEMINI_API_KEY)
    })


@app.route('/chatbot/chat', methods=['POST'])
def chat():
    """Main chatbot endpoint."""
    try:
        data = request.json
        message = data.get('message', '').strip()
        user_id = data.get('userId')
        conversation_history = data.get('conversationHistory', [])
        user_context = data.get('context', {})
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Get user info
        is_premium = user_context.get('is_premium', False) or MOCK_MODE
        
        # Detect intent
        intent = detect_intent(message)
        
        # Generate response
        if USE_GEMINI and GEMINI_API_KEY and not MOCK_MODE:
            # Use Gemini API
            gemini_response = generate_gemini_response(message, conversation_history, {
                'is_premium': is_premium,
                'monthly_co2e': user_context.get('monthly_co2e', 0)
            })
            if gemini_response:
                return jsonify({
                    'text': gemini_response,
                    'intent': intent,
                    'quick_replies': ['More Help', 'Dashboard', 'Calculator'],
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        # Fallback to rule-based responses
        response = generate_response(intent, message, user_context, is_premium)
        response['intent'] = intent
        response['timestamp'] = datetime.utcnow().isoformat()
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        return jsonify({
            'error': 'An error occurred processing your message',
            'text': "I'm sorry, I encountered an error. Please try again."
        }), 500


@app.route('/chatbot/intents', methods=['GET'])
def list_intents():
    """List available chatbot intents."""
    return jsonify({
        'intents': list(INTENT_PATTERNS.keys()),
        'patterns': INTENT_PATTERNS
    })


@app.route('/chatbot/conversation', methods=['POST'])
def save_conversation():
    """Save conversation history (stub for database integration)."""
    try:
        data = request.json
        user_id = data.get('userId')
        conversation = data.get('conversation', [])
        
        if user_id:
            conversations_db[user_id] = conversation
        
        return jsonify({'success': True, 'message': 'Conversation saved'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chatbot/conversation/<user_id>', methods=['GET'])
def get_conversation(user_id):
    """Get conversation history for a user."""
    conversation = conversations_db.get(user_id, [])
    return jsonify({'conversation': conversation})


@app.route('/chatbot/premium/plan', methods=['POST'])
def generate_premium_plan():
    """Generate personalized reduction plan (Premium feature)."""
    try:
        data = request.json
        user_id = data.get('userId')
        user_data = data.get('userData', {})
        
        # Check premium status
        is_premium = user_data.get('is_premium', False)
        if not is_premium and not MOCK_MODE:
            return jsonify({'error': 'Premium subscription required'}), 403
        
        # Generate personalized plan based on user data
        current_emissions = user_data.get('monthly_co2e', 0)
        goal_reduction = user_data.get('goal_reduction_percent', 20)
        
        plan = {
            'target_reduction': goal_reduction,
            'current_monthly_emissions': current_emissions,
            'target_monthly_emissions': current_emissions * (1 - goal_reduction / 100),
            'timeline_months': 3,
            'steps': [
                {
                    'month': 1,
                    'focus': 'Transport',
                    'action': 'Reduce car travel by 10%',
                    'expected_reduction': current_emissions * 0.05
                },
                {
                    'month': 2,
                    'focus': 'Energy',
                    'action': 'Switch 30% to renewable energy',
                    'expected_reduction': current_emissions * 0.08
                },
                {
                    'month': 3,
                    'focus': 'Food',
                    'action': 'Reduce meat consumption by 2 meals/week',
                    'expected_reduction': current_emissions * 0.07
                }
            ]
        }
        
        return jsonify(plan)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Serve static files (must be last route)
@app.route('/<path:filename>')
def serve_static_files(filename):
    # Skip API routes
    if filename.startswith(('api/', 'chatbot/', 'health')):
        return jsonify({'error': 'Not found'}), 404
    
    # Serve JS, CSS, and other static files
    if filename.endswith(('.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico')):
        try:
            file_path = os.path.join(BASE_DIR, filename)
            if os.path.exists(file_path):
                return send_file(file_path)
        except Exception as e:
            print(f"Error serving file {filename}: {e}")
    
    return jsonify({'error': 'File not found'}), 404


# Serve index.html from root (must be last before static files)
@app.route('/')
def serve_index():
    index_path = os.path.join(BASE_DIR, 'index.html')
    if os.path.exists(index_path):
        return send_file(index_path)
    return jsonify({
        'message': 'Carbon Footprint Tracker API',
        'status': 'running',
        'endpoints': {
            'chatbot': '/chatbot/chat',
            'health': '/health'
        }
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    
    print(f"""
    Carbon Footprint Chatbot API
    ============================
    Running on: http://localhost:{port}
    Mock Mode: {MOCK_MODE}
    Gemini API: {'Enabled' if USE_GEMINI and GEMINI_API_KEY else 'Disabled'}
    
    Endpoints:
    - POST /chatbot/chat - Main chat endpoint
    - GET  /chatbot/intents - List available intents
    - POST /chatbot/conversation - Save conversation
    - GET  /chatbot/conversation/<user_id> - Get conversation
    - POST /chatbot/premium/plan - Generate premium plan
    - GET  / - Serve frontend (if files exist)
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)

