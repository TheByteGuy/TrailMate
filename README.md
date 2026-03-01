# TrailMate 🚶‍♀️🎯

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)  
[![React Native](https://img.shields.io/badge/React_Native-0.72-blue.svg)](https://reactnative.dev/)  
[![Node.js](https://img.shields.io/badge/Node.js-24.13.0-green.svg)](https://nodejs.org/)  

**TrailMate** is a student-only walking companion that combines **peer support, accessibility-first navigation, and community wellness** to make campus walks safer, more engaging, and inclusive.  

---

## Inspiration 💡

Campus safety often focuses on emergencies, but everyday walks matter too. Late-night study sessions, quick trips between dorms, and routine walks home can feel isolating or uncertain. Existing tools often miss **accessibility and community engagement**.  

TrailMate integrates **safety, accessibility, and social connection** into one platform, helping students feel supported **before situations escalate**.

---

## Features ✨

- **Peer-Based Walks:** Connect with verified walk partners in real time; filter by dorm, distance, or accessibility needs.  
- **Safety Check-Ins:** Solo walk? The Safety Check-In Timer alerts a chosen contact if you don’t confirm arrival.  
- **Purposeful Walking:** Add meaningful stops like study breaks, dorm visits, or campus events (“side quests”).  
- **Gamification & Community:** Leaderboards, badges, walk tracking, and relay-style team challenges.  
- **Accessibility-First:** Wheelchair-accessible routes, obstacle-aware paths, high-contrast UI, voice guidance, and hands-free AR navigation.  

---

## How We Built It 🛠️

- **Frontend:** HTML, CSS, and JavaScript for a responsive and accessible web interface.  
- **Backend & Database:** Supabase for user data management and authentication, with Node.js handling server-side logic.  
- **AI Integration:** Large language models like **Gemini** for natural language features, **Eleven Labs** for voice synthesis, and **Snowflake AI** for advanced analytics.  
- **Maps & Routing:** **Mapbox** to display real campus paths, accessibility labels, and live walk tracking.  
- **Authentication:** University email verification ensures student-only access.  
- **Modular Design:** Structured for easy expansion to other campuses.  

---

## Challenges ⚡

- Accurate **accessibility mapping** with limited real-time data.  
- Balancing ambitious features with **hackathon constraints**.  
- Maintaining **user privacy** while implementing peer and safety features.  

---

## Accomplishments 🏆

- Fully functional prototype with **buddy matching, live walk feed, safety timers, leaderboards, and AR routing**.  
- Accessibility designed as a **core principle**, not an add-on.  
- Scalable design allows easy **campus expansion**.  

---

## What We Learned 📚

- Safety solutions must be **proactive**, not reactive.  
- Thoughtful **scoping** is crucial for rapid development.  
- How to NOT SET UP an api endpoint 😭.  
- Gained hands-on experience with **frontend structuring, database integration, routing logic, and scalable architecture**.  

---

## Next Steps 🚀

- Expand TrailMate to **additional campuses** using modular mapping integration.  
- Integrate with **official campus safety systems**.  
- Improve **real-time obstacle reporting** and **AR navigation**.  
- Add more **community features** like team challenges and campus event partnerships.  

---

## Quick Start ⚙️

1. Clone the repository:  
   ```bash
   git clone https://github.com/yourusername/TrailMate.git
   cd TrailMate
2.  To start up an instance of website:
    ```bash 
    npm install
    npm run dev
3. In another powershell terminal to run snowflake ai:
    ```bash
    node public/snowflake.js