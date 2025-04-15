// API Configuration
// WARNING: Storing API keys in client-side code is a security risk in production
// For a production app, these should be moved to a server-side implementation
const FLIGHT_API_KEY = "ab63ee9e14msh4cda285ee867cb7p163a33jsn5065afae71ea";
const HOTEL_API_KEY = "ab63ee9e14msh4cda285ee867cb7p163a33jsn5065afae71ea";
const AVIATION_API_KEY = "21523f4e74d1afebf7db88e0628b414b";
const GEMINI_API_KEY = "AIzaSyCaYWS8tUa5y2-pIwvVcyUrlKjTyZGyIkM"; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// City to IATA Code Mapping
const cityToIATA = {
  mumbai: "BOM",
  delhi: "DEL",
  bangalore: "BLR",
  chennai: "MAA",
  kolkata: "CCU",
  hyderabad: "HYD",
  ahmedabad: "AMD",
  pune: "PNQ",
  goa: "GOI",
  london: "LHR",
  manchester: "MAN",
  birmingham: "BHX",
  newyork: "JFK",
  chicago: "ORD",
  losangeles: "LAX",
  miami: "MIA",
  sanfrancisco: "SFO",
  dubai: "DXB",
  singapore: "SIN",
  bangkok: "BKK",
  paris: "CDG",
  frankfurt: "FRA",
};

// Indian Hotels Database
const indianHotels = [
  { name: "The Grand Palace", chain: "Taj Hotels", location: "Mumbai" },
  { name: "Mumbai Executive Suites", chain: "Marriott", location: "Mumbai" },
  { name: "Royal Imperial", chain: "Oberoi Group", location: "Delhi" },
  { name: "Delhi Business Inn", chain: "Hilton", location: "Delhi" },
  { name: "Lotus Residency", chain: "ITC Hotels", location: "Bangalore" },
  { name: "Bangalore Corporate Stay", chain: "Hyatt", location: "Bangalore" },
  { name: "The Sapphire Hotel", chain: "The Leela", location: "Chennai" },
  { name: "Chennai Grand", chain: "Radisson", location: "Chennai" },
  { name: "Golden Crown Hotel", chain: "Marriott", location: "Kolkata" },
  { name: "Kolkata Elite", chain: "Taj Hotels", location: "Kolkata" },
];

// Tourist attractions for recommendations
const touristAttractions = {
  mumbai: ["Gateway of India", "Marine Drive", "Elephanta Caves", "Sanjay Gandhi National Park"],
  delhi: ["Red Fort", "India Gate", "Qutub Minar", "Humayun's Tomb"],
  bangalore: ["Lalbagh Botanical Garden", "Cubbon Park", "Bangalore Palace", "Iskon Temple"],
  chennai: ["Marina Beach", "Kapaleeshwarar Temple", "Fort St. George", "Government Museum"],
  goa: ["Calangute Beach", "Basilica of Bom Jesus", "Fort Aguada", "Dudhsagar Falls"]
};

// Helper function to get IATA code
function getIATACode(city) {
  const normalizedCity = city.toLowerCase().replace(/\s+/g, "");
  return cityToIATA[normalizedCity] || city.toUpperCase();
}

// DOM Elements
const chatContainer = document.getElementById("chatContainer");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const searchFormContainer = document.getElementById("searchFormContainer");
const searchForm = document.getElementById("searchForm");
const resultsDiv = document.getElementById("results");
const loadingDiv = document.getElementById("loading");

// Chat state
let conversationState = {
  collectingInfo: false,
  currentStep: null,
  collectedInfo: {},
  lastQuestion: null,
  context: []
};

// Initialize form elements
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date('2025-04-14').toISOString().split('T')[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    input.min = today;
  });
  loadChatHistory();
  if (searchForm) {
    searchForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const formData = {
        from: document.getElementById("from").value,
        to: document.getElementById("to").value,
        departureDate: document.getElementById("departureDate").value,
        returnDate: document.getElementById("returnDate").value,
        hotelLocation: document.getElementById("hotelLocation").value,
        checkInDate: document.getElementById("checkInDate")?.value
      };
      processFormSubmission(formData);
    });
  }
});

// Load chat history from localStorage
function loadChatHistory() {
  const savedHistory = localStorage.getItem("chatHistory");
  if (savedHistory) {
    conversationState.context = JSON.parse(savedHistory);
    conversationState.context.forEach(msg => {
      addMessageToChat(msg.content, msg.role, false);
    });
  }
  // Ensure welcome message is shown if history is empty
  if (conversationState.context.length === 0) {
    addMessageToChat("Hello! I'm your travel assistant. How can I help you plan your business trip today?", "bot");
  }
}

// Save chat history to localStorage
function saveChatHistory() {
  // Limit to last 20 messages to prevent excessive storage
  const limitedContext = conversationState.context.slice(-20);
  localStorage.setItem("chatHistory", JSON.stringify(limitedContext));
}

// Event Listeners
sendButton.addEventListener("click", handleUserMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleUserMessage();
  }
});

// Debounce to prevent duplicate messages
let isProcessing = false;
function handleUserMessage() {
  if (isProcessing) return;
  isProcessing = true;
  const message = userInput.value.trim();
  if (!message) {
    isProcessing = false;
    return;
  }
  addMessageToChat(message, "user");
  userInput.value = "";
  setTimeout(() => {
    processUserMessage(message);
    isProcessing = false;
  }, 500);
}

