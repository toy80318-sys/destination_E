# Destination: Earth - Blueprint

## Overview

This application is a space-themed web game called "Destination: Earth". The player navigates a vast galaxy, taking on the role of a spaceship captain. The primary goal is to earn enough credits to save Earth, which is under a blockade. Gameplay involves exploring star systems, trading commodities between different planets, completing quests, battling pirates, customizing ships, and managing a crew.

## Implemented Design, Style, and Features

### Core Gameplay
*   **Galaxy Map:** An interactive, dynamically generated map for players to navigate between star systems and planets.
*   **Hub Interface:** A central UI for accessing all game functions, including the map, ship status, crew management, and missions.
*   **Economy & Trade:**
    *   A system of unique commodities and resources available on different planets.
    *   Players can buy low and sell high to earn credits.
    *   Planet auctions allow players to purchase planetary territory for passive income (taxes).
*   **Combat System:**
    *   Turn-based or real-time combat encounters with pirates and other enemies.
    *   Ship performance in combat is affected by equipped parts and crew members.
*   **Ship Customization:**
    *   A variety of ship models are available, each with different strengths and weaknesses (e.g., cargo space, combat ability).
    *   Players can equip different parts (weapons, armor, engines, shields) to enhance their ships. Set bonuses are available for equipping parts from the same set (e.g., Yi Sun-sin set, Tesla set).
*   **Crew & Heroes:**
    *   Players can recruit crew members and unique heroes who provide passive bonuses and improve ship performance.
*   **Quests & Missions:**
    *   A quest system provides players with specific tasks (e.g., delivery, combat, exploration) for rewards.
*   **Narrative:**
    *   A storyline guided by the character "Baekgu," who provides tips, story hints, and objectives.

### Visual & Audio Design
*   **Aesthetics:** A retro-futuristic space opera theme.
*   **UI:** A clean, organized user interface for managing complex game information.
*   **Graphics:** 2D sprites for ships, planets, and characters. Backgrounds depict various space scenes.
*   **Audio:** Background music that changes based on location (e.g., hub, combat) and sound effects for UI interactions, combat, and other events.

## Current Request: Deploy the Game for External Sharing

### Plan
1.  **Goal:** Deploy the game to a public URL so it can be shared via a link.
2.  **Action:** Utilize the integrated Firebase Hosting deployment functionality.
3.  **Configuration:**
    *   The application is identified as a static client-side application.
    *   The deployment source is the project's root directory (`.`), which contains `index.html` and all related assets.
4.  **Outcome:** A public URL will be generated and provided to the user upon successful deployment.