// Modified addMessageToChat to prevent duplicates and handle history
function addMessageToChat(message, sender, save = true) {
  // Prevent adding the same message twice
  const lastMessage = conversationState.context.length > 0 
    ? conversationState.context[conversationState.context.length - 1] : null;
  if (lastMessage && lastMessage.content === message && lastMessage.role === sender) {
    return;
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${sender}-message`;
  messageDiv.innerHTML = `<p>${message}</p>`;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  if (save) {
    conversationState.context.push({
      role: sender === "user" ? "user" : "assistant",
      content: message
    });
    saveChatHistory();
  }
}

async function processUserMessage(message) {
  const lowerMessage = message.toLowerCase();

  // Check for out-of-domain questions
  const outOfDomainKeywords = ["holi", "diwali", "festival", "party", "wedding", "celebration"];
  if (outOfDomainKeywords.some(keyword => lowerMessage.includes(keyword))) {
    addMessageToChat(
      "I'm sorry, I can only assist with business travel planning, such as flights, hotels, itineraries, or recommendations. How can I help you with your trip?",
      "bot"
    );
    return;
  }

  if (conversationState.lastQuestion === "hotel") {
    if (lowerMessage.includes("yes") || lowerMessage.includes("sure") || lowerMessage.includes("ok")) {
      searchHotels({ hotelLocation: conversationState.collectedInfo.to || conversationState.collectedInfo.hotelLocation || "Delhi" })
        .then(hotels => {
          displayHotelResults(hotels);
          conversationState.lastQuestion = null;
        })
        .catch(error => {
          addMessageToChat(`I'm sorry, I couldn't find any hotels. ${error.message}`, "bot");
          conversationState.lastQuestion = null;
        });
      return;
    }
    conversationState.lastQuestion = null;
  }

  if (conversationState.collectingInfo) {
    handleInfoCollection(message);
    return;
  }

  if (lowerMessage.includes("itinerary") || lowerMessage.includes("plan") || lowerMessage.includes("schedule")) {
    startItineraryPlanning();
  } else if (lowerMessage.includes("recommend") || lowerMessage.includes("tips") || lowerMessage.includes("suggestions")) {
    startTravelRecommendations();
  } else if (lowerMessage.includes("flight") || lowerMessage.includes("fly") || lowerMessage.includes("deal")) {
    startFlightSearch();
  } else if (lowerMessage.includes("hotel") || lowerMessage.includes("stay")) {
    startHotelSearch();
  } else if (lowerMessage.includes("attractions") || lowerMessage.includes("visit") || 
             lowerMessage.includes("see") || lowerMessage.includes("tourist")) {
    showAttractions(lowerMessage);
  } else if (lowerMessage.includes("help") || lowerMessage.includes("what can you do")) {
    showHelpMessage();
  } else if (lowerMessage.includes("no") || lowerMessage.includes("exit") || lowerMessage.includes("quit")) {
    addMessageToChat("Thank you! Visit again. Developed by Siddharth and Ashutosh", "bot");
    resetConversationState();
  } else if (lowerMessage.includes("clear history")) { // Added clear history command
    clearChatHistory();
  } else {
    addMessageToChat(
      "I'm not sure I understand. Try asking about flights, hotels, itineraries, recommendations, or attractions, or type 'help' for options.",
      "bot"
    );
  }
}

// Clear chat history
function clearChatHistory() {
  localStorage.removeItem("chatHistory");
  conversationState.context = [];
  chatContainer.innerHTML = "";
  addMessageToChat("Chat history cleared! How can I assist you now?", "bot");
}

async function queryGeminiAPI(message) {
  try {
    const systemMessage = {
      role: "system",
      content: "You are an AI travel assistant specializing in business travel. Provide concise, professional responses focused on flights, hotels, business-focused itineraries, and travel recommendations."
    };
    const context = [systemMessage, ...conversationState.context];
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: message
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

function startItineraryPlanning() {
  conversationState.collectingInfo = true;
  conversationState.currentStep = "destination";
  searchFormContainer.classList.remove("hidden");
  addMessageToChat(
    "Let's plan your business trip itinerary! Where are you traveling to? (You can also use the form below.)",
    "bot"
  );
}

function startTravelRecommendations() {
  conversationState.collectingInfo = true;
  conversationState.currentStep = "recommendLocation";
  searchFormContainer.classList.remove("hidden");
  addMessageToChat(
    "I'd be happy to provide travel recommendations! Which city would you like tips for? (You can also use the form below.)",
    "bot"
  );
}

function startFlightSearch() {
  conversationState.collectingInfo = true;
  conversationState.currentStep = "from";
  searchFormContainer.classList.remove("hidden");
  addMessageToChat(
    "Great! Let's find you the best flight deals. Where will you be flying from?",
    "bot"
  );
}

function startHotelSearch() {
  conversationState.collectingInfo = true;
  conversationState.currentStep = "location";
  searchFormContainer.classList.remove("hidden");
  addMessageToChat(
    "I'll help you find the perfect hotel. Which city would you like to stay in?",
    "bot"
  );
}

function showAttractions(message) {
  let foundCity = null;
  for (const city in touristAttractions) {
    if (message.toLowerCase().includes(city)) {
      foundCity = city;
      break;
    }
  }
  if (foundCity) {
    const attractions = touristAttractions[foundCity];
    let message = `Here are some top attractions in ${foundCity.charAt(0).toUpperCase() + foundCity.slice(1)}:\n\n`;
    message += "<div class='attractions-container'>";
    attractions.forEach((attraction, index) => {
      message += `
        <div class='attraction-card'>
          <div class='attraction-number'>#${index + 1}</div>
          <div class='attraction-name'>
            <span class='attraction-icon'>🏛️</span>
            <span class='name'>${attraction}</span>
          </div>
        </div>
      `;
    });
    message += "</div>";
    message += `
      <style>
        .attractions-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 15px;
        }
        .attraction-card {
          display: flex;
          align-items: center;
          background: #ffffff;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .attraction-number {
          background: #ff6f61;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 15px;
        }
        .attraction-name {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .name {
          font-weight: bold;
          color: #333;
        }
      </style>
    `;
    addMessageToChat(message, "bot");
  } else {
    addMessageToChat(
      "I can provide tourist attractions for cities like Mumbai, Delhi, Bangalore, Chennai, and Goa. Which city are you interested in?",
      "bot"
    );
  }
}

function handleInfoCollection(message) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date('2025-04-14');

  switch (conversationState.currentStep) {
    case "destination":
      // Validate destination is a city
      const normalizedInput = message.toLowerCase().replace(/\s+/g, "");
      if (!Object.keys(cityToIATA).some(city => city.includes(normalizedInput))) {
        addMessageToChat(
          "Please provide a valid city name (e.g., Mumbai, Delhi, London). Where are you traveling to?",
          "bot"
        );
        return;
      }
      conversationState.collectedInfo.destination = message;
      conversationState.currentStep = "people";
      addMessageToChat("How many people are traveling?", "bot");
      break;
    case "people":
      if (!isNaN(message) && parseInt(message) > 0) {
        conversationState.collectedInfo.people = parseInt(message);
        conversationState.currentStep = "date";
        addMessageToChat(
          "When are you planning to travel? Please enter the date in YYYY-MM-DD format (e.g., 2025-04-15)",
          "bot"
        );
      } else {
        addMessageToChat(
          "Please enter a valid number of people (e.g., 2)",
          "bot"
        );
      }
      break;
    case "date":
      if (!dateRegex.test(message)) {
        addMessageToChat(
          "Please enter the date in YYYY-MM-DD format (e.g., 2025-04-15)",
          "bot"
        );
        return;
      }
      const inputDate = new Date(message);
      if (inputDate < today) {
        addMessageToChat("Please enter a future date.", "bot");
        return;
      }
      conversationState.collectedInfo.date = message;
      if (conversationState.collectedInfo.from && conversationState.collectedInfo.to) {
        completeFlightSearch();
      } else {
        completeItineraryPlanning();
      }
      break;
    case "recommendLocation":
      conversationState.collectedInfo.recommendLocation = message;
      completeTravelRecommendations();
      break;
    case "from":
      conversationState.collectedInfo.from = message;
      conversationState.currentStep = "to";
      addMessageToChat("Where would you like to fly to?", "bot");
      break;
    case "to":
      conversationState.collectedInfo.to = message;
      conversationState.currentStep = "date";
      addMessageToChat(
        "When would you like to travel? Please enter the date in YYYY-MM-DD format",
        "bot"
      );
      break;
    case "location":
      conversationState.collectedInfo.hotelLocation = message;
      conversationState.currentStep = "checkInDate";
      addMessageToChat(
        "When would you like to check in? Please enter date in YYYY-MM-DD format",
        "bot"
      );
      break;
    case "checkInDate":
      if (!dateRegex.test(message)) {
        addMessageToChat(
          "Please enter the date in YYYY-MM-DD format (e.g., 2025-04-15)",
          "bot"
        );
        return;
      }
      const checkInDate = new Date(message);
      if (checkInDate < today) {
        addMessageToChat("Please enter a future date.", "bot");
        return;
      }
      conversationState.collectedInfo.checkInDate = message;
      completeHotelSearch();
      break;
  }
}

function processFormSubmission(formData) {
  showLoading();
  if (formData.from && formData.to && formData.departureDate) {
    searchFlights({
      from: formData.from,
      to: formData.to,
      date: formData.departureDate
    })
    .then((flights) => {
      hideLoading();
      displayFlightResults(flights);
      searchFormContainer.classList.add("hidden");
    })
    .catch((error) => {
      hideLoading();
      addMessageToChat(
        `I'm sorry, I couldn't find any flights. ${error.message}`,
        "bot"
      );
      searchFormContainer.classList.add("hidden");
    });
  }
  if (formData.hotelLocation && formData.checkInDate) {
    setTimeout(() => {
      searchHotels({
        hotelLocation: formData.hotelLocation,
        checkInDate: formData.checkInDate
      })
      .then((hotels) => {
        hideLoading();
        displayHotelResults(hotels);
        searchFormContainer.classList.add("hidden");
      })
      .catch((error) => {
        hideLoading();
        addMessageToChat(
          `I'm sorry, I couldn't find any hotels. ${error.message}`,
          "bot"
        );
        searchFormContainer.classList.add("hidden");
      });
    }, formData.from && formData.to ? 1000 : 0);
  }
  resetConversationState();
}

function completeItineraryPlanning() {
  addMessageToChat("Generating your business travel itinerary...", "bot");
  showLoading();
  planItinerary(conversationState.collectedInfo)
    .then(() => {
      hideLoading();
      resetConversationState();
      searchFormContainer.classList.add("hidden");
    })
    .catch((error) => {
      hideLoading();
      addMessageToChat(
        `I'm sorry, I couldn't generate the itinerary. ${error.message}`,
        "bot"
      );
      resetConversationState();
      searchFormContainer.classList.add("hidden");
    });
}

function completeTravelRecommendations() {
  addMessageToChat("Fetching travel recommendations...", "bot");
  showLoading();
  recommendTravel(conversationState.collectedInfo.recommendLocation)
    .then(() => {
      hideLoading();
      resetConversationState();
      searchFormContainer.classList.add("hidden");
    })
    .catch(() => {
      hideLoading();
      resetConversationState();
      searchFormContainer.classList.add("hidden");
    });
}

function completeFlightSearch() {
  addMessageToChat("Searching for the best flight deals...", "bot");
  showLoading();
  searchFlights(conversationState.collectedInfo)
    .then((flights) => {
      hideLoading();
      displayFlightResults(flights);
      resetConversationState();
      searchFormContainer.classList.add("hidden");
    })
    .catch((error) => {
      hideLoading();
      addMessageToChat(
        `I'm sorry, I couldn't find any flights. ${error.message}`,
        "bot"
      );
      resetConversationState();
      searchFormContainer.classList.add("hidden");
    });
}

function completeHotelSearch() {
  addMessageToChat("Searching for the best hotel deals...", "bot");
  showLoading();
  searchHotels(conversationState.collectedInfo)
    .then((hotels) => {
      hideLoading();
      displayHotelResults(hotels);
      resetConversationState();
      searchFormContainer.classList.add("hidden");
      if (hotels.length > 0) {
        const location = hotels[0].location.toLowerCase();
        if (touristAttractions[location]) {
          setTimeout(() => {
            addMessageToChat(`Would you like to see popular tourist attractions in ${hotels[0].location}?`, "bot");
          }, 1000);
        }
      }
    })
    .catch((error) => {
      hideLoading();
      addMessageToChat(
        `I'm sorry, I couldn't find any hotels. ${error.message}`,
        "bot"
      );
      resetConversationState();
      searchFormContainer.classList.add("hidden");
    });
}

function resetConversationState() {
  conversationState.collectingInfo = false;
  conversationState.currentStep = null;
  conversationState.collectedInfo = {};
  conversationState.lastQuestion = null;
}

function showHelpMessage() {
  addMessageToChat("I can help you with:", "bot");
  addMessageToChat(
    `<div class="help-container">
      <div class="help-section">
        <div class="help-icon">✈️</div>
        <div class="help-content">
          <div class="help-title">Finding Flight Deals</div>
          <div class="help-desc">Search for flights between cities with the best prices</div>
        </div>
      </div>
      <div class="help-section">
        <div class="help-icon">🏨</div>
        <div class="help-content">
          <div class="help-title">Hotel Bookings</div>
          <div class="help-desc">Find accommodation for your needs</div>
        </div>
      </div>
      <div class="help-section">
        <div class="help-icon">📋</div>
        <div class="help-content">
          <div class="help-title">Planning Itineraries</div>
          <div class="help-desc">Create a business-focused travel schedule</div>
        </div>
      </div>
      <div class="help-section">
        <div class="help-icon">🏛️</div>
        <div class="help-content">
          <div class="help-title">Tourist Attractions</div>
          <div class="help-desc">Discover places to visit</div>
        </div>
      </div>
      <div class="help-section">
        <div class="help-icon">💡</div>
        <div class="help-content">
          <div class="help-title">Travel Recommendations</div>
          <div class="help-desc">Get tips for business travel</div>
        </div>
      </div>
    </div>
    <style>
      .help-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 15px;
        margin-top: 10px;
      }
      .help-section {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      .help-icon {
        font-size: 24px;
        background: rgba(0,212,255,0.2);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .help-content {
        flex: 1;
      }
      .help-title {
        font-weight: bold;
        margin-bottom: 3px;
      }
      .help-desc {
        font-size: 0.9em;
        opacity: 0.8;
      }
    </style>`,
    "bot"
  );
}

// API Functions
async function searchFlights(data) {
  const fromCode = getIATACode(data.from);
  const toCode = getIATACode(data.to);
  const url = `https://api.aviationstack.com/v1/flights?access_key=${AVIATION_API_KEY}&dep_iata=${fromCode}&arr_iata=${toCode}&date=${data.date}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.info || "API Error");
    }
    if (!result.data || result.data.length === 0) {
      return simulateFlightData(fromCode, toCode, data.date);
    }
    const flights = result.data.map((flight) => ({
      airline: flight.airline.name,
      flightNumber: flight.flight.iata,
      departureTime: flight.departure.scheduled,
      arrivalTime: flight.arrival.scheduled,
      status: flight.flight_status,
      from: flight.departure.airport,
      to: flight.arrival.airport,
      terminal: flight.departure.terminal || "Not specified",
      gate: flight.departure.gate || "Not specified",
      date: data.date,
      price: generateRandomPrice(fromCode, toCode)
    }));
    return flights;
  } catch (error) {
    console.error("Flight search error:", error);
    throw new Error("Failed to fetch flight data");
  }
}

function simulateFlightData(fromCode, toCode, date) {
  const airlines = ["IndiGo", "Air India", "SpiceJet", "Vistara", "GoAir", "AirAsia India", "Emirates", "British Airways"];
  const numFlights = 5 + Math.floor(Math.random() * 5);
  const flightDate = new Date(date);
  const flights = [];
  for (let i = 0; i < numFlights; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const flightNumber = airline.substring(0, 2).toUpperCase() + Math.floor(Math.random() * 1000);
    const departureHour = 6 + Math.floor(Math.random() * 16);
    const departureMinute = Math.floor(Math.random() * 60);
    const departureDateObj = new Date(flightDate);
    departureDateObj.setHours(departureHour, departureMinute);
    const durationMinutes = 60 + Math.floor(Math.random() * 180);
    const arrivalDateObj = new Date(departureDateObj.getTime() + durationMinutes * 60000);
    flights.push({
      airline,
      flightNumber,
      departureTime: departureDateObj.toISOString(),
      arrivalTime: arrivalDateObj.toISOString(),
      status: "scheduled",
      from: fromCode,
      to: toCode,
      terminal: `T${1 + Math.floor(Math.random() * 3)}`,
      gate: `G${Math.floor(Math.random() * 30)}`,
      date,
      price: generateRandomPrice(fromCode, toCode)
    });
  }
  flights.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
  return flights;
}

function generateRandomPrice(from, to) {
  const isInternational = 
    (cityToIATA[from.toLowerCase()] && !cityToIATA[from.toLowerCase()].startsWith("B")) || 
    (cityToIATA[to.toLowerCase()] && !cityToIATA[to.toLowerCase()].startsWith("B"));
  const basePrice = isInternational ? 15000 : 5000;
  return basePrice + Math.floor(Math.random() * basePrice * 0.4);
}

async function searchHotels(data) {
  try {
    return simulateHotelData(data.hotelLocation);
  } catch (error) {
    console.error("Hotel search error:", error);
    throw new Error("Failed to fetch hotel data");
  }
}

function simulateHotelData(location) {
  const hotelChains = ["Taj Hotels", "Oberoi Group", "ITC Hotels", "The Leela", "Marriott", "Hyatt", "Radisson"];
  const amenities = ["Free WiFi", "Swimming Pool", "Restaurant", "Spa", "Fitness Center", "Room Service", "Airport Shuttle"];
  const lowerLocation = location.toLowerCase().replace(/\s+/g, "");
  let filteredHotels = indianHotels.filter(hotel => 
    hotel.location.toLowerCase() === lowerLocation
  );
  if (filteredHotels.length === 0) {
    const locationName = location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();
    filteredHotels = [
      {
        name: `${locationName} Grand Hotel`,
        chain: hotelChains[Math.floor(Math.random() * hotelChains.length)],
        location: locationName
      },
      {
        name: `${locationName} Luxury Suites`,
        chain: hotelChains[Math.floor(Math.random() * hotelChains.length)],
        location: locationName
      }
    ];
  }
  return filteredHotels.map(hotel => ({
    ...hotel,
    price: 3000 + Math.floor(Math.random() * 10000),
    rating: (3 + Math.random() * 2).toFixed(1),
    amenities: amenities.sort(() => 0.5 - Math.random()).slice(0, 3 + Math.floor(Math.random() * 4))
  }));
}

function displayFlightResults(flights) {
  if (!flights || flights.length === 0) {
    addMessageToChat("I couldn't find any flights matching your criteria.", "bot");
    return;
  }
  // Sort flights by price and take top 5
  const sortedFlights = flights.sort((a, b) => a.price - b.price).slice(0, 5);
  let resultsHTML = `
    <div class="results-title">🛫 Found ${flights.length} Flights (Showing Top 5)</div>
    <div class="flight-cards">
  `;
  sortedFlights.forEach((flight) => {
    const departureTime = new Date(flight.departureTime);
    const arrivalTime = new Date(flight.arrivalTime);
    const formatTime = (date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const durationMs = arrivalTime - departureTime;
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    resultsHTML += `
      <div class="flight-card">
        <div class="airline-info">
          <div class="airline">${flight.airline}</div>
          <div class="flight-number">${flight.flightNumber}</div>
        </div>
        <div class="flight-time">
          <div class="time-container">
            <div class="time">${formatTime(departureTime)}</div>
            <div class="airport">${flight.from}</div>
          </div>
          <div class="duration">
            <div class="duration-line"></div>
            <div class="duration-text">${durationHours}h ${durationMinutes}m</div>
          </div>
          <div class="time-container">
            <div class="time">${formatTime(arrivalTime)}</div>
            <div class="airport">${flight.to}</div>
          </div>
        </div>
        <div class="flight-details">
          <div class="detail"><span class="detail-label">Date:</span> ${flight.date}</div>
          <div class="detail"><span class="detail-label">Terminal:</span> ${flight.terminal}</div>
          <div class="detail"><span class="detail-label">Gate:</span> ${flight.gate}</div>
        </div>
        <div class="flight-price">
          <div class="price">₹${flight.price.toLocaleString()}</div>
          <button class="book-button">Book Now</button>
        </div>
      </div>
    `;
  });
  resultsHTML += `
    </div>
    <style>
      .results-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
        color: #00d4ff;
      }
      .flight-cards {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      .flight-card {
        display: flex;
        flex-direction: column;
        padding: 15px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }
      .airline-info {
        display: flex;
        justify-content: space-between;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        margin-bottom: 10px;
      }
      .airline {
        font-weight: bold;
        color: #fff;
      }
      .flight-number {
        color: #ddd;
      }
      .flight-time {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .time-container {
        text-align: center;
      }
      .time {
        font-size: 18px;
        font-weight: bold;
        color: #fff;
      }
      .airport {
        font-size: 14px;
        color: #ccc;
      }
      .duration {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 20px;
        position: relative;
      }
      .duration-line {
        width: 100%;
        height: 2px;
        background: #ddd;
        position: relative;
      }
      .duration-line:before, .duration-line:after {
        content: '';
        position: absolute;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ddd;
        top: -3px;
      }
      .duration-line:before {
        left: 0;
      }
      .duration-line:after {
        right: 0;
      }
      .duration-text {
        font-size: 12px;
        color: #ccc;
        margin-top: 5px;
      }
      .flight-details {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 10px;
        color: #ccc;
        font-size: 14px;
      }
      .detail {
        flex: 1;
        min-width: 100px;
      }
      .detail-label {
        font-weight: bold;
        color: #fff;
      }
      .flight-price {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
      }
      .price {
        font-size: 20px;
        font-weight: bold;
        color: #00d4ff;
      }
      .book-button {
        background: #ff6f61;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }
      .book-button:hover {
        background: #e55a50;
      }
    </style>
  `;
  addMessageToChat(resultsHTML, "bot");
}

function displayHotelResults(hotels) {
  if (!hotels || hotels.length === 0) {
    addMessageToChat("I couldn't find any hotels matching your criteria.", "bot");
    return;
  }
  let resultsHTML = `
    <div class="results-title">🏨 Found ${hotels.length} Hotels</div>
    <div class="hotel-cards">
  `;
  hotels.forEach((hotel) => {
    resultsHTML += `
      <div class="hotel-card">
        <div class="hotel-header">
          <div class="hotel-name">${hotel.name}</div>
          <div class="hotel-rating">⭐ ${hotel.rating}/5</div>
        </div>
        <div class="hotel-location">
          <span class="location-icon">📍</span> ${hotel.location}
        </div>
        <div class="hotel-chain">${hotel.chain}</div>
        <div class="hotel-amenities">
          ${hotel.amenities.map(amenity => `<span class="amenity-badge">${amenity}</span>`).join('')}
        </div>
        <div class="hotel-footer">
          <div class="hotel-price">₹${hotel.price}<span class="price-night">/night</span></div>
          <button class="book-button">Book Now</button>
        </div>
      </div>
    `;
  });
  resultsHTML += `
    </div>
    <style>
      .results-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
        color: #00d4ff;
      }
      .hotel-cards {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      .hotel-card {
        display: flex;
        flex-direction: column;
        padding: 15px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }
      .hotel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .hotel-name {
        font-size: 18px;
        font-weight: bold;
        color: #fff;
      }
      .hotel-rating {
        background: rgba(255, 255, 255, 0.2);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 14px;
        color: #fff;
      }
      .hotel-location {
        margin-bottom: 5px;
        color: #ccc;
      }
      .location-icon {
        color: #ff6f61;
      }
      .hotel-chain {
        color: #ddd;
        font-size: 14px;
        margin-bottom: 10px;
      }
      .hotel-amenities {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      .amenity-badge {
        background: rgba(0, 212, 255, 0.2);
        color: #00d4ff;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 12px;
      }
      .hotel-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
      }
      .hotel-price {
        font-size: 20px;
        font-weight: bold;
        color: #00d4ff;
      }
      .price-night {
        font-size: 14px;
        font-weight: normal;
        color: #ccc;
      }
      .book-button {
        background: #ff6f61;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }
      .book-button:hover {
        background: #e55a50;
      }
    </style>
  `;
  addMessageToChat(resultsHTML, "bot");
}

function showLoading() {
  loadingDiv.style.display = "flex";
}

function hideLoading() {
  loadingDiv.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  addMessageToChat("Hello! I'm your travel assistant. How can I help you plan your business trip today?", "bot");
});

// 🧭 Function to plan itinerary for a destination
async function planItinerary(data) {
  const { destination, people, date } = data;
  const prompt = `Create a 3-day business travel itinerary for ${people} traveler(s) visiting ${destination}, starting on ${date}. Focus on professional activities like client meetings, networking events, or conferences. Include one leisure activity per day (e.g., visiting a landmark or dining at a notable restaurant). Suggest hotels from reputable chains for business travelers. Format as:

**Day 1 - [Date]**
- [Time]: [Activity]
...

**Day 2 - [Date]**
- [Time]: [Activity]
...

**Day 3 - [Date]**
- [Time]: [Activity]
...`;
  showLoading();
  try {
    const response = await queryGeminiAPI(prompt);
    addMessageToChat(response, "bot");
    setTimeout(async () => {
      const hotels = await searchHotels({ hotelLocation: destination });
      addMessageToChat("Here are some hotel options for your stay:", "bot");
      displayHotelResults(hotels);
    }, 1000);
  } catch (error) {
    console.error("Itinerary error:", error);
    const hotels = indianHotels.filter(h => h && h.location && h.location.toLowerCase() === destination.toLowerCase()) || [
      { name: `${destination} Business Suites`, chain: "Marriott", location: destination }
    ];
    const startDate = new Date(date);
    let itinerary = "";
    const lowerDest = destination.toLowerCase();
    if (lowerDest === "delhi") {
      itinerary = `
**Day 1 - ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 08:00 AM: Arrive in Delhi, transfer to ${hotels[0].name}
- 12:00 PM: Lunch at Bukhara, ideal for business discussions
- 02:00 PM: Client meeting at Connaught Place
- 06:00 PM: Leisure: Evening walk at India Gate

**Day 2 - ${new Date(startDate.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Conference at Pragati Maidan
- 01:00 PM: Networking lunch at Indian Accent
- 03:00 PM: Meetings at hotel business center
- 07:00 PM: Leisure: Visit Qutub Minar

**Day 3 - ${new Date(startDate.getTime() + 2 * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Final client wrap-up
- 12:00 PM: Check-out from ${hotels[0].name}
- 02:00 PM: Leisure: Explore Red Fort
- 04:00 PM: Depart Delhi`;
    } else if (lowerDest === "mumbai") {
      itinerary = `
**Day 1 - ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 08:00 AM: Arrive in Mumbai, transfer to ${hotels[0].name}
- 12:00 PM: Lunch at The Table, great for business
- 02:00 PM: Client meeting in Bandra Kurla Complex
- 06:00 PM: Leisure: Stroll along Marine Drive

**Day 2 - ${new Date(startDate.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Industry seminar at Jio World Centre
- 01:00 PM: Networking lunch at Masala Library
- 03:00 PM: Follow-up meetings at hotel
- 07:00 PM: Leisure: Visit Gateway of India

**Day 3 - ${new Date(startDate.getTime() + 2 * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Client discussions
- 12:00 PM: Check-out from ${hotels[0].name}
- 02:00 PM: Leisure: Quick trip to Elephanta Caves
- 04:00 PM: Depart Mumbai`;
    } else if (lowerDest === "bangalore") {
      itinerary = `
**Day 1 - ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 08:00 AM: Arrive in Bangalore, transfer to ${hotels[0].name}
- 12:00 PM: Lunch at Karavalli, suited for business
- 02:00 PM: Client meeting in Electronic City
- 06:00 PM: Leisure: Relax at Cubbon Park

**Day 2 - ${new Date(startDate.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Tech conference at Bangalore International Exhibition Centre
- 01:00 PM: Networking lunch at The Fatty Bao
- 03:00 PM: Meetings at hotel
- 07:00 PM: Leisure: Visit Lalbagh Botanical Garden

**Day 3 - ${new Date(startDate.getTime() + 2 * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Final meetings
- 12:00 PM: Check-out from ${hotels[0].name}
- 02:00 PM: Leisure: Explore Bangalore Palace
- 04:00 PM: Depart Bangalore`;
    } else if (lowerDest === "london") {
      itinerary = `
**Day 1 - ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 08:00 AM: Arrive in London, transfer to ${hotels[0].name}
- 12:00 PM: Lunch at The Ivy, good for business
- 02:00 PM: Client meeting in Canary Wharf
- 06:00 PM: Leisure: Walk along the Thames

**Day 2 - ${new Date(startDate.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Conference at ExCeL London
- 01:00 PM: Networking lunch at Dishoom
- 03:00 PM: Meetings at hotel
- 07:00 PM: Leisure: Visit the British Museum

**Day 3 - ${new Date(startDate.getTime() + 2 * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Client wrap-up
- 12:00 PM: Check-out from ${hotels[0].name}
- 02:00 PM: Leisure: See Big Ben
- 04:00 PM: Depart London`;
    } else if (lowerDest === "newyork" || lowerDest === "new york") {
      itinerary = `
**Day 1 - ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 08:00 AM: Arrive in New York, transfer to ${hotels[0].name}
- 12:00 PM: Lunch at Le Bernardin, ideal for business
- 02:00 PM: Client meeting in Midtown Manhattan
- 06:00 PM: Leisure: Walk in Central Park

**Day 2 - ${new Date(startDate.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Conference at Javits Center
- 01:00 PM: Networking lunch at The Modern
- 03:00 PM: Meetings at hotel
- 07:00 PM: Leisure: Visit Times Square

**Day 3 - ${new Date(startDate.getTime() + 2 * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Final client discussions
- 12:00 PM: Check-out from ${hotels[0].name}
- 02:00 PM: Leisure: Explore the Metropolitan Museum
- 04:00 PM: Depart New York`;
    } else if (lowerDest === "singapore") {
      itinerary = `
**Day 1 - ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 08:00 AM: Arrive in Singapore, transfer to ${hotels[0].name}
- 12:00 PM: Lunch at Odette, perfect for business
- 02:00 PM: Client meeting in Marina Bay
- 06:00 PM: Leisure: Visit Gardens by the Bay

**Day 2 - ${new Date(startDate.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Conference at Marina Bay Sands
- 01:00 PM: Networking lunch at Jumbo Seafood
- 03:00 PM: Meetings at hotel
- 07:00 PM: Leisure: Explore Clarke Quay

**Day 3 - ${new Date(startDate.getTime() + 2 * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Client wrap-up
- 12:00 PM: Check-out from ${hotels[0].name}
- 02:00 PM: Leisure: Visit Merlion Park
- 04:00 PM: Depart Singapore`;
    } else {
      itinerary = `
**Day 1 - ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 08:00 AM: Arrive in ${destination}, transfer to ${hotels[0].name}
- 12:00 PM: Lunch at hotel restaurant
- 02:00 PM: Client meeting in business district
- 06:00 PM: Leisure: Evening networking dinner

**Day 2 - ${new Date(startDate.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Industry seminar
- 01:00 PM: Lunch at a business-friendly café
- 03:00 PM: Meetings at hotel
- 07:00 PM: Leisure: Visit a local landmark

**Day 3 - ${new Date(startDate.getTime() + 2 * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**
- 09:00 AM: Final client discussions
- 12:00 PM: Check-out from ${hotels[0].name}
- 02:00 PM: Leisure: Explore a cultural site
- 04:00 PM: Depart ${destination}`;
    }
    addMessageToChat(itinerary, "bot");
    setTimeout(async () => {
      const hotels = await searchHotels({ hotelLocation: destination });
      addMessageToChat("Here are some hotel options for your stay:", "bot");
      displayHotelResults(hotels);
    }, 1000);
  }
}

// 🌍 Function to recommend travel for a destination
async function recommendTravel(location) {
  const prompt = `Provide business travel recommendations for ${location}. Include:
- Best time to visit for business events or pleasant weather
- Professional experiences (e.g., conferences, networking venues)
- Dining options suitable for business meetings
- Practical tips for business travelers (e.g., transport, attire)
Format as a concise list with bullet points.`;
  showLoading();
  try {
    const response = await queryGeminiAPI(prompt);
    addMessageToChat(response, "bot");
  } catch (error) {
    console.error("Recommendation error:", error);
    let recommendation = "";
    const lowerLoc = location.toLowerCase();
    if (lowerLoc === "delhi") {
      recommendation = `
Business Travel Recommendations for Delhi:
- **Best Time to Visit**: October to March for pleasant weather and trade shows like India International Trade Fair.
- **Professional Experiences**: Network in Connaught Place or attend conferences at Pragati Maidan.
- **Dining Options**: Bukhara for upscale client dinners; Indian Accent for modern Indian cuisine.
- **Practical Tips**: Use Delhi Metro for efficiency; business casual attire, light jacket in winter.`;
    } else if (lowerLoc === "mumbai") {
      recommendation = `
Business Travel Recommendations for Mumbai:
- **Best Time to Visit**: November to February for cooler weather and events like Nasscom India Leadership Forum.
- **Professional Experiences**: Network in Bandra Kurla Complex or attend seminars at Jio World Centre.
- **Dining Options**: The Table for business lunches; Masala Library for client dinners.
- **Practical Tips**: Use local trains or taxis; business casual attire, avoid monsoon season travel.`;
    } else if (lowerLoc === "bangalore") {
      recommendation = `
Business Travel Recommendations for Bangalore:
- **Best Time to Visit**: September to February for mild weather and tech events like Bangalore Tech Summit.
- **Professional Experiences**: Network in Electronic City or attend conferences at Bangalore International Exhibition Centre.
- **Dining Options**: Karavalli for business lunches; The Fatty Bao for client dinners.
- **Practical Tips**: Use cabs or metro; business casual attire, carry an umbrella for occasional rain.`;
    } else if (lowerLoc === "london") {
      recommendation = `
Business Travel Recommendations for London:
- **Best Time to Visit**: Spring (March-May) or autumn (September-November) for events like London Tech Week.
- **Professional Experiences**: Network in Canary Wharf or attend conferences at ExCeL London.
- **Dining Options**: The Ivy for business lunches; Dishoom for client dinners.
- **Practical Tips**: Use the Tube or black cabs; formal business attire, carry an umbrella.`;
    } else if (lowerLoc === "newyork" || lowerLoc === "new york") {
      recommendation = `
Business Travel Recommendations for New York:
- **Best Time to Visit**: April to June or September to November for events like Advertising Week.
- **Professional Experiences**: Network in Midtown Manhattan or attend conferences at Javits Center.
- **Dining Options**: Le Bernardin for upscale client dinners; The Modern for business lunches.
- **Practical Tips**: Use subways or yellow cabs; business formal attire, expect fast-paced meetings.`;
    } else if (lowerLoc === "singapore") {
      recommendation = `
Business Travel Recommendations for Singapore:
- **Best Time to Visit**: February to April for events like Singapore Airshow, pleasant weather.
- **Professional Experiences**: Network in Marina Bay or attend conferences at Marina Bay Sands.
- **Dining Options**: Odette for client dinners; Jumbo Seafood for business lunches.
- **Practical Tips**: Use MRT or taxis; business formal attire, high humidity so lightweight suits.`;
    } else {
      recommendation = `
Business Travel Recommendations for ${location}:
- **Best Time to Visit**: Spring or fall for mild weather, ideal for business events.
- **Professional Experiences**: Explore local business districts for networking or attend industry meetups.
- **Dining Options**: Opt for upscale restaurants in the city center, suitable for client meetings.
- **Practical Tips**: Use taxis or public transport for convenience; business casual attire is recommended.`;
    }
    addMessageToChat(recommendation, "bot");
  }
}